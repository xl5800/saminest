import { fail, ok, type Result } from "../result";
import {
  getSupabaseClient,
  type SupabaseClient
} from "../supabase/client";
import type { ProfileRow } from "../../types/profile";

interface ProfilesResponse {
  data: ProfileRow[] | null;
  error: unknown;
}

interface ProfilesFilter {
  in(column: "id", ids: string[]): Promise<ProfilesResponse>;
}

interface ProfilesTable {
  select(
    columns:
      | "id,email,display_name,role,avatar_url"
      | "id,email,display_name,role"
  ): ProfilesFilter;
}

interface ProfilesReadClient {
  from(table: "profiles"): ProfilesTable;
}

export type ProfilesClientGetter = () => SupabaseClient | null;

export interface ProfilesReadApi {
  listProfiles(ids: string[]): Promise<Result<ProfileRow[]>>;
}

function mentionsAvatarUrl(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as Record<string, unknown>;
  return /avatar_url/i.test(`${value.message || ""} ${value.details || ""}`);
}

function unavailable<T>(): Result<T> {
  return fail(
    "POSTS_CLIENT_UNAVAILABLE",
    "帖子服务暂时不可用，请稍后再试。"
  );
}

function readFailure<T>(): Result<T> {
  return fail("PROFILES_READ_FAILED", "发布者资料暂时无法加载。");
}

export function createProfilesReadApi(
  getClient: ProfilesClientGetter = getSupabaseClient
): ProfilesReadApi {
  return {
    async listProfiles(ids) {
      try {
        const client = getClient() as ProfilesReadClient | null;
        if (!client?.from) return unavailable();
        let response = await client
          .from("profiles")
          .select("id,email,display_name,role,avatar_url")
          .in("id", ids);

        if (response.error && mentionsAvatarUrl(response.error)) {
          response = await client
            .from("profiles")
            .select("id,email,display_name,role")
            .in("id", ids);
        }
        if (response.error) return readFailure();
        return ok(response.data || []);
      } catch {
        return readFailure();
      }
    }
  };
}

export const profilesReadApi = createProfilesReadApi();
