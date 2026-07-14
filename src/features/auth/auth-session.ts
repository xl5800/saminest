import { fail, ok, type Result } from "../../services/result";
import type { AuthApi } from "../../services/api/auth-api";
import type {
  AuthChangeEvent,
  AuthEffects,
  AuthSubscription,
  AuthUser
} from "../../types/auth";

export interface RecoverySessionOptions {
  href: string;
  replaceUrl(url: string): void;
  wait?: (milliseconds: number) => Promise<void>;
}

export interface RecoverySessionState {
  ready: boolean;
  method: "existing" | "pkce" | "hash" | "retry" | "none";
}

export interface AuthListenerContext {
  effects: AuthEffects;
  getHref(): string;
  getCurrentHash(): string;
  onSignedIn(user: AuthUser): void | Promise<void>;
  onInitialSession(user: AuthUser): void | Promise<void>;
}

export interface AuthSessionCoordinator {
  bind(context: AuthListenerContext): Result<{ bound: boolean }>;
  runExplicit<T>(key: string, task: () => Promise<T>): Promise<T>;
  expectSignedOut(): void;
  markAuthenticated(userId: string): void;
  markSignedOut(): void;
  isActiveUser(userId: string): boolean;
  diagnostics(): {
    listenerBindings: number;
    explicitOperations: number;
    activeUserId: string;
  };
}

const DEFAULT_WAIT = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function urlFrom(href: string): URL {
  return new URL(href, "https://www.saminest.com/");
}

export function recoveryParams(href: string): URLSearchParams {
  const url = urlFrom(href);
  const result = new URLSearchParams(url.search);
  const hash = url.hash.replace(/^#/, "");
  const queryIndex = hash.indexOf("?");
  const hashQuery = queryIndex >= 0 ? hash.slice(queryIndex + 1) : hash;
  const routeFreeHash = hashQuery.replace(/^auth\/reset[?&]?/, "");

  for (const [key, value] of new URLSearchParams(routeFreeHash)) {
    if (!result.has(key)) result.set(key, value);
  }
  return result;
}

export function isPasswordRecoveryUrl(href: string): boolean {
  const url = urlFrom(href);
  const hash = url.hash.replace(/^#\/?/, "");
  const params = recoveryParams(href);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  return (
    pathname.endsWith("/reset-password") ||
    hash.startsWith("auth/reset") ||
    params.get("type") === "recovery" ||
    params.get("auth") === "reset"
  );
}

function urlAfterCodeExchange(href: string): string {
  const url = urlFrom(href);
  url.searchParams.delete("code");
  if (!isPasswordRecoveryUrl(url.toString())) {
    url.searchParams.set("auth", "reset");
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export function urlAfterPasswordReset(href: string): string {
  const url = urlFrom(href);
  for (const key of [
    "auth",
    "code",
    "type",
    "access_token",
    "refresh_token",
    "expires_at",
    "expires_in",
    "token_type"
  ]) {
    url.searchParams.delete(key);
  }

  if (url.pathname.replace(/\/+$/, "").endsWith("/reset-password")) {
    url.pathname = url.pathname.replace(/reset-password\/?$/, "") || "/";
  }

  const hash = url.hash.replace(/^#/, "");
  if (
    hash.startsWith("auth/reset") ||
    /(^|&)type=recovery(&|$)/.test(hash) ||
    /(^|&)access_token=/.test(hash)
  ) {
    url.hash = "";
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

export async function ensureRecoverySession(
  api: AuthApi,
  options: RecoverySessionOptions
): Promise<Result<RecoverySessionState>> {
  const params = recoveryParams(options.href);
  const code = params.get("code");
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  let recoveryFailure: Result<RecoverySessionState> | null = null;

  if (code) {
    const exchanged = await api.exchangeRecoveryCode(code);
    if (exchanged.success && exchanged.data?.user) {
      options.replaceUrl(urlAfterCodeExchange(options.href));
      return ok({ ready: true, method: "pkce" });
    }
    recoveryFailure = exchanged.success
      ? fail("AUTH_RECOVERY_INVALID", "账号状态已过期，请重新操作一次。")
      : exchanged;
  }

  if (accessToken && refreshToken) {
    const restored = await api.setRecoverySession({
      accessToken,
      refreshToken
    });
    if (restored.success && restored.data?.user) {
      return ok({ ready: true, method: "hash" });
    }
    recoveryFailure = restored.success
      ? fail("AUTH_RECOVERY_INVALID", "账号状态已过期，请重新操作一次。")
      : restored;
  }

  const current = await api.getSession();
  if (current.success && current.data?.user) {
    if (code) options.replaceUrl(urlAfterCodeExchange(options.href));
    return ok({ ready: true, method: "existing" });
  }

  await (options.wait || DEFAULT_WAIT)(500);
  const retried = await api.getSession();
  if (!retried.success) return recoveryFailure || retried;
  if (retried.data?.user && code) {
    options.replaceUrl(urlAfterCodeExchange(options.href));
  }
  if (!retried.data?.user && recoveryFailure) return recoveryFailure;
  return ok({
    ready: Boolean(retried.data?.user),
    method: retried.data?.user ? "retry" : "none"
  });
}

export function createAuthSessionCoordinator(
  api: AuthApi
): AuthSessionCoordinator {
  let listenerContext: AuthListenerContext | null = null;
  let subscription: AuthSubscription | null = null;
  let listenerBindings = 0;
  let explicitOperations = 0;
  let activeUserId = "";
  let ignoreNextSignedOut = false;
  let recoveryHandled = false;
  let signedOutHandled = false;
  const inFlight = new Map<string, Promise<unknown>>();

  const handleEvent = async (
    event: AuthChangeEvent,
    session: { user: AuthUser } | null
  ) => {
    const context = listenerContext;
    if (!context) return;

    if (event === "PASSWORD_RECOVERY") {
      if (!recoveryHandled) {
        recoveryHandled = true;
        await context.effects.onRecovery();
      }
      return;
    }

    if (event === "SIGNED_OUT") {
      activeUserId = "";
      recoveryHandled = false;
      if (explicitOperations > 0 || ignoreNextSignedOut) {
        ignoreNextSignedOut = false;
        return;
      }
      if (signedOutHandled) return;
      signedOutHandled = true;
      await context.effects.onSignedOut({
        navigate: !context.getCurrentHash().startsWith("#auth")
      });
      return;
    }

    if (
      isPasswordRecoveryUrl(context.getHref()) &&
      (event === "SIGNED_IN" || event === "INITIAL_SESSION")
    ) {
      if (!recoveryHandled) {
        recoveryHandled = true;
        await context.effects.onRecovery();
      }
      return;
    }

    if (event === "SIGNED_IN" && session?.user) {
      signedOutHandled = false;
      if (
        explicitOperations > 0 ||
        activeUserId === session.user.id
      ) {
        return;
      }
      await context.onSignedIn(session.user);
      return;
    }

    if (event === "INITIAL_SESSION" && session?.user) {
      if (explicitOperations > 0 || ignoreNextSignedOut) {
        return;
      }
      if (activeUserId === session.user.id) return;
      await context.onInitialSession(session.user);
      return;
    }

    if (event === "TOKEN_REFRESHED" && session?.user) {
      await context.effects.onTokenRefreshed(session.user);
      return;
    }

    if (event === "USER_UPDATED" && session?.user) {
      await context.effects.onUserUpdated(session.user);
    }
  };

  return {
    bind(context) {
      listenerContext = context;
      if (subscription) return ok({ bound: false });
      const result = api.onAuthStateChange(handleEvent);
      if (!result.success) return result;
      subscription = result.data;
      listenerBindings += 1;
      return ok({ bound: true });
    },

    async runExplicit<T>(key: string, task: () => Promise<T>): Promise<T> {
      const current = inFlight.get(key) as Promise<T> | undefined;
      if (current) return current;
      const promise = (async () => {
        explicitOperations += 1;
        try {
          return await task();
        } finally {
          explicitOperations -= 1;
          inFlight.delete(key);
        }
      })();
      inFlight.set(key, promise);
      return promise;
    },

    expectSignedOut() {
      ignoreNextSignedOut = true;
    },

    markAuthenticated(userId) {
      activeUserId = userId;
      signedOutHandled = false;
      recoveryHandled = false;
      ignoreNextSignedOut = false;
    },

    markSignedOut() {
      activeUserId = "";
      signedOutHandled = true;
      recoveryHandled = false;
      ignoreNextSignedOut = false;
    },

    isActiveUser(userId) {
      return Boolean(userId && activeUserId === userId);
    },

    diagnostics() {
      return { listenerBindings, explicitOperations, activeUserId };
    }
  };
}
