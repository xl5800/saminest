import { normalizeAuthError } from "../../features/auth/auth-errors";
import type { AuthProfile } from "../../types/auth";
import { fail, ok, type Result } from "../result";
import {
  getSupabaseClient,
  type SupabaseClient
} from "../supabase/client";
import { isAllowedAvatarMetadataValue } from "../../utils/avatar";

interface ProfileQuery {
  upsert(
    profile: AuthProfile,
    options: { onConflict: "id" }
  ): {
    select(): {
      single(): Promise<{ data: AuthProfile | null; error: unknown }>;
    };
  };
  update(values: { avatar_url: string } | { display_name: string }): {
    eq(
      column: "id",
      value: string
    ): {
      select(columns: "id"): {
        maybeSingle(): Promise<{
          data: { id: string } | null;
          error: unknown;
        }>;
      };
    };
  };
}

interface ProfilesClient {
  from(table: "profiles"): ProfileQuery;
}

export interface UsersApi {
  upsertProfile(profile: AuthProfile): Promise<Result<AuthProfile>>;
  updateAvatar(userId: string, avatarUrl: string): Promise<Result<null>>;
  updateDisplayName(
    userId: string,
    displayName: string
  ): Promise<Result<{ userId: string }>>;
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
    },

    async updateAvatar(userId, avatarUrl) {
      if (!isAllowedAvatarMetadataValue(avatarUrl)) {
        return fail(
          "PROFILE_AVATAR_URL_UNSAFE",
          "头像必须先上传后再保存，请重新选择图片。"
        );
      }
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
          .update({ avatar_url: avatarUrl })
          .eq("id", userId)
          .select("id")
          .maybeSingle();
        if (response.error) {
          const error = normalizeAuthError(response.error, {
            code: "PROFILE_AVATAR_UPDATE_FAILED",
            message: "头像资料暂时无法同步，请稍后再试。"
          });
          return fail(error.code, error.message);
        }
        if (!response.data?.id) {
          return fail(
            "PROFILE_AVATAR_UPDATE_MISSING",
            "头像资料暂时无法同步，请稍后再试。"
          );
        }
        return ok(null);
      } catch (cause) {
        const error = normalizeAuthError(cause, {
          code: "PROFILE_AVATAR_UPDATE_FAILED",
          message: "头像资料暂时无法同步，请稍后再试。"
        });
        return fail(error.code, error.message);
      }
    },

    async updateDisplayName(userId, displayName) {
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
          .update({ display_name: displayName })
          .eq("id", userId)
          .select("id")
          .maybeSingle();
        if (response.error) {
          const error = normalizeAuthError(response.error, {
            code: "PROFILE_DISPLAY_NAME_UPDATE_FAILED",
            message: "用户昵称暂时无法同步，请稍后再试。"
          });
          return fail(error.code, error.message);
        }
        if (!response.data?.id) {
          return fail(
            "PROFILE_DISPLAY_NAME_UPDATE_MISSING",
            "用户昵称暂时无法同步，请稍后再试。"
          );
        }
        return ok({ userId: response.data.id });
      } catch (cause) {
        const error = normalizeAuthError(cause, {
          code: "PROFILE_DISPLAY_NAME_UPDATE_FAILED",
          message: "用户昵称暂时无法同步，请稍后再试。"
        });
        return fail(error.code, error.message);
      }
    }
  };
}

export const usersApi = createUsersApi();
