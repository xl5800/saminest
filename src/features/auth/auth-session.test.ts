import { describe, expect, it, vi } from "vitest";
import type { AuthApi } from "../../services/api/auth-api";
import { fail, ok } from "../../services/result";
import type {
  AuthEffects,
  AuthStateChangeCallback,
  AuthUser
} from "../../types/auth";
import {
  createAuthSessionCoordinator,
  ensureRecoverySession,
  isPasswordRecoveryUrl,
  recoveryParams,
  urlAfterPasswordReset
} from "./auth-session";

function createApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    signIn: vi.fn(),
    signUp: vi.fn(),
    getSession: vi.fn().mockResolvedValue(ok(null)),
    sendPasswordReset: vi.fn(),
    exchangeRecoveryCode: vi.fn().mockResolvedValue(ok(null)),
    setRecoverySession: vi.fn().mockResolvedValue(ok(null)),
    updatePassword: vi.fn(),
    signOut: vi.fn().mockResolvedValue(ok(null)),
    onAuthStateChange: vi.fn(() => ok({ unsubscribe: vi.fn() })),
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

describe("Auth recovery session", () => {
  it("recognizes current links, PKCE paths, and legacy hash links", () => {
    expect(isPasswordRecoveryUrl("https://www.saminest.com/?auth=reset")).toBe(true);
    expect(isPasswordRecoveryUrl("https://www.saminest.com/reset-password?code=abc")).toBe(true);
    expect(isPasswordRecoveryUrl("https://www.saminest.com/#auth/reset")).toBe(true);
    expect(isPasswordRecoveryUrl("https://www.saminest.com/#access_token=a&type=recovery")).toBe(true);
    expect(isPasswordRecoveryUrl("https://www.saminest.com/#home")).toBe(false);
  });

  it("exchanges a PKCE code before accepting an existing session", async () => {
    const user = { id: "user-1" };
    const exchangeRecoveryCode = vi.fn().mockResolvedValue(ok({ user }));
    const getSession = vi.fn().mockResolvedValue(ok({ user: { id: "other-user" } }));
    const api = createApi({ exchangeRecoveryCode, getSession });
    const replaceUrl = vi.fn();
    const result = await ensureRecoverySession(api, {
      href: "https://www.saminest.com/reset-password?code=pkce&keep=1",
      replaceUrl,
      wait: vi.fn()
    });

    expect(result).toEqual({
      success: true,
      data: { ready: true, method: "pkce" },
      error: null
    });
    expect(exchangeRecoveryCode).toHaveBeenCalledWith("pkce");
    expect(getSession).not.toHaveBeenCalled();
    expect(replaceUrl).toHaveBeenCalledWith("/reset-password?keep=1");
  });

  it("restores legacy hash tokens including #auth/reset query form", async () => {
    const user = { id: "user-1" };
    const setRecoverySession = vi.fn().mockResolvedValue(ok({ user }));
    const api = createApi({ setRecoverySession });
    const href = "https://www.saminest.com/#auth/reset?access_token=access&refresh_token=refresh&type=recovery";
    const params = recoveryParams(href);
    expect(params.get("access_token")).toBe("access");
    expect(params.get("refresh_token")).toBe("refresh");

    await expect(
      ensureRecoverySession(api, {
        href,
        replaceUrl: vi.fn(),
        wait: vi.fn()
      })
    ).resolves.toMatchObject({
      success: true,
      data: { ready: true, method: "hash" }
    });
    expect(setRecoverySession).toHaveBeenCalledWith({
      accessToken: "access",
      refreshToken: "refresh"
    });
  });

  it("removes recovery markers after a successful password reset", () => {
    expect(
      urlAfterPasswordReset(
        "https://www.saminest.com/reset-password?auth=reset&code=abc#auth/reset"
      )
    ).toBe("/");
    expect(
      urlAfterPasswordReset(
        "https://www.saminest.com/index.html?auth=reset#access_token=a&type=recovery"
      )
    ).toBe("/index.html");
  });

  it("accepts an SDK-restored session when a code was already consumed", async () => {
    const user = { id: "user-1" };
    const api = createApi({
      exchangeRecoveryCode: vi.fn().mockResolvedValue(
        fail("AUTH_LINK_EXPIRED", "账号状态已过期，请重新操作一次。")
      ),
      getSession: vi.fn().mockResolvedValue(ok({ user }))
    });
    const replaceUrl = vi.fn();
    await expect(
      ensureRecoverySession(api, {
        href: "https://www.saminest.com/?auth=reset&code=consumed",
        replaceUrl,
        wait: vi.fn()
      })
    ).resolves.toMatchObject({
      success: true,
      data: { ready: true, method: "existing" }
    });
    expect(replaceUrl).toHaveBeenCalledWith("/?auth=reset");
  });

  it("retries getSession after a transient first failure", async () => {
    const user = { id: "user-1" };
    const getSession = vi
      .fn()
      .mockResolvedValueOnce(fail("AUTH_UNAVAILABLE", "账号功能暂时不可用，请稍后再试。"))
      .mockResolvedValueOnce(ok({ user }));
    const wait = vi.fn().mockResolvedValue(undefined);
    await expect(
      ensureRecoverySession(createApi({ getSession }), {
        href: "https://www.saminest.com/?auth=reset",
        replaceUrl: vi.fn(),
        wait
      })
    ).resolves.toMatchObject({
      success: true,
      data: { ready: true, method: "retry" }
    });
    expect(wait).toHaveBeenCalledWith(500);
    expect(getSession).toHaveBeenCalledTimes(2);
  });
});

describe("Auth listener coordinator", () => {
  it("binds once and ignores duplicate ready/bind calls", () => {
    const onAuthStateChange = vi.fn(() => ok({ unsubscribe: vi.fn() }));
    const coordinator = createAuthSessionCoordinator(createApi({ onAuthStateChange }));
    const effects = createEffects();
    const context = {
      effects,
      getHref: () => "https://www.saminest.com/#home",
      getCurrentHash: () => "#home",
      onSignedIn: vi.fn(),
      onInitialSession: vi.fn()
    };

    expect(coordinator.bind(context)).toMatchObject({ success: true, data: { bound: true } });
    expect(coordinator.bind(context)).toMatchObject({ success: true, data: { bound: false } });
    expect(onAuthStateChange).toHaveBeenCalledOnce();
    expect(coordinator.diagnostics().listenerBindings).toBe(1);
  });

  it("deduplicates submit events and all listener event classes", async () => {
    let listener: AuthStateChangeCallback | undefined;
    const api = createApi({
      onAuthStateChange: vi.fn((callback) => {
        listener = callback;
        return ok({ unsubscribe: vi.fn() });
      })
    });
    const coordinator = createAuthSessionCoordinator(api);
    const effects = createEffects();
    const signedIn = vi.fn();
    const initialSession = vi.fn();
    let href = "https://www.saminest.com/#home";
    coordinator.bind({
      effects,
      getHref: () => href,
      getCurrentHash: () => "#home",
      onSignedIn: signedIn,
      onInitialSession: initialSession
    });
    const user: AuthUser = { id: "user-1" };

    await coordinator.runExplicit("login", async () => {
      await listener?.("SIGNED_IN", { user });
      return null;
    });
    coordinator.markAuthenticated(user.id);
    await listener?.("SIGNED_IN", { user });
    await listener?.("INITIAL_SESSION", { user });
    await listener?.("TOKEN_REFRESHED", { user });
    await listener?.("USER_UPDATED", { user });
    expect(signedIn).not.toHaveBeenCalled();
    expect(initialSession).not.toHaveBeenCalled();
    expect(effects.onTokenRefreshed).toHaveBeenCalledOnce();
    expect(effects.onUserUpdated).toHaveBeenCalledOnce();

    href = "https://www.saminest.com/?auth=reset";
    await listener?.("PASSWORD_RECOVERY", { user });
    await listener?.("PASSWORD_RECOVERY", { user });
    expect(effects.onRecovery).toHaveBeenCalledOnce();

    href = "https://www.saminest.com/#home";
    coordinator.markAuthenticated(user.id);
    await listener?.("SIGNED_OUT", null);
    await listener?.("SIGNED_OUT", null);
    expect(effects.onSignedOut).toHaveBeenCalledOnce();
    expect(effects.onSignedOut).toHaveBeenCalledWith({ navigate: true });
    await listener?.("INITIAL_SESSION", { user });
    expect(initialSession).toHaveBeenCalledOnce();
  });

  it("does not navigate for SIGNED_OUT while an auth page is active", async () => {
    let listener: AuthStateChangeCallback | undefined;
    const coordinator = createAuthSessionCoordinator(
      createApi({
        onAuthStateChange: vi.fn((callback) => {
          listener = callback;
          return ok({ unsubscribe: vi.fn() });
        })
      })
    );
    const effects = createEffects();
    coordinator.bind({
      effects,
      getHref: () => "https://www.saminest.com/#auth/login",
      getCurrentHash: () => "#auth/login",
      onSignedIn: vi.fn(),
      onInitialSession: vi.fn()
    });
    await listener?.("SIGNED_OUT", null);
    expect(effects.onSignedOut).toHaveBeenCalledWith({ navigate: false });
  });
});
