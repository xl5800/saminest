import { describe, expect, it, vi } from "vitest";
import type { AuthApi } from "../../services/api/auth-api";
import type { UsersApi } from "../../services/api/users-api";
import { fail, ok, type Result } from "../../services/result";
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
    updateMetadata: vi.fn().mockResolvedValue(ok(verifiedUser)),
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
    updateAvatar: vi.fn().mockResolvedValue(ok(null)),
    updateDisplayName: vi.fn().mockImplementation((userId) =>
      Promise.resolve(ok({ userId }))
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

  it("uploads an avatar once and writes only the returned short URL", async () => {
    const order: string[] = [];
    const updateMetadata = vi.fn(async () => {
      order.push("metadata");
      return ok(verifiedUser);
    });
    const updateAvatar = vi.fn(async () => {
      order.push("profile");
      return ok(null);
    });
    const uploadAvatar = vi.fn(async () => {
      order.push("upload");
      return ok("https://cdn.example/user-1/avatar/1.jpg");
    });
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar }
    );

    await expect(service.saveAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,AAAA"
    })).resolves.toEqual({
      success: true,
      data: {
        avatarUrl: "https://cdn.example/user-1/avatar/1.jpg",
        requiresReauthentication: true
      },
      error: null
    });
    expect(uploadAvatar).toHaveBeenCalledOnce();
    expect(updateAvatar).toHaveBeenCalledWith(
      "user-1",
      "https://cdn.example/user-1/avatar/1.jpg"
    );
    expect(updateMetadata).toHaveBeenCalledWith({
      avatar_url: "https://cdn.example/user-1/avatar/1.jpg"
    });
    expect(updateMetadata).not.toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: expect.stringMatching(/^data:/) })
    );
    expect(order).toEqual(["upload", "metadata", "profile"]);
  });

  it("coalesces identical concurrent avatar saves into one upload", async () => {
    let resolveUpload!: (value: Result<string>) => void;
    const upload = new Promise<Result<string>>((resolve) => {
      resolveUpload = resolve;
    });
    const shortUrl = "https://cdn.example/user-1/avatar/shared.jpg";
    const uploadAvatar = vi.fn(() => upload);
    const updateMetadata = vi.fn().mockResolvedValue(ok(verifiedUser));
    const updateAvatar = vi.fn().mockResolvedValue(ok(null));
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar }
    );
    const input = {
      userId: "user-1",
      image: "data:image/jpeg;base64,SAME"
    };

    const first = service.saveAvatar(input);
    const duplicate = service.saveAvatar(input);
    await vi.waitFor(() => expect(uploadAvatar).toHaveBeenCalledOnce());
    resolveUpload(ok(shortUrl));

    await expect(first).resolves.toMatchObject({
      success: true,
      data: { avatarUrl: shortUrl }
    });
    await expect(duplicate).resolves.toMatchObject({
      success: true,
      data: { avatarUrl: shortUrl }
    });
    expect(updateMetadata).toHaveBeenCalledOnce();
    expect(updateAvatar).toHaveBeenCalledOnce();
  });

  it("migrates concurrent legacy Base64 avatars through one upload", async () => {
    const updateMetadata = vi.fn().mockResolvedValue(ok(verifiedUser));
    const updateAvatar = vi.fn().mockResolvedValue(ok(null));
    const uploadAvatar = vi.fn().mockResolvedValue(
      ok("https://cdn.example/user-1/avatar/migrated.jpg")
    );
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar }
    );
    const input = {
      userId: "user-1",
      metadataAvatarUrl: "data:image/jpeg;base64,AAAA",
      profileAvatarUrl: "data:image/jpeg;base64,AAAA"
    };

    const [first, duplicate] = await Promise.all([
      service.migrateLegacyAvatar(input),
      service.migrateLegacyAvatar(input)
    ]);
    expect(first).toEqual(duplicate);
    expect(first).toMatchObject({
      success: true,
      data: {
        migrated: true,
        avatarUrl: "https://cdn.example/user-1/avatar/migrated.jpg",
        requiresReauthentication: true
      }
    });
    expect(uploadAvatar).toHaveBeenCalledOnce();
    expect(updateAvatar).toHaveBeenCalledOnce();
    expect(updateMetadata).toHaveBeenCalledOnce();
  });

  it("shrinks Auth metadata even if the profile mirror update fails", async () => {
    const shortUrl = "https://cdn.example/user-1/avatar/short.jpg";
    const updateMetadata = vi.fn().mockResolvedValue(ok(verifiedUser));
    const updateAvatar = vi.fn().mockResolvedValue(
      fail("PROFILE_AVATAR_UPDATE_FAILED", "头像资料暂时无法同步。")
    );
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar: vi.fn().mockResolvedValue(ok(shortUrl)) }
    );

    await expect(service.saveAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,AAAA"
    })).resolves.toMatchObject({
      success: false,
      error: { code: "PROFILE_AVATAR_UPDATE_FAILED" }
    });
    expect(updateMetadata).toHaveBeenCalledWith({ avatar_url: shortUrl });
    expect(updateAvatar).toHaveBeenCalledWith("user-1", shortUrl);
  });

  it("reuses a safe profile URL when only Auth metadata is legacy", async () => {
    const safeUrl = "https://cdn.example/user-1/avatar/existing.jpg";
    const updateMetadata = vi.fn().mockResolvedValue(ok(verifiedUser));
    const updateAvatar = vi.fn().mockResolvedValue(ok(null));
    const uploadAvatar = vi.fn(async ({ image }) => ok(image));
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar }
    );

    await expect(service.migrateLegacyAvatar({
      userId: "user-1",
      metadataAvatarUrl: "data:image/jpeg;base64,AAAA",
      profileAvatarUrl: safeUrl
    })).resolves.toMatchObject({
      success: true,
      data: { migrated: true, avatarUrl: safeUrl }
    });
    expect(uploadAvatar).toHaveBeenCalledOnce();
    expect(uploadAvatar).toHaveBeenCalledWith({
      userId: "user-1",
      image: safeUrl
    });
    expect(updateMetadata).toHaveBeenCalledWith({ avatar_url: safeUrl });
  });

  it("clears legacy Blob metadata when no reusable avatar exists", async () => {
    const updateMetadata = vi.fn().mockResolvedValue(ok(verifiedUser));
    const updateAvatar = vi.fn().mockResolvedValue(ok(null));
    const uploadAvatar = vi.fn();
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar }
    );

    await expect(service.migrateLegacyAvatar({
      userId: "user-1",
      metadataAvatarUrl: "blob:https://www.saminest.com/legacy",
      profileAvatarUrl: ""
    })).resolves.toMatchObject({
      success: true,
      data: { migrated: true, avatarUrl: "" }
    });
    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(updateAvatar).toHaveBeenCalledWith("user-1", "");
    expect(updateMetadata).toHaveBeenCalledWith({ avatar_url: "" });
  });

  it("does not mirror a cleared avatar when metadata updates another user", async () => {
    const otherUser = { ...verifiedUser, id: "user-2" };
    const updateMetadata = vi.fn().mockResolvedValue(ok(otherUser));
    const updateAvatar = vi.fn();
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar: vi.fn() }
    );

    await expect(service.migrateLegacyAvatar({
      userId: "user-1",
      metadataAvatarUrl: "blob:https://www.saminest.com/legacy",
      profileAvatarUrl: ""
    })).resolves.toMatchObject({
      success: false,
      error: { code: "AUTH_SESSION_CHANGED" }
    });
    expect(updateAvatar).not.toHaveBeenCalled();
  });

  it("stops before metadata writes when the active session changes", async () => {
    const otherUser = { ...verifiedUser, id: "user-2" };
    const getSession = vi.fn()
      .mockResolvedValueOnce(ok({ user: verifiedUser }))
      .mockResolvedValueOnce(ok({ user: otherUser }));
    const updateMetadata = vi.fn();
    const updateAvatar = vi.fn();
    const uploadAvatar = vi.fn().mockResolvedValue(
      ok("https://cdn.example/user-1/avatar/pending.jpg")
    );
    const service = createAuthService(
      createApi({ getSession, updateMetadata }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar }
    );

    await expect(service.saveAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,AAAA"
    })).resolves.toMatchObject({
      success: false,
      error: { code: "AUTH_SESSION_CHANGED" }
    });
    expect(uploadAvatar).toHaveBeenCalledOnce();
    expect(updateMetadata).not.toHaveBeenCalled();
    expect(updateAvatar).not.toHaveBeenCalled();
  });

  it("lets the last rapid avatar selection win", async () => {
    let resolveFirst!: (value: Result<string>) => void;
    const firstUpload = new Promise<Result<string>>((resolve) => {
      resolveFirst = resolve;
    });
    const firstUrl = "https://cdn.example/user-1/avatar/first.jpg";
    const secondUrl = "https://cdn.example/user-1/avatar/second.jpg";
    const uploadAvatar = vi.fn()
      .mockImplementationOnce(() => firstUpload)
      .mockResolvedValueOnce(ok(secondUrl));
    const updateMetadata = vi.fn().mockResolvedValue(ok(verifiedUser));
    const updateAvatar = vi.fn().mockResolvedValue(ok(null));
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar }
    );

    const first = service.saveAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,FIRST"
    });
    await vi.waitFor(() => expect(uploadAvatar).toHaveBeenCalledOnce());
    const second = service.saveAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,SECOND"
    });
    await expect(second).resolves.toMatchObject({ success: true });
    resolveFirst(ok(firstUrl));
    await expect(first).resolves.toMatchObject({
      success: false,
      error: { code: "AVATAR_SAVE_SUPERSEDED" }
    });
    expect(updateMetadata).toHaveBeenCalledOnce();
    expect(updateMetadata).toHaveBeenCalledWith({ avatar_url: secondUrl });
    expect(updateAvatar).toHaveBeenCalledOnce();
    expect(updateAvatar).toHaveBeenCalledWith("user-1", secondUrl);
  });

  it("updates display-name metadata without re-writing the current avatar", async () => {
    const updateMetadata = vi.fn().mockResolvedValue(ok(verifiedUser));
    const updateDisplayName = vi.fn().mockResolvedValue(
      ok({ userId: verifiedUser.id })
    );
    const service = createAuthService(
      createApi({
        getSession: vi.fn().mockResolvedValue(ok({ user: verifiedUser })),
        updateMetadata
      }),
      createUsersApi({ updateDisplayName }),
      { uploadAvatar: vi.fn() }
    );

    await expect(
      service.updateDisplayName("user-1", " Person ")
    ).resolves.toMatchObject({
      success: true,
      data: { userId: "user-1", user: { id: "user-1" } }
    });
    expect(updateMetadata).toHaveBeenCalledWith({
      display_name: "Person",
      name: "Person"
    });
    expect(updateDisplayName).toHaveBeenCalledWith("user-1", "Person");
    expect(updateMetadata).not.toHaveBeenCalledWith(
      expect.objectContaining({ avatar_url: expect.anything() })
    );
  });

  it("does not return an avatar success after the active user changes", async () => {
    const userB = { ...verifiedUser, id: "user-2" };
    let activeUser = verifiedUser;
    let resolveProfile!: (value: Result<null>) => void;
    const profileUpdate = new Promise<Result<null>>((resolve) => {
      resolveProfile = resolve;
    });
    const updateAvatar = vi.fn(() => profileUpdate);
    const service = createAuthService(
      createApi({
        getSession: vi.fn(async () => ok({ user: activeUser })),
        updateMetadata: vi.fn().mockResolvedValue(ok(verifiedUser))
      }),
      createUsersApi({ updateAvatar }),
      {
        uploadAvatar: vi.fn().mockResolvedValue(
          ok("https://cdn.example/user-1/avatar/a.jpg")
        )
      }
    );

    const save = service.saveAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,AAAA"
    });
    await vi.waitFor(() => expect(updateAvatar).toHaveBeenCalledOnce());
    activeUser = userB;
    resolveProfile(ok(null));

    await expect(save).resolves.toMatchObject({
      success: false,
      error: { code: "AUTH_SESSION_CHANGED" }
    });
    expect(updateAvatar).toHaveBeenCalledWith(
      "user-1",
      "https://cdn.example/user-1/avatar/a.jpg"
    );
  });

  it("keeps a late user A avatar result from superseding user B", async () => {
    const userB = { ...verifiedUser, id: "user-2" };
    let activeUser = verifiedUser;
    let resolveUserAUpload!: (value: Result<string>) => void;
    const userAUpload = new Promise<Result<string>>((resolve) => {
      resolveUserAUpload = resolve;
    });
    const uploadAvatar = vi.fn()
      .mockImplementationOnce(() => userAUpload)
      .mockResolvedValueOnce(
        ok("https://cdn.example/user-2/avatar/b.jpg")
      );
    const updateMetadata = vi.fn(async () => ok(activeUser));
    const updateAvatar = vi.fn().mockResolvedValue(ok(null));
    const service = createAuthService(
      createApi({
        getSession: vi.fn(async () => ok({ user: activeUser })),
        updateMetadata
      }),
      createUsersApi({ updateAvatar }),
      { uploadAvatar }
    );

    const userASave = service.saveAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,USER_A"
    });
    await vi.waitFor(() => expect(uploadAvatar).toHaveBeenCalledOnce());
    activeUser = userB;
    const userBSave = service.saveAvatar({
      userId: "user-2",
      image: "data:image/jpeg;base64,USER_B"
    });
    await expect(userBSave).resolves.toMatchObject({
      success: true,
      data: {
        avatarUrl: "https://cdn.example/user-2/avatar/b.jpg"
      }
    });

    resolveUserAUpload(ok("https://cdn.example/user-1/avatar/a.jpg"));
    await expect(userASave).resolves.toMatchObject({
      success: false,
      error: { code: "AUTH_SESSION_CHANGED" }
    });
    expect(updateMetadata).toHaveBeenCalledOnce();
    expect(updateAvatar).toHaveBeenCalledOnce();
    expect(updateAvatar).toHaveBeenCalledWith(
      "user-2",
      "https://cdn.example/user-2/avatar/b.jpg"
    );
  });

  it("targets the requested profile and rejects a late display-name result", async () => {
    const userB = { ...verifiedUser, id: "user-2" };
    let activeUser = verifiedUser;
    let resolveProfile!: (value: Result<{ userId: string }>) => void;
    const profileUpdate = new Promise<Result<{ userId: string }>>((resolve) => {
      resolveProfile = resolve;
    });
    const updateDisplayName = vi.fn(() => profileUpdate);
    const service = createAuthService(
      createApi({
        getSession: vi.fn(async () => ok({ user: activeUser })),
        updateMetadata: vi.fn().mockResolvedValue(ok(verifiedUser))
      }),
      createUsersApi({ updateDisplayName }),
      { uploadAvatar: vi.fn() }
    );

    const save = service.updateDisplayName("user-1", "User A");
    await vi.waitFor(() => expect(updateDisplayName).toHaveBeenCalledOnce());
    expect(updateDisplayName).toHaveBeenCalledWith("user-1", "User A");
    activeUser = userB;
    resolveProfile(ok({ userId: "user-1" }));

    await expect(save).resolves.toMatchObject({
      success: false,
      error: { code: "AUTH_SESSION_CHANGED" }
    });
  });
});
