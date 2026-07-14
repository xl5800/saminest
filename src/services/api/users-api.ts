import { normalizeAuthError } from "../../features/auth/auth-errors";
import type { AuthProfile } from "../../types/auth";
import { fail, ok, type Result } from "../result";
import {
  getSupabaseClient,
  type SupabaseClient
} from "../supabase/client";

interface ProfileQuery {
  upsert(
    profile: AuthProfile,
    options: { onConflict: "id" }
  ): {
    select(): {
      single(): Promise<{ data: AuthProfile | null; error: unknown }>;
    };
  };
}

interface ProfilesClient {
  from(table: "profiles"): ProfileQuery;
}

export interface UsersApi {
  upsertProfile(profile: AuthProfile): Promise<Result<AuthProfile>>;
}

export function createUsersApi(
  getClient: () => SupabaseClient | null = getSupabaseClient
): UsersApi {
  return {
    async upsertProfile(profile) {
      try {
        const client = getClient() as ProfilesClient | null;
        if (!client?.from) {
          return fail(
            "AUTH_CLIENT_UNAVAILABLE",
            "账号功能暂时不可用，请稍后再试。"
          );
        }
        const response = await client
          .from("profiles")
          .upsert(profile, { onConflict: "id" })
          .select()
          .single();
        if (response.error) {
          const error = normalizeAuthError(response.error, {
            code: "PROFILE_UPSERT_FAILED",
            message: "用户资料暂时无法同步。"
          });
          return fail(error.code, error.message);
        }
        return ok(response.data || profile);
      } catch (cause) {
        const error = normalizeAuthError(cause, {
          code: "PROFILE_UPSERT_FAILED",
          message: "用户资料暂时无法同步。"
        });
        return fail(error.code, error.message);
      }
    }
  };
}

export const usersApi = createUsersApi();
