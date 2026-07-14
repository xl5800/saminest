import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "../supabase/client";
import { createProfilesReadApi } from "./profiles-read-api";

describe("Profiles read API", () => {
  it("reads the existing profile fields for the requested ids", async () => {
    const profiles = [
      {
        id: "user-1",
        email: "owner@example.com",
        display_name: "Owner",
        role: "user",
        avatar_url: "avatar.jpg"
      }
    ];
    const inFilter = vi
      .fn()
      .mockResolvedValue({ data: profiles, error: null });
    const select = vi.fn(() => ({ in: inFilter }));
    const from = vi.fn(() => ({ select }));
    const api = createProfilesReadApi(
      () => ({ from } as unknown as SupabaseClient)
    );

    await expect(api.listProfiles(["user-1"])).resolves.toEqual({
      success: true,
      data: profiles,
      error: null
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(select).toHaveBeenCalledWith(
      "id,email,display_name,role,avatar_url"
    );
    expect(inFilter).toHaveBeenCalledWith("id", ["user-1"]);
  });

  it("retries without avatar_url when the legacy column is unavailable", async () => {
    const fallbackProfiles = [
      {
        id: "user-1",
        email: "owner@example.com",
        display_name: "Owner",
        role: "user"
      }
    ];
    const primaryIn = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "column avatar_url does not exist" }
    });
    const fallbackIn = vi
      .fn()
      .mockResolvedValue({ data: fallbackProfiles, error: null });
    const select = vi.fn((columns: string) => ({
      in: columns.includes("avatar_url") ? primaryIn : fallbackIn
    }));
    const client = {
      from: vi.fn(() => ({ select }))
    } as unknown as SupabaseClient;
    const result = await createProfilesReadApi(() => client).listProfiles([
      "user-1"
    ]);

    expect(result).toEqual({
      success: true,
      data: fallbackProfiles,
      error: null
    });
    expect(select).toHaveBeenNthCalledWith(
      1,
      "id,email,display_name,role,avatar_url"
    );
    expect(select).toHaveBeenNthCalledWith(2, "id,email,display_name,role");
    expect(primaryIn).toHaveBeenCalledWith("id", ["user-1"]);
    expect(fallbackIn).toHaveBeenCalledWith("id", ["user-1"]);
  });

  it("returns a stable Result when the profile query fails", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "permission denied", details: "private" }
          })
        }))
      }))
    } as unknown as SupabaseClient;
    const result = await createProfilesReadApi(() => client).listProfiles([
      "user-1"
    ]);

    expect(result).toEqual({
      success: false,
      data: null,
      error: {
        code: "PROFILES_READ_FAILED",
        message: "发布者资料暂时无法加载。"
      }
    });
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("keeps the legacy fallback limited to object error fields", async () => {
    const select = vi.fn(() => ({
      in: vi.fn().mockResolvedValue({
        data: null,
        error: "avatar_url"
      })
    }));
    const client = {
      from: vi.fn(() => ({ select }))
    } as unknown as SupabaseClient;

    await expect(
      createProfilesReadApi(() => client).listProfiles(["user-1"])
    ).resolves.toMatchObject({
      success: false,
      error: { code: "PROFILES_READ_FAILED" }
    });
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("contains missing clients and thrown profile requests", async () => {
    await expect(
      createProfilesReadApi(() => null).listProfiles(["user-1"])
    ).resolves.toMatchObject({
      success: false,
      error: { code: "POSTS_CLIENT_UNAVAILABLE" }
    });
    const client = {
      from: vi.fn(() => {
        throw new Error("private query failure");
      })
    } as unknown as SupabaseClient;
    await expect(
      createProfilesReadApi(() => client).listProfiles(["user-1"])
    ).resolves.toMatchObject({
      success: false,
      error: { code: "PROFILES_READ_FAILED" }
    });
  });
});
