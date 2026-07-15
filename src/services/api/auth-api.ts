import { fail, ok, type Result } from "../result";
import {
  getSupabaseClient,
  type SupabaseClient
} from "../supabase/client";
import type {
  AuthResponseData,
  AuthSession,
  AuthStateChangeCallback,
  AuthSubscription,
  AuthUser
} from "../../types/auth";
import {
  authClientUnavailableError,
  normalizeAuthError
} from "../../features/auth/auth-errors";
import { isAllowedAvatarMetadataValue } from "../../utils/avatar";

interface SupabaseResponse<T> {
  data: T;
  error: unknown;
}

interface SupabaseAuthPort {
  signInWithPassword(input: {
    email: string;
    password: string;
  }): Promise<SupabaseResponse<AuthResponseData>>;
  signUp(input: {
    email: string;
    password: string;
    options: {
      data: { display_name: string };
      emailRedirectTo: string;
    };
  }): Promise<SupabaseResponse<AuthResponseData>>;
  getSession(): Promise<SupabaseResponse<{ session: AuthSession | null }>>;
  resetPasswordForEmail(
    email: string,
    options: { redirectTo: string }
  ): Promise<SupabaseResponse<Record<string, never>>>;
  exchangeCodeForSession(
    code: string
  ): Promise<SupabaseResponse<{ session: AuthSession | null }>>;
  setSession(tokens: {
    access_token: string;
    refresh_token: string;
  }): Promise<SupabaseResponse<{ session: AuthSession | null }>>;
  updateUser(input: {
    password?: string;
    data?: Record<string, unknown>;
  }): Promise<SupabaseResponse<{ user: AuthUser | null }>>;
  signOut(): Promise<{ error: unknown }>;
  onAuthStateChange(callback: AuthStateChangeCallback): {
    data: { subscription: AuthSubscription };
  };
}

interface SupabaseAuthClient extends SupabaseClient {
  auth: SupabaseAuthPort;
}

export type AuthClientGetter = () => SupabaseClient | null;

export interface AuthApi {
  signIn(email: string, password: string): Promise<Result<AuthResponseData>>;
  signUp(input: {
    email: string;
    password: string;
    displayName: string;
    emailRedirectTo: string;
  }): Promise<Result<AuthResponseData>>;
  getSession(): Promise<Result<AuthSession | null>>;
  sendPasswordReset(
    email: string,
    redirectTo: string
  ): Promise<Result<null>>;
  exchangeRecoveryCode(code: string): Promise<Result<AuthSession | null>>;
  setRecoverySession(tokens: {
    accessToken: string;
    refreshToken: string;
  }): Promise<Result<AuthSession | null>>;
  updatePassword(password: string): Promise<Result<AuthUser | null>>;
  updateMetadata(
    data: Record<string, unknown>
  ): Promise<Result<AuthUser | null>>;
  signOut(): Promise<Result<null>>;
  onAuthStateChange(
    callback: AuthStateChangeCallback
  ): Result<AuthSubscription>;
}

function failed<T>(error: unknown): Result<T> {
  const normalized = normalizeAuthError(error);
  return fail(normalized.code, normalized.message);
}

async function execute<T>(
  request: () => Promise<SupabaseResponse<T>>
): Promise<Result<T>> {
  try {
    const response = await request();
    return response.error ? failed(response.error) : ok(response.data);
  } catch (error) {
    return failed(error);
  }
}

export function createAuthApi(
  getClient: AuthClientGetter = getSupabaseClient
): AuthApi {
  const auth = (): Result<SupabaseAuthPort> => {
    try {
      const client = getClient() as SupabaseAuthClient | null;
      if (client?.auth) return ok(client.auth);
      const error = authClientUnavailableError();
      return fail(error.code, error.message);
    } catch (error) {
      return failed(error);
    }
  };

  return {
    async signIn(email, password) {
      const port = auth();
      if (!port.success) return port;
      return execute(() =>
        port.data.signInWithPassword({ email, password })
      );
    },

    async signUp(input) {
      const port = auth();
      if (!port.success) return port;
      return execute(() =>
        port.data.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: { display_name: input.displayName },
            emailRedirectTo: input.emailRedirectTo
          }
        })
      );
    },

    async getSession() {
      const port = auth();
      if (!port.success) return port;
      const response = await execute(() => port.data.getSession());
      return response.success ? ok(response.data.session) : response;
    },

    async sendPasswordReset(email, redirectTo) {
      const port = auth();
      if (!port.success) return port;
      const response = await execute(() =>
        port.data.resetPasswordForEmail(email, { redirectTo })
      );
      return response.success ? ok(null) : response;
    },

    async exchangeRecoveryCode(code) {
      const port = auth();
      if (!port.success) return port;
      const response = await execute(() =>
        port.data.exchangeCodeForSession(code)
      );
      return response.success ? ok(response.data.session) : response;
    },

    async setRecoverySession(tokens) {
      const port = auth();
      if (!port.success) return port;
      const response = await execute(() =>
        port.data.setSession({
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken
        })
      );
      return response.success ? ok(response.data.session) : response;
    },

    async updatePassword(password) {
      const port = auth();
      if (!port.success) return port;
      const response = await execute(() => port.data.updateUser({ password }));
      return response.success ? ok(response.data.user) : response;
    },

    async updateMetadata(data) {
      if (
        Object.prototype.hasOwnProperty.call(data, "avatar_url")
        && !isAllowedAvatarMetadataValue(data.avatar_url)
      ) {
        return fail(
          "AUTH_AVATAR_METADATA_UNSAFE",
          "头像必须先上传后再保存，请重新选择图片。"
        );
      }
      const port = auth();
      if (!port.success) return port;
      const response = await execute(() => port.data.updateUser({ data }));
      return response.success ? ok(response.data.user) : response;
    },

    async signOut() {
      const port = auth();
      if (!port.success) return port;
      return execute(async () => {
        const response = await port.data.signOut();
        return { data: null, error: response.error };
      });
    },

    onAuthStateChange(callback) {
      const port = auth();
      if (!port.success) return port;
      try {
        return ok(port.data.onAuthStateChange(callback).data.subscription);
      } catch (error) {
        return failed(error);
      }
    }
  };
}

export const authApi = createAuthApi();
