import { describe, expect, it, vi } from "vitest";
import type { AuthApi } from "../../services/api/auth-api";
import type { UsersApi } from "../../services/api/users-api";
import { fail, ok } from "../../services/result";
import type {
  AuthEffects,
  AuthStateChangeCallback,
  AuthUser
} from "../../types/auth";
import { createAuthService } from "./auth-service";

const verifiedUser: AuthUser = {
  id: "user-1",
  email: "Person@Example.com",
  email_confirmed_at: "2026-07-14T00:00:00Z",
  user_metadata: { display_name: "Person" }
};

function createApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    signIn: vi.fn(),
    signUp: vi.fn(),
    getSession: vi.fn().mockResolvedValue(ok(null)),
    sendPasswordReset: vi.fn().mockResolvedValue(ok(null)),
    exchangeRecoveryCode: vi.fn().mockResolvedValue(ok(null)),
    setRecoverySession: vi.fn().mockResolvedValue(ok(null)),
    updatePassword: vi.fn().mockResolvedValue(ok(verifiedUser)),
    signOut: vi.fn().mockResolvedValue(ok(null)),
    onAuthStateChange: vi.fn(() => ok({ unsubscribe: vi.fn() })),
    ...overrides
  };
}

function createUsersApi(overrides: Partial<UsersApi> = {}): UsersApi {
  return {
    upsertProfile: vi.fn().mockResolvedValue(
      ok({
        id: verifiedUser.id,
        email: "person@example.com",
        display_name: "Person",
        role: "user"
      })
    ),
    ...overrides
  };
}

function createEffects() {
  return {
    onAuthenticated: vi.fn<AuthEffects["onAuthenticated"]>(),
    onVerificationRequired: vi.fn<AuthEffects["onVerificationRequired"]>(),
    onSignedOut: vi.fn<AuthEffects["onSignedOut"]>(),
    onRecovery: vi.fn<AuthEffects["onRecovery"]>(),
    onTokenRefreshed: vi.fn<AuthEffects["onTokenRefreshed"]>(),
    onUserUpdated: vi.fn<AuthEffects["onUserUpdated"]>()
  };
}

describe("Auth service", () => {
  it("logs in, preserves returnTo, and completes only once", async () => {
    const signIn = vi.fn().mockResolvedValue(
      ok({ user: verifiedUser, session: { user: verifiedUser } })
    );
    const users = createUsersApi();
    const service = createAuthService(createApi({ signIn }), users);
    const effects = createEffects();
    const input = {
      email: " Person@Example.com ",
      password: "secret",
      returnTo: "#publish",
      adminEmail: "admin@example.com"
    };

    const [first, duplicate] = await Promise.all([
      service.signIn(input, effects),
      service.signIn(input, effects)
    ]);
    expect(first).toMatchObject({
      success: true,
      data: { status: "authenticated", account: "person@example.com" }
    });
    expect(duplicate).toEqual(first);
    expect(signIn).toHaveBeenCalledOnce();
    expect(signIn).toHaveBeenCalledWith("person@example.com", "secret");
    expect(users.upsertProfile).toHaveBeenCalledOnce();
    expect(effects.onAuthenticated).toHaveBeenCalledOnce();
    expect(effects.onAuthenticated).toHaveBeenCalledWith(
      expect.objectContaining({ status: "authenticated", applied: true }),
      "#publish",
      "interactive"
    );
  });

  it("does not duplicate completion when SIGNED_IN fires during submit", async () => {
    let listener: AuthStateChangeCallback | undefined;
    const onAuthStateChange = vi.fn((callback) => {
      listener = callback;
      return ok({ unsubscribe: vi.fn() });
    });
    const signIn = vi.fn(async () => {
      await listener?.("SIGNED_IN", { user: verifiedUser });
      return ok({ user: verifiedUser, session: { user: verifiedUser } });
    });
    const users = createUsersApi();
    const service = createAuthService(
      createApi({ signIn, onAuthStateChange }),
      users
    );
    const effects = createEffects();
    service.bindAuthListener({
      effects,
      adminEmail: "admin@example.com",
      getHref: () => "https://www.saminest.com/#publish",
      getCurrentHash: () => "#publish"
    });

    await service.signIn(
      {
        email: "person@example.com",
        password: "secret",
        returnTo: "#publish",
        adminEmail: "admin@example.com"
      },
      effects
    );
    expect(users.upsertProfile).toHaveBeenCalledOnce();
    expect(effects.onAuthenticated).toHaveBeenCalledOnce();
    expect(service.diagnostics().listenerBindings).toBe(1);
  });

  it("returns stable errors for a wrong password without side effects", async () => {
    const service = createAuthService(
      createApi({
        signIn: vi.fn().mockResolvedValue(
          fail("AUTH_INVALID_CREDENTIALS", "邮箱或密码不正确，请重新输入。")
        )
      }),
      createUsersApi()
    );
    const effects = createEffects();
    await expect(
      service.signIn(
        {
          email: "person@example.com",
          password: "wrong",
          returnTo: "#home",
          adminEmail: "admin@example.com"
        },
        effects
      )
    ).resolves.toEqual({
      success: false,
      data: null,
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "邮箱或密码不正确，请重新输入。"
      }
    });
    expect(effects.onAuthenticated).not.toHaveBeenCalled();
  });

  it("keeps the unverified-email behavior", async () => {
    const user = { id: "user-2", email: "new@example.com" };
    const signOut = vi.fn().mockResolvedValue(ok(null));
    const service = createAuthService(
      createApi({
        signIn: vi.fn().mockResolvedValue(ok({ user, session: { user } })),
        signOut
      }),
      createUsersApi()
    );
    const effects = createEffects();
    const result = await service.signIn(
      {
        email: "new@example.com",
        password: "secret",
        returnTo: "#messages",
        adminEmail: "admin@example.com"
      },
      effects
    );
    expect(result).toMatchObject({
      success: true,
      data: {
        status: "verification-required",
        reason: "email-unverified",
        returnTo: "#messages"
      }
    });
    expect(signOut).toHaveBeenCalledOnce();
    expect(effects.onVerificationRequired).toHaveBeenCalledOnce();
    expect(effects.onAuthenticated).not.toHaveBeenCalled();
  });

  it("handles registration with and without an immediate session", async () => {
    const confirmationEffects = createEffects();
    const confirmationService = createAuthService(
      createApi({
        signUp: vi.fn().mockResolvedValue(
          ok({ user: { id: "new-user" }, session: null })
        )
      }),
      createUsersApi()
    );
    await expect(
      confirmationService.signUp(
        {
          email: "new@example.com",
          password: "secret",
          displayName: "New User",
          emailRedirectTo: "https://www.saminest.com/#auth/login",
          returnTo: "#home",
          adminEmail: "admin@example.com"
        },
        confirmationEffects
      )
    ).resolves.toMatchObject({
      success: true,
      data: { status: "verification-required", reason: "email-confirmation" }
    });
    expect(confirmationEffects.onVerificationRequired).toHaveBeenCalledOnce();

    const verifiedEffects = createEffects();
    const verifiedService = createAuthService(
      createApi({
        signUp: vi.fn().mockResolvedValue(
          ok({ user: verifiedUser, session: { user: verifiedUser } })
        )
      }),
      createUsersApi()
    );
    await verifiedService.signUp(
      {
        email: "person@example.com",
        password: "secret",
        displayName: "Person",
        emailRedirectTo: "https://www.saminest.com/#auth/login",
        returnTo: "#home",
        adminEmail: "admin@example.com"
      },
      verifiedEffects
    );
    expect(verifiedEffects.onAuthenticated).toHaveBeenCalledOnce();
    expect(verifiedEffects.onVerificationRequired).not.toHaveBeenCalled();
  });

  it("sends reset mail with the current redirect URL", async () => {
    const sendPasswordReset = vi.fn().mockResolvedValue(ok(null));
    const service = createAuthService(
      createApi({ sendPasswordReset }),
      createUsersApi()
    );
    await service.sendPasswordReset({
      email: " Person@Example.com ",
      redirectTo: "https://www.saminest.com/?auth=reset"
    });
    expect(sendPasswordReset).toHaveBeenCalledWith(
      "person@example.com",
      "https://www.saminest.com/?auth=reset"
    );
  });

  it("resets a password in recovery-update-signout order", async () => {
    const order: string[] = [];
    const getSession = vi.fn(async () => {
      order.push("recover");
      return ok({ user: verifiedUser });
    });
    const updatePassword = vi.fn(async () => {
      order.push("update");
      return ok(verifiedUser);
    });
    const signOut = vi.fn(async () => {
      order.push("signout");
      return ok(null);
    });
    const service = createAuthService(
      createApi({ getSession, updatePassword, signOut }),
      createUsersApi()
    );
    const effects = createEffects();
    const replaceUrl = vi.fn();
    await expect(
      service.resetPassword(
        {
          password: "new-secret",
          href: "https://www.saminest.com/?auth=reset",
          replaceUrl,
          wait: vi.fn()
        },
        effects
      )
    ).resolves.toEqual({ success: true, data: null, error: null });
    expect(order).toEqual(["recover", "update", "signout"]);
    expect(replaceUrl).toHaveBeenCalledWith("/");
    expect(effects.onSignedOut).toHaveBeenCalledWith({
      navigate: false,
      force: true
    });
  });

  it("does not sign out when password update fails", async () => {
    const signOut = vi.fn();
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updatePassword: vi.fn().mockResolvedValue(
          fail("AUTH_WEAK_PASSWORD", "密码至少需要 6 位。")
        ),
        signOut
      }),
      createUsersApi()
    );
    const result = await service.resetPassword(
      {
        password: "short",
        href: "https://www.saminest.com/?auth=reset",
        replaceUrl: vi.fn(),
        wait: vi.fn()
      },
      createEffects()
    );
    expect(result).toMatchObject({ success: false, error: { code: "AUTH_WEAK_PASSWORD" } });
    expect(signOut).not.toHaveBeenCalled();
  });

  it("restores a refreshed session without interactive navigation", async () => {
    const service = createAuthService(
      createApi({ getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })) }),
      createUsersApi()
    );
    const effects = createEffects();
    await expect(
      service.syncSession(
        {
          href: "https://www.saminest.com/#messages",
          replaceUrl: vi.fn(),
          wait: vi.fn(),
          adminEmail: "admin@example.com"
        },
        effects
      )
    ).resolves.toEqual({
      success: true,
      data: { authenticated: true, recovery: false },
      error: null
    });
    expect(effects.onAuthenticated).toHaveBeenCalledWith(
      expect.any(Object),
      "#messages",
      "restore"
    );
  });

  it("preserves interactive returnTo when login overlaps session restore", async () => {
    let releaseProfile!: () => void;
    const profileGate = new Promise<void>((resolve) => {
      releaseProfile = resolve;
    });
    const upsertProfile = vi.fn(async () => {
      await profileGate;
      return ok({
        id: verifiedUser.id,
        email: "person@example.com",
        display_name: "Person",
        role: "user"
      });
    });
    const signIn = vi.fn().mockResolvedValue(
      ok({ user: verifiedUser, session: { user: verifiedUser } })
    );
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        signIn
      }),
      createUsersApi({ upsertProfile })
    );
    const restoreEffects = createEffects();
    const interactiveEffects = createEffects();
    const restore = service.syncSession(
      {
        href: "https://www.saminest.com/#auth/login",
        replaceUrl: vi.fn(),
        wait: vi.fn(),
        adminEmail: "admin@example.com"
      },
      restoreEffects
    );
    await vi.waitFor(() => expect(upsertProfile).toHaveBeenCalledOnce());

    const login = service.signIn(
      {
        email: "person@example.com",
        password: "secret",
        returnTo: "#publish",
        adminEmail: "admin@example.com"
      },
      interactiveEffects
    );
    await vi.waitFor(() => expect(signIn).toHaveBeenCalledOnce());
    expect(interactiveEffects.onAuthenticated).not.toHaveBeenCalled();
    releaseProfile();

    await expect(restore).resolves.toMatchObject({ success: true });
    await expect(login).resolves.toMatchObject({ success: true });
    expect(upsertProfile).toHaveBeenCalledOnce();
    expect(restoreEffects.onAuthenticated).toHaveBeenCalledOnce();
    expect(restoreEffects.onAuthenticated).toHaveBeenCalledWith(
      expect.any(Object),
      "#home",
      "restore"
    );
    expect(interactiveEffects.onAuthenticated).toHaveBeenCalledOnce();
    expect(interactiveEffects.onAuthenticated).toHaveBeenCalledWith(
      expect.objectContaining({ status: "authenticated", applied: true }),
      "#publish",
      "interactive"
    );
  });

  it("logs out locally once even when the provider event follows", async () => {
    let listener: AuthStateChangeCallback | undefined;
    const signOut = vi.fn(async () => {
      await listener?.("SIGNED_OUT", null);
      return ok(null);
    });
    const service = createAuthService(
      createApi({
        signOut,
        onAuthStateChange: vi.fn((callback) => {
          listener = callback;
          return ok({ unsubscribe: vi.fn() });
        })
      }),
      createUsersApi()
    );
    const effects = createEffects();
    service.bindAuthListener({
      effects,
      adminEmail: "admin@example.com",
      getHref: () => "https://www.saminest.com/#me",
      getCurrentHash: () => "#me"
    });
    await service.signOut(effects);
    expect(signOut).toHaveBeenCalledOnce();
    expect(effects.onSignedOut).toHaveBeenCalledOnce();
    expect(effects.onSignedOut).toHaveBeenCalledWith({
      navigate: true,
      target: "#home"
    });
  });

  it("allows a later interactive login to rebuild state and returnTo", async () => {
    const signIn = vi.fn().mockResolvedValue(
      ok({ user: verifiedUser, session: { user: verifiedUser } })
    );
    const users = createUsersApi();
    const service = createAuthService(createApi({ signIn }), users);
    const effects = createEffects();
    await service.signIn(
      {
        email: "person@example.com",
        password: "secret",
        returnTo: "#home",
        adminEmail: "admin@example.com"
      },
      effects
    );
    await service.signIn(
      {
        email: "person@example.com",
        password: "secret",
        returnTo: "#messages",
        adminEmail: "admin@example.com"
      },
      effects
    );

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(users.upsertProfile).toHaveBeenCalledTimes(2);
    expect(effects.onAuthenticated).toHaveBeenCalledTimes(2);
    expect(effects.onAuthenticated).toHaveBeenLastCalledWith(
      expect.any(Object),
      "#messages",
      "interactive"
    );
  });

  it("retries profile synchronization in a new auth cycle", async () => {
    const upsertProfile = vi
      .fn()
      .mockResolvedValueOnce(
        fail("PROFILE_UPSERT_FAILED", "用户资料暂时无法同步。")
      )
      .mockResolvedValueOnce(
        ok({
          id: verifiedUser.id,
          email: "person@example.com",
          display_name: "Updated Person",
          role: "user"
        })
      );
    const service = createAuthService(
      createApi({
        signIn: vi.fn().mockResolvedValue(
          ok({ user: verifiedUser, session: { user: verifiedUser } })
        )
      }),
      createUsersApi({ upsertProfile })
    );
    const effects = createEffects();
    const input = {
      email: "person@example.com",
      password: "secret",
      returnTo: "#home",
      adminEmail: "admin@example.com"
    };
    await service.signIn(input, effects);
    await service.signOut(effects);
    await service.signIn(input, effects);
    expect(upsertProfile).toHaveBeenCalledTimes(2);
    expect(effects.onAuthenticated).toHaveBeenLastCalledWith(
      expect.objectContaining({
        savedAccount: expect.objectContaining({ name: "Updated Person" })
      }),
      "#home",
      "interactive"
    );
  });

  it("completes a verified INITIAL_SESSION without interactive navigation", async () => {
    let listener: AuthStateChangeCallback | undefined;
    const service = createAuthService(
      createApi({
        onAuthStateChange: vi.fn((callback) => {
          listener = callback;
          return ok({ unsubscribe: vi.fn() });
        })
      }),
      createUsersApi()
    );
    const effects = createEffects();
    service.bindAuthListener({
      effects,
      adminEmail: "admin@example.com",
      getHref: () => "https://www.saminest.com/#publish",
      getCurrentHash: () => "#publish"
    });
    await listener?.("INITIAL_SESSION", { user: verifiedUser });
    await listener?.("SIGNED_IN", { user: verifiedUser });
    expect(effects.onAuthenticated).toHaveBeenCalledOnce();
    expect(effects.onAuthenticated).toHaveBeenCalledWith(
      expect.any(Object),
      "#publish",
      "restore"
    );
  });

  it("converts rejected effects to a failed Result", async () => {
    const service = createAuthService(
      createApi({
        signUp: vi.fn().mockResolvedValue(
          ok({ user: { id: "new-user" }, session: null })
        )
      }),
      createUsersApi()
    );
    const effects = createEffects();
    effects.onVerificationRequired.mockRejectedValueOnce(
      new Error("private provider detail")
    );
    const result = await service.signUp(
      {
        email: "new@example.com",
        password: "secret",
        displayName: "New",
        emailRedirectTo: "https://www.saminest.com/#auth/login",
        returnTo: "#home",
        adminEmail: "admin@example.com"
      },
      effects
    );
    expect(result).toEqual({
      success: false,
      data: null,
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "账号功能暂时不可用，请稍后再试。"
      }
    });
  });
});
