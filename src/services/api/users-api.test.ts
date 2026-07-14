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
});
