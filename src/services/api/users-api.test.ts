import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "../supabase/client";
import { createUsersApi } from "./users-api";

describe("Users API", () => {
  it("upserts a profile through the profiles table", async () => {
    const profile = {
      id: "user-1",
      email: "person@example.com",
      display_name: "Person",
      role: "user"
    };
    const single = vi.fn().mockResolvedValue({ data: profile, error: null });
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ upsert }));
    const api = createUsersApi(() => ({ from } as unknown as SupabaseClient));

    await expect(api.upsertProfile(profile)).resolves.toEqual({
      success: true,
      data: profile,
      error: null
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(upsert).toHaveBeenCalledWith(profile, { onConflict: "id" });
    expect(select).toHaveBeenCalledOnce();
    expect(single).toHaveBeenCalledOnce();
  });

  it("normalizes a profile error without leaking it", async () => {
    const raw = { message: "Database unavailable", details: "private" };
    const single = vi.fn().mockResolvedValue({ data: null, error: raw });
    const client = {
      from: vi.fn(() => ({
        upsert: vi.fn(() => ({ select: vi.fn(() => ({ single })) }))
      }))
    } as unknown as SupabaseClient;
    const api = createUsersApi(() => client);
    const result = await api.upsertProfile({
      id: "user-1",
      email: "person@example.com",
      display_name: "Person",
      role: "user"
    });
    expect(result).toEqual({
      success: false,
      data: null,
      error: { code: "PROFILE_UPSERT_FAILED", message: "用户资料暂时无法同步。" }
    });
    expect(result).not.toHaveProperty("details");
  });

  it("updates only the profile avatar through the existing client", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "user-1" },
      error: null
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const api = createUsersApi(() => ({ from } as unknown as SupabaseClient));

    await expect(
      api.updateAvatar("user-1", "https://cdn.example/avatar.jpg")
    ).resolves.toEqual({ success: true, data: null, error: null });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledWith({
      avatar_url: "https://cdn.example/avatar.jpg"
    });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(select).toHaveBeenCalledWith("id");
    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it("updates a display name for the explicitly requested profile", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "user-a" },
      error: null
    });
    const select = vi.fn(() => ({ maybeSingle }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const api = createUsersApi(() => ({ from } as unknown as SupabaseClient));

    await expect(
      api.updateDisplayName("user-a", "User A")
    ).resolves.toEqual({
      success: true,
      data: { userId: "user-a" },
      error: null
    });
    expect(from).toHaveBeenCalledWith("profiles");
    expect(update).toHaveBeenCalledWith({ display_name: "User A" });
    expect(eq).toHaveBeenCalledWith("id", "user-a");
    expect(select).toHaveBeenCalledWith("id");
    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it("normalizes avatar update failures without leaking provider details", async () => {
    const raw = { message: "Database unavailable", details: "private" };
    const api = createUsersApi(() => ({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: raw })
            }))
          }))
        }))
      }))
    } as unknown as SupabaseClient));

    const result = await api.updateAvatar(
      "user-1",
      "https://cdn.example/avatar.jpg"
    );
    expect(result).toEqual({
      success: false,
      data: null,
      error: {
        code: "PROFILE_AVATAR_UPDATE_FAILED",
        message: "头像资料暂时无法同步，请稍后再试。"
      }
    });
    expect(result).not.toHaveProperty("details");
  });

  it("contains thrown avatar update failures", async () => {
    const api = createUsersApi(() => ({
      from: vi.fn(() => {
        throw new Error("private failure");
      })
    } as unknown as SupabaseClient));

    await expect(
      api.updateAvatar("user-1", "https://cdn.example/avatar.jpg")
    ).resolves.toMatchObject({
      success: false,
      error: { code: "PROFILE_AVATAR_UPDATE_FAILED" }
    });
  });

  it("fails when RLS or a missing row updates nothing", async () => {
    const api = createUsersApi(() => ({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }))
          }))
        }))
      }))
    } as unknown as SupabaseClient));

    await expect(api.updateAvatar(
      "missing-user",
      "https://cdn.example/avatar.jpg"
    )).resolves.toMatchObject({
      success: false,
      error: { code: "PROFILE_AVATAR_UPDATE_MISSING" }
    });
  });

  it("rejects Base64 avatars before querying profiles", async () => {
    const from = vi.fn();
    const api = createUsersApi(() => ({ from } as unknown as SupabaseClient));

    await expect(api.updateAvatar(
      "user-1",
      "data:image/jpeg;base64,AAAA"
    )).resolves.toMatchObject({
      success: false,
      error: { code: "PROFILE_AVATAR_URL_UNSAFE" }
    });
    expect(from).not.toHaveBeenCalled();
  });
});
