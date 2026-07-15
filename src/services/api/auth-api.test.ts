import { describe, expect, it, vi } from "vitest";
import type { AuthStateChangeCallback } from "../../types/auth";
import type { SupabaseClient } from "../supabase/client";
import { createAuthApi } from "./auth-api";

function createHarness() {
  let listener: AuthStateChangeCallback | undefined;
  const subscription = { unsubscribe: vi.fn() };
  const auth = {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    getSession: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    setSession: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn((callback: AuthStateChangeCallback) => {
      listener = callback;
      return { data: { subscription } };
    })
  };
  const client = { auth } as unknown as SupabaseClient;
  return { auth, client, subscription, getListener: () => listener };
}

describe("Auth API", () => {
  it("returns a stable failure when the client is unavailable", async () => {
    const api = createAuthApi(() => null);
    await expect(api.signIn("person@example.com", "secret")).resolves.toEqual({
      success: false,
      data: null,
      error: {
        code: "AUTH_CLIENT_UNAVAILABLE",
        message: "账号功能暂时不可用，请稍后再试。"
      }
    });
  });

  it("contains client getter and getSession failures", async () => {
    const unavailable = createAuthApi(() => {
      throw new Error("private client detail");
    });
    await expect(unavailable.getSession()).resolves.toEqual({
      success: false,
      data: null,
      error: {
        code: "AUTH_UNAVAILABLE",
        message: "账号功能暂时不可用，请稍后再试。"
      }
    });

    const harness = createHarness();
    const api = createAuthApi(() => harness.client);
    harness.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Auth session missing", raw: true }
    });
    await expect(api.getSession()).resolves.toMatchObject({
      success: false,
      error: { code: "AUTH_SESSION_MISSING" }
    });
  });

  it("signs in and maps raw provider errors to Result", async () => {
    const harness = createHarness();
    const api = createAuthApi(() => harness.client);
    const user = { id: "user-1", email: "person@example.com" };
    harness.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user, session: { user } },
      error: null
    });
    await expect(api.signIn("person@example.com", "secret")).resolves.toEqual({
      success: true,
      data: { user, session: { user } },
      error: null
    });
    expect(harness.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "secret"
    });

    harness.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials", provider: "raw" }
    });
    const failed = await api.signIn("person@example.com", "wrong");
    expect(failed).toEqual({
      success: false,
      data: null,
      error: {
        code: "AUTH_INVALID_CREDENTIALS",
        message: "邮箱或密码不正确，请重新输入。"
      }
    });
    expect(failed).not.toHaveProperty("provider");

    harness.auth.signInWithPassword.mockRejectedValueOnce(
      new Error("Invalid login credentials")
    );
    await expect(api.signIn("person@example.com", "wrong")).resolves.toMatchObject({
      success: false,
      error: { code: "AUTH_INVALID_CREDENTIALS" }
    });
  });

  it("uses the existing Supabase Auth parameters", async () => {
    const harness = createHarness();
    const api = createAuthApi(() => harness.client);
    const user = { id: "user-1" };
    harness.auth.signUp.mockResolvedValue({
      data: { user, session: null },
      error: null
    });
    harness.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    harness.auth.exchangeCodeForSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    harness.auth.setSession.mockResolvedValue({
      data: { session: { user } },
      error: null
    });
    harness.auth.updateUser.mockResolvedValue({ data: { user }, error: null });
    harness.auth.signOut.mockResolvedValue({ error: null });

    await api.signUp({
      email: "person@example.com",
      password: "secret",
      displayName: "Person",
      emailRedirectTo: "https://www.saminest.com/#auth/login"
    });
    expect(harness.auth.signUp).toHaveBeenCalledWith({
      email: "person@example.com",
      password: "secret",
      options: {
        data: { display_name: "Person" },
        emailRedirectTo: "https://www.saminest.com/#auth/login"
      }
    });

    await api.sendPasswordReset("person@example.com", "https://www.saminest.com/?auth=reset");
    await api.exchangeRecoveryCode("pkce-code");
    await api.setRecoverySession({ accessToken: "access", refreshToken: "refresh" });
    await api.updatePassword("new-secret");
    await api.updateMetadata({
      display_name: "Person",
      avatar_url: "https://cdn.example/avatar.jpg"
    });
    await api.signOut();

    expect(harness.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      "person@example.com",
      { redirectTo: "https://www.saminest.com/?auth=reset" }
    );
    expect(harness.auth.exchangeCodeForSession).toHaveBeenCalledWith("pkce-code");
    expect(harness.auth.setSession).toHaveBeenCalledWith({
      access_token: "access",
      refresh_token: "refresh"
    });
    expect(harness.auth.updateUser).toHaveBeenCalledWith({ password: "new-secret" });
    expect(harness.auth.updateUser).toHaveBeenCalledWith({
      data: {
        display_name: "Person",
        avatar_url: "https://cdn.example/avatar.jpg"
      }
    });
    expect(harness.auth.signOut).toHaveBeenCalledOnce();
  });

  it("blocks Data URLs, Blob URLs, and oversized avatar metadata", async () => {
    const harness = createHarness();
    const api = createAuthApi(() => harness.client);
    const unsafe = [
      "data:image/jpeg;base64,AAAA",
      "blob:https://www.saminest.com/avatar",
      `https://cdn.example/${"a".repeat(2048)}`
    ];

    for (const avatarUrl of unsafe) {
      await expect(
        api.updateMetadata({ avatar_url: avatarUrl })
      ).resolves.toMatchObject({
        success: false,
        error: { code: "AUTH_AVATAR_METADATA_UNSAFE" }
      });
    }
    expect(harness.auth.updateUser).not.toHaveBeenCalled();
  });

  it("allows clearing legacy avatar metadata", async () => {
    const harness = createHarness();
    const api = createAuthApi(() => harness.client);
    harness.auth.updateUser.mockResolvedValue({
      data: { user: { id: "user-1", user_metadata: { avatar_url: "" } } },
      error: null
    });

    await expect(api.updateMetadata({ avatar_url: "" })).resolves.toMatchObject({
      success: true
    });
    expect(harness.auth.updateUser).toHaveBeenCalledWith({
      data: { avatar_url: "" }
    });
  });

  it("registers the provider listener through Result", () => {
    const harness = createHarness();
    const api = createAuthApi(() => harness.client);
    const callback = vi.fn();
    expect(api.onAuthStateChange(callback)).toEqual({
      success: true,
      data: harness.subscription,
      error: null
    });
    expect(harness.auth.onAuthStateChange).toHaveBeenCalledOnce();
    expect(harness.getListener()).toBe(callback);
  });
});
