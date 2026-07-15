import { authApi, type AuthApi } from "../../services/api/auth-api";
import { usersApi, type UsersApi } from "../../services/api/users-api";
import { fail, ok, type Result } from "../../services/result";
import type {
  AuthAccount,
  AuthCompletionMode,
  AuthEffects,
  AuthFlowOutcome,
  AuthProfile,
  AuthStateSnapshot,
  AuthUser,
  VerificationRequiredOutcome
} from "../../types/auth";
import { normalizeAuthError } from "./auth-errors";
import {
  imageService,
  type ImageService
} from "../publish/image-service";
import {
  isLegacyAvatarDataUrl,
  isSafeAvatarMetadataUrl,
  isUnsafeAvatarMetadataValue
} from "../../utils/avatar";
import {
  createAuthSessionCoordinator,
  ensureRecoverySession as restoreRecoverySession,
  isPasswordRecoveryUrl,
  recoveryParams,
  urlAfterPasswordReset,
  type RecoverySessionOptions,
  type RecoverySessionState
} from "./auth-session";

export interface LegacyAccountInput {
  name?: string;
  email?: string;
  role?: string;
  provider?: string;
  userId?: string;
  subtitle?: string;
  avatarUrl?: string;
}

export interface CompleteSupabaseAuthInput {
  user: AuthUser;
  returnTo?: string;
  displayName?: string;
  adminEmail: string;
  mode?: AuthCompletionMode;
}

export interface SaveAvatarInput {
  userId: string;
  image: string;
}

export interface LegacyAvatarMigrationInput {
  userId: string;
  metadataAvatarUrl?: unknown;
  profileAvatarUrl?: unknown;
}

export interface AvatarSaveOutcome {
  avatarUrl: string;
  requiresReauthentication: true;
}

export interface DisplayNameSaveOutcome {
  userId: string;
  user: AuthUser;
}

export interface AvatarMigrationOutcome {
  migrated: boolean;
  avatarUrl: string;
  requiresReauthentication: boolean;
}

type AvatarImageService = Pick<ImageService, "uploadAvatar">;

export interface AuthService {
  normalizeEmail(value: unknown): string;
  isEmailVerified(user: AuthUser | null | undefined): boolean;
  isPasswordRecoveryUrl(href: string): boolean;
  recoveryParams(href: string): URLSearchParams;
  createAuthState(
    account: string,
    savedAccount: LegacyAccountInput
  ): Result<AuthStateSnapshot>;
  ensureProfile(
    user: AuthUser,
    displayName: string,
    adminEmail: string
  ): Promise<Result<AuthProfile>>;
  ensureRecoverySession(
    options: RecoverySessionOptions
  ): Promise<Result<RecoverySessionState>>;
  completeSupabaseAuth(
    input: CompleteSupabaseAuthInput,
    effects: AuthEffects
  ): Promise<Result<AuthFlowOutcome>>;
  signIn(
    input: {
      email: string;
      password: string;
      returnTo: string;
      adminEmail: string;
    },
    effects: AuthEffects
  ): Promise<Result<AuthFlowOutcome>>;
  signUp(
    input: {
      email: string;
      password: string;
      displayName: string;
      emailRedirectTo: string;
      returnTo: string;
      adminEmail: string;
    },
    effects: AuthEffects
  ): Promise<Result<AuthFlowOutcome>>;
  sendPasswordReset(input: {
    email: string;
    redirectTo: string;
  }): Promise<Result<null>>;
  updateDisplayName(
    requestedUserId: string,
    displayName: string
  ): Promise<Result<DisplayNameSaveOutcome>>;
  saveAvatar(input: SaveAvatarInput): Promise<Result<AvatarSaveOutcome>>;
  needsAvatarMigration(input: LegacyAvatarMigrationInput): boolean;
  migrateLegacyAvatar(
    input: LegacyAvatarMigrationInput
  ): Promise<Result<AvatarMigrationOutcome>>;
  resetPassword(
    input: RecoverySessionOptions & { password: string },
    effects: AuthEffects
  ): Promise<Result<null>>;
  signOut(effects: AuthEffects): Promise<Result<null>>;
  syncSession(
    input: RecoverySessionOptions & { adminEmail: string },
    effects: AuthEffects
  ): Promise<Result<{ authenticated: boolean; recovery: boolean }>>;
  bindAuthListener(input: {
    effects: AuthEffects;
    adminEmail: string;
    getHref(): string;
    getCurrentHash(): string;
  }): Result<{ bound: boolean }>;
  diagnostics(): {
    listenerBindings: number;
    explicitOperations: number;
    activeUserId: string;
    cachedProfiles: number;
  };
}

export function normalizeAuthEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function isSupabaseEmailVerified(
  user: AuthUser | null | undefined
): boolean {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function metadataString(user: AuthUser, key: string): string {
  const value = user.user_metadata?.[key];
  return typeof value === "string" ? value : "";
}

function serviceFailure<T>(cause: unknown): Result<T> {
  const error = normalizeAuthError(cause);
  return fail(error.code, error.message);
}

export function createAuthService(
  api: AuthApi = authApi,
  profileApi: UsersApi = usersApi,
  avatarImages: AvatarImageService = imageService
): AuthService {
  const sessions = createAuthSessionCoordinator(api);
  const profileCache = new Map<string, AuthProfile>();
  const profileInFlight = new Map<string, Promise<AuthProfile>>();
  const completionInFlight = new Map<
    string,
    Promise<Result<AuthFlowOutcome>>
  >();
  const completionModes = new Map<string, AuthCompletionMode>();
  const interactiveCompletionInFlight = new Map<
    string,
    Promise<Result<AuthFlowOutcome>>
  >();
  const completedOutcomes = new Map<string, AuthFlowOutcome>();
  const avatarMigrationInFlight = new Map<
    string,
    Promise<Result<AvatarMigrationOutcome>>
  >();
  const avatarSaveInFlight = new Map<
    string,
    {
      image: string;
      promise: Promise<Result<AvatarSaveOutcome>>;
    }
  >();
  const avatarSaveTokens = new Map<string, number>();
  const displayNameSaveTokens = new Map<string, number>();
  let nextAvatarSaveToken = 0;
  let nextDisplayNameSaveToken = 0;

  const resetAuthCycle = (userId?: string) => {
    if (userId) {
      profileCache.delete(userId);
      profileInFlight.delete(userId);
      completedOutcomes.delete(userId);
      avatarMigrationInFlight.delete(userId);
      avatarSaveInFlight.delete(userId);
      avatarSaveTokens.delete(userId);
      displayNameSaveTokens.delete(userId);
      return;
    }
    profileCache.clear();
    profileInFlight.clear();
    completedOutcomes.clear();
    avatarMigrationInFlight.clear();
    avatarSaveInFlight.clear();
    avatarSaveTokens.clear();
    displayNameSaveTokens.clear();
  };

  const ensureProfile = async (
    user: AuthUser,
    displayName: string,
    adminEmail: string
  ): Promise<Result<AuthProfile>> => {
    if (!user?.id) return fail("AUTH_USER_MISSING", "无法读取登录用户。");
    const cached = profileCache.get(user.id);
    if (cached) return ok(cached);
    const inFlight = profileInFlight.get(user.id);
    if (inFlight) return ok(await inFlight);

    const email = normalizeAuthEmail(user.email);
    const fallbackName =
      displayName ||
      metadataString(user, "display_name") ||
      metadataString(user, "name") ||
      email.split("@")[0] ||
      "Saminest 用户";
    const fallback: AuthProfile = {
      id: user.id,
      email,
      display_name: fallbackName,
      role: email === normalizeAuthEmail(adminEmail) ? "admin" : "user"
    };

    const pending = (async () => {
      try {
        const result = await profileApi.upsertProfile(fallback);
        if (result.success) profileCache.set(user.id, result.data);
        return result.success ? result.data : fallback;
      } catch {
        return fallback;
      } finally {
        profileInFlight.delete(user.id);
      }
    })();
    profileInFlight.set(user.id, pending);
    return ok(await pending);
  };

  const createAuthState = (
    account: string,
    savedAccount: LegacyAccountInput
  ): Result<AuthStateSnapshot> => {
    const normalizedAccount = String(account || "");
    if (!normalizedAccount) {
      return fail("AUTH_ACCOUNT_MISSING", "无法读取登录账号。");
    }
    const userName =
      savedAccount?.name ||
      `用户${normalizedAccount.slice(-4)}` ||
      "Saminest 用户";
    const role =
      savedAccount?.role ||
      (normalizedAccount.toLowerCase().includes("admin") ? "admin" : "user");
    return ok({
      session: {
        loggedIn: true,
        account: normalizedAccount,
        email: savedAccount?.email || normalizedAccount,
        role,
        provider: savedAccount?.provider || "local",
        userId: savedAccount?.userId || ""
      },
      user: {
        name: userName,
        subtitle: savedAccount?.subtitle || "Saminest",
        avatar: (userName || normalizedAccount || "D").slice(0, 1).toUpperCase(),
        avatarUrl: savedAccount?.avatarUrl || ""
      }
    });
  };

  const completeSupabaseAuth = async (
    input: CompleteSupabaseAuthInput,
    effects: AuthEffects
  ): Promise<Result<AuthFlowOutcome>> => {
    const user = input.user;
    if (!user?.id) return fail("AUTH_USER_MISSING", "无法读取登录用户。");
    const mode = input.mode || "interactive";

    if (mode === "interactive") {
      const promotion = interactiveCompletionInFlight.get(user.id);
      if (promotion) return promotion;
    }

    const current = completionInFlight.get(user.id);
    if (current) {
      if (mode !== "interactive" || completionModes.get(user.id) === mode) {
        return current;
      }
      const promotion = safely(async () => {
        const restored = await current;
        if (!restored.success || restored.data.status !== "authenticated") {
          return restored;
        }
        resetAuthCycle(user.id);
        const outcome = { ...restored.data, applied: true };
        await effects.onAuthenticated(
          outcome,
          input.returnTo || "#home",
          "interactive"
        );
        sessions.markAuthenticated(user.id);
        completedOutcomes.set(user.id, outcome);
        return ok(outcome);
      }).finally(() => interactiveCompletionInFlight.delete(user.id));
      interactiveCompletionInFlight.set(user.id, promotion);
      return promotion;
    }

    if (
      mode !== "interactive" &&
      sessions.isActiveUser(user.id)
    ) {
      const completed = completedOutcomes.get(user.id);
      if (completed?.status === "authenticated") {
        return ok({ ...completed, applied: false });
      }
    }

    if (mode === "interactive") resetAuthCycle(user.id);

    const pending = (async (): Promise<Result<AuthFlowOutcome>> => {
      try {
        const returnTo = input.returnTo || "#home";
        if (!isSupabaseEmailVerified(user)) {
          sessions.expectSignedOut();
          await api.signOut();
          const outcome: VerificationRequiredOutcome = {
            status: "verification-required",
            reason: "email-unverified",
            returnTo
          };
          await effects.onVerificationRequired(outcome);
          sessions.markSignedOut();
          resetAuthCycle(user.id);
          return ok(outcome);
        }

        const profileResult = await ensureProfile(
          user,
          input.displayName || "",
          input.adminEmail
        );
        if (!profileResult.success) return profileResult;
        const profile = profileResult.data;
        const email = normalizeAuthEmail(user.email);
        const userName =
          profile.display_name ||
          input.displayName ||
          metadataString(user, "display_name") ||
          metadataString(user, "name") ||
          (email ? email.split("@")[0] : "Saminest 用户");
        const outcome: AuthFlowOutcome = {
          status: "authenticated",
          account: email || user.id,
          savedAccount: {
            name: userName,
            email,
            role:
              profile.role ||
              (email === normalizeAuthEmail(input.adminEmail)
                ? "admin"
                : "user"),
            provider: "supabase",
            userId: user.id,
            avatarUrl:
              String(profile.avatar_url || "") ||
              metadataString(user, "avatar_url")
          },
          user,
          applied: true
        };
        await effects.onAuthenticated(
          outcome,
          returnTo,
          mode
        );
        sessions.markAuthenticated(user.id);
        completedOutcomes.set(user.id, outcome);
        return ok(outcome);
      } catch (cause) {
        return serviceFailure(cause);
      } finally {
        completionInFlight.delete(user.id);
        completionModes.delete(user.id);
      }
    })();
    completionInFlight.set(user.id, pending);
    completionModes.set(user.id, mode);
    return pending;
  };

  const safely = async <T>(
    task: () => Promise<Result<T>>
  ): Promise<Result<T>> => {
    try {
      return await task();
    } catch (cause) {
      return serviceFailure(cause);
    }
  };

  const requireActiveUser = async (userId: string): Promise<Result<null>> => {
    const session = await api.getSession();
    if (!session.success) return session;
    if (session.data?.user?.id !== userId) {
      return fail(
        "AUTH_SESSION_CHANGED",
        "登录状态已经变化，请重新登录后再保存资料。"
      );
    }
    return ok(null);
  };

  const beginAvatarSave = (userId: string): number => {
    const token = ++nextAvatarSaveToken;
    avatarSaveTokens.set(userId, token);
    return token;
  };

  const isLatestAvatarSave = (userId: string, token: number): boolean => (
    avatarSaveTokens.get(userId) === token
  );

  const supersededAvatarSave = <T>(): Result<T> => fail(
    "AVATAR_SAVE_SUPERSEDED",
    "已改用最后一次选择的头像。"
  );

  const beginDisplayNameSave = (userId: string): number => {
    const token = ++nextDisplayNameSaveToken;
    displayNameSaveTokens.set(userId, token);
    return token;
  };

  const isLatestDisplayNameSave = (
    userId: string,
    token: number
  ): boolean => displayNameSaveTokens.get(userId) === token;

  const supersededDisplayNameSave = <T>(): Result<T> => fail(
    "PROFILE_SAVE_SUPERSEDED",
    "已改用最后一次提交的用户资料。"
  );

  const saveAvatar = (
    input: SaveAvatarInput
  ): Promise<Result<AvatarSaveOutcome>> => {
    const userId = String(input.userId || "").trim();
    if (!userId) {
      return Promise.resolve(fail("AUTH_USER_MISSING", "无法读取登录用户。"));
    }
    const image = String(input.image || "");
    const current = avatarSaveInFlight.get(userId);
    if (current?.image === image) return current.promise;
    const token = beginAvatarSave(userId);
    const pending = safely<AvatarSaveOutcome>(async () => {
      const initialSession = await requireActiveUser(userId);
      if (!initialSession.success) return initialSession;
      const uploaded = await avatarImages.uploadAvatar({
        userId,
        image
      });
      if (!uploaded.success) return uploaded;
      if (!isLatestAvatarSave(userId, token)) {
        return supersededAvatarSave();
      }
      if (!isSafeAvatarMetadataUrl(uploaded.data)) {
        return fail(
          "AUTH_AVATAR_METADATA_UNSAFE",
          "头像必须先上传后再保存，请重新选择图片。"
        );
      }

      const currentSession = await requireActiveUser(userId);
      if (!currentSession.success) return currentSession;
      if (!isLatestAvatarSave(userId, token)) {
        return supersededAvatarSave();
      }
      const metadata = await api.updateMetadata({ avatar_url: uploaded.data });
      if (!metadata.success) return metadata;
      if (metadata.data?.id !== userId) {
        return fail(
          "AUTH_SESSION_CHANGED",
          "登录状态已经变化，请重新登录后再保存头像。"
        );
      }
      if (!isLatestAvatarSave(userId, token)) {
        return supersededAvatarSave();
      }
      const verifiedSession = await requireActiveUser(userId);
      if (!verifiedSession.success) return verifiedSession;
      const profile = await profileApi.updateAvatar(userId, uploaded.data);
      if (!profile.success) return profile;
      const finalSession = await requireActiveUser(userId);
      if (!finalSession.success) return finalSession;
      if (!isLatestAvatarSave(userId, token)) {
        return supersededAvatarSave();
      }
      return ok({
        avatarUrl: uploaded.data,
        requiresReauthentication: true
      });
    }).finally(() => {
      if (avatarSaveInFlight.get(userId)?.promise === pending) {
        avatarSaveInFlight.delete(userId);
      }
    });
    avatarSaveInFlight.set(userId, { image, promise: pending });
    return pending;
  };

  const needsAvatarMigration = (
    input: LegacyAvatarMigrationInput
  ): boolean => (
    isUnsafeAvatarMetadataValue(input.metadataAvatarUrl)
    || isUnsafeAvatarMetadataValue(input.profileAvatarUrl)
  );

  const migrateLegacyAvatar = (
    input: LegacyAvatarMigrationInput
  ): Promise<Result<AvatarMigrationOutcome>> => {
    const userId = String(input.userId || "").trim();
    if (!userId) {
      return Promise.resolve(fail("AUTH_USER_MISSING", "无法读取登录用户。"));
    }
    const current = avatarMigrationInFlight.get(userId);
    if (current) return current;

    const pending = safely(async (): Promise<Result<AvatarMigrationOutcome>> => {
      if (!needsAvatarMigration(input)) {
        const avatarUrl = isSafeAvatarMetadataUrl(input.profileAvatarUrl)
          ? input.profileAvatarUrl
          : isSafeAvatarMetadataUrl(input.metadataAvatarUrl)
            ? input.metadataAvatarUrl
            : "";
        return ok({
          migrated: false,
          avatarUrl,
          requiresReauthentication: false
        });
      }

      const source = isSafeAvatarMetadataUrl(input.profileAvatarUrl)
        ? input.profileAvatarUrl
        : isSafeAvatarMetadataUrl(input.metadataAvatarUrl)
          ? input.metadataAvatarUrl
          : isLegacyAvatarDataUrl(input.profileAvatarUrl)
            ? input.profileAvatarUrl
            : isLegacyAvatarDataUrl(input.metadataAvatarUrl)
              ? input.metadataAvatarUrl
              : "";

      if (!source) {
        const token = beginAvatarSave(userId);
        const active = await requireActiveUser(userId);
        if (!active.success) return active;
        if (!isLatestAvatarSave(userId, token)) {
          return supersededAvatarSave();
        }
        const metadata = await api.updateMetadata({ avatar_url: "" });
        if (!metadata.success) return metadata;
        if (metadata.data?.id !== userId) {
          return fail(
            "AUTH_SESSION_CHANGED",
            "登录状态已经变化，请重新登录后再保存头像。"
          );
        }
        if (!isLatestAvatarSave(userId, token)) {
          return supersededAvatarSave();
        }
        const verified = await requireActiveUser(userId);
        if (!verified.success) return verified;
        const profile = await profileApi.updateAvatar(userId, "");
        if (!profile.success) return profile;
        const finalSession = await requireActiveUser(userId);
        if (!finalSession.success) return finalSession;
        if (!isLatestAvatarSave(userId, token)) {
          return supersededAvatarSave();
        }
        return ok({
          migrated: true,
          avatarUrl: "",
          requiresReauthentication: true
        });
      }

      const saved = await saveAvatar({ userId, image: source });
      if (!saved.success) return saved;
      return ok({
        migrated: true,
        avatarUrl: saved.data.avatarUrl,
        requiresReauthentication: true
      });
    }).finally(() => {
      if (avatarMigrationInFlight.get(userId) === pending) {
        avatarMigrationInFlight.delete(userId);
      }
    });

    avatarMigrationInFlight.set(userId, pending);
    return pending;
  };

  const service: AuthService = {
    normalizeEmail: normalizeAuthEmail,
    isEmailVerified: isSupabaseEmailVerified,
    isPasswordRecoveryUrl,
    recoveryParams,
    createAuthState,
    ensureProfile,

    ensureRecoverySession(options) {
      return safely(() => restoreRecoverySession(api, options));
    },

    completeSupabaseAuth,

    signIn(input, effects) {
      const email = normalizeAuthEmail(input.email);
      return sessions.runExplicit(`sign-in:${email}`, () => safely(async () => {
        const result = await api.signIn(email, input.password);
        if (!result.success) return result;
        if (!result.data.user) {
          return fail("AUTH_USER_MISSING", "无法读取登录用户。");
        }
        return completeSupabaseAuth(
          {
            user: result.data.user,
            returnTo: input.returnTo,
            adminEmail: input.adminEmail,
            mode: "interactive"
          },
          effects
        );
      }));
    },

    signUp(input, effects) {
      const email = normalizeAuthEmail(input.email);
      return sessions.runExplicit(`sign-up:${email}`, () => safely(async () => {
        const result = await api.signUp({
          email,
          password: input.password,
          displayName: input.displayName || email.split("@")[0],
          emailRedirectTo: input.emailRedirectTo
        });
        if (!result.success) return result;
        const sessionUser = result.data.session?.user;
        if (sessionUser && isSupabaseEmailVerified(sessionUser)) {
          return completeSupabaseAuth(
            {
              user: sessionUser,
              returnTo: input.returnTo,
              displayName: input.displayName,
              adminEmail: input.adminEmail,
              mode: "interactive"
            },
            effects
          );
        }
        const outcome: VerificationRequiredOutcome = {
          status: "verification-required",
          reason: "email-confirmation",
          returnTo: input.returnTo
        };
        await effects.onVerificationRequired(outcome);
        return ok(outcome);
      }));
    },

    sendPasswordReset(input) {
      return sessions.runExplicit(`forgot:${normalizeAuthEmail(input.email)}`, () =>
        safely(() =>
          api.sendPasswordReset(normalizeAuthEmail(input.email), input.redirectTo)
        )
      );
    },

    updateDisplayName(requestedUserId, displayName) {
      const userId = String(requestedUserId || "").trim();
      if (!userId) {
        return Promise.resolve(
          fail("AUTH_USER_MISSING", "无法读取登录用户。")
        );
      }
      const name = String(displayName || "").trim();
      if (!name) {
        return Promise.resolve(
          fail("AUTH_DISPLAY_NAME_MISSING", "请填写用户昵称。")
        );
      }
      const token = beginDisplayNameSave(userId);
      return safely(async () => {
        const initialSession = await requireActiveUser(userId);
        if (!initialSession.success) return initialSession;
        if (!isLatestDisplayNameSave(userId, token)) {
          return supersededDisplayNameSave();
        }

        const metadata = await api.updateMetadata({
          display_name: name,
          name
        });
        if (!metadata.success) return metadata;
        const updatedUser = metadata.data;
        if (!updatedUser || updatedUser.id !== userId) {
          return fail(
            "AUTH_SESSION_CHANGED",
            "登录状态已经变化，请重新登录后再保存资料。"
          );
        }
        if (!isLatestDisplayNameSave(userId, token)) {
          return supersededDisplayNameSave();
        }

        const activeSession = await requireActiveUser(userId);
        if (!activeSession.success) return activeSession;
        if (!isLatestDisplayNameSave(userId, token)) {
          return supersededDisplayNameSave();
        }
        const profile = await profileApi.updateDisplayName(userId, name);
        if (!profile.success) return profile;
        if (profile.data.userId !== userId) {
          return fail(
            "PROFILE_USER_MISMATCH",
            "用户资料写入目标不一致，请重新登录后再试。"
          );
        }

        const finalSession = await requireActiveUser(userId);
        if (!finalSession.success) return finalSession;
        if (!isLatestDisplayNameSave(userId, token)) {
          return supersededDisplayNameSave();
        }
        return ok({ userId, user: updatedUser });
      });
    },

    saveAvatar,
    needsAvatarMigration,
    migrateLegacyAvatar,

    resetPassword(input, effects) {
      return sessions.runExplicit("reset-password", () => safely(async () => {
        const recovery = await restoreRecoverySession(api, input);
        if (!recovery.success) return recovery;
        if (!recovery.data.ready) {
          return fail(
            "AUTH_RECOVERY_INVALID",
            "重置链接无效或已经过期，请重新发送一封重置邮件，并使用 Safari 打开最新链接。"
          );
        }
        const updated = await api.updatePassword(input.password);
        if (!updated.success) return updated;
        sessions.expectSignedOut();
        await api.signOut();
        input.replaceUrl(urlAfterPasswordReset(input.href));
        resetAuthCycle();
        try {
          await effects.onSignedOut({ navigate: false, force: true });
        } finally {
          sessions.markSignedOut();
        }
        return ok(null);
      }));
    },

    signOut(effects) {
      return sessions.runExplicit("sign-out", () => safely(async () => {
        sessions.expectSignedOut();
        const result = await api.signOut();
        resetAuthCycle();
        try {
          await effects.onSignedOut({ navigate: true, target: "#home" });
        } finally {
          sessions.markSignedOut();
        }
        return result;
      }));
    },

    async syncSession(input, effects) {
      return safely<{ authenticated: boolean; recovery: boolean }>(async () => {
        if (isPasswordRecoveryUrl(input.href)) {
          const recovery = await restoreRecoverySession(api, input);
          if (!recovery.success) return recovery;
          return ok({ authenticated: false, recovery: recovery.data.ready });
        }

        const session = await api.getSession();
        if (!session.success) return session;
        if (session.data?.user) {
          const hash = new URL(input.href).hash || "#home";
          const completed = await completeSupabaseAuth(
            {
              user: session.data.user,
              returnTo: hash.startsWith("#auth") ? "#home" : hash,
              adminEmail: input.adminEmail,
              mode: "restore"
            },
            effects
          );
          if (!completed.success) return completed;
          return ok({ authenticated: true, recovery: false });
        }

        resetAuthCycle();
        await effects.onSignedOut({ navigate: false });
        sessions.markSignedOut();
        return ok({ authenticated: false, recovery: false });
      });
    },

    bindAuthListener(input) {
      const listenerEffects: AuthEffects = {
        ...input.effects,
        async onSignedOut(options) {
          resetAuthCycle();
          await input.effects.onSignedOut(options);
        }
      };
      const restoreFromEvent = (user: AuthUser) => {
        const hash = new URL(input.getHref()).hash || "#home";
        return completeSupabaseAuth(
          {
            user,
            returnTo: hash.startsWith("#auth") ? "#home" : hash,
            adminEmail: input.adminEmail,
            mode: "restore"
          },
          listenerEffects
        ).then(() => undefined);
      };
      return sessions.bind({
        effects: listenerEffects,
        getHref: input.getHref,
        getCurrentHash: input.getCurrentHash,
        onSignedIn: (user) =>
          completeSupabaseAuth(
            {
              user,
              returnTo: "#home",
              adminEmail: input.adminEmail,
              mode: "listener"
            },
            listenerEffects
          ).then(() => undefined),
        onInitialSession: restoreFromEvent
      });
    },

    diagnostics() {
      return {
        ...sessions.diagnostics(),
        cachedProfiles: profileCache.size
      };
    }
  };

  return service;
}
