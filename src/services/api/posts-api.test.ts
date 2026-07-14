import { describe, expect, it, vi } from "vitest";
import type { SupabaseListingRow } from "../../types/listing";
import type { SupabaseClient } from "../supabase/client";
import { createPostsApi } from "./posts-api";

function row(id: string, createdAt: string): SupabaseListingRow {
  return {
    id,
    user_id: `user-${id}`,
    type: "rental",
    status: "approved",
    title: id,
    description: "",
    price: 100,
    area: "DMV",
    category: "单间",
    move_in: null,
    nearby: null,
    image_url: null,
    contact: null,
    reported_count: 0,
    created_at: createdAt,
    updated_at: createdAt
  };
}

describe("Posts API", () => {
  it("reads all listings in created_at descending order", async () => {
    const rows = [
      row("new", "2026-07-14T12:00:00Z"),
      row("old", "2026-07-13T12:00:00Z")
    ];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));
    const api = createPostsApi(() => ({ from } as unknown as SupabaseClient));

    await expect(api.listListings()).resolves.toEqual({
      success: true,
      data: rows,
      error: null
    });
    expect(from).toHaveBeenCalledWith("listings");
    expect(select).toHaveBeenCalledWith("*");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns an empty listing array unchanged", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        }))
      }))
    } as unknown as SupabaseClient;
    await expect(createPostsApi(() => client).listListings()).resolves.toEqual({
      success: true,
      data: [],
      error: null
    });
  });

  it("reads one listing through id and maybeSingle", async () => {
    const found = row("one", "2026-07-14T12:00:00Z");
    const maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: found, error: null });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const api = createPostsApi(() => ({ from } as unknown as SupabaseClient));

    await expect(api.getListingById("one")).resolves.toEqual({
      success: true,
      data: found,
      error: null
    });
    expect(from).toHaveBeenCalledWith("listings");
    expect(select).toHaveBeenCalledWith("*");
    expect(eq).toHaveBeenCalledWith("id", "one");
    expect(maybeSingle).toHaveBeenCalledOnce();
  });

  it("returns success with null when a listing does not exist", async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          }))
        }))
      }))
    } as unknown as SupabaseClient;
    await expect(
      createPostsApi(() => client).getListingById("missing")
    ).resolves.toEqual({ success: true, data: null, error: null });
  });

  it("reads listing images in sort_order ascending order", async () => {
    const rows = [
      { listing_id: "one", image_url: "first.jpg", sort_order: 0 },
      { listing_id: "one", image_url: "second.jpg", sort_order: 1 }
    ];
    const order = vi.fn().mockResolvedValue({ data: rows, error: null });
    const inFilter = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ in: inFilter }));
    const from = vi.fn(() => ({ select }));
    const api = createPostsApi(() => ({ from } as unknown as SupabaseClient));

    await expect(api.listListingImages(["one"])).resolves.toEqual({
      success: true,
      data: rows,
      error: null
    });
    expect(from).toHaveBeenCalledWith("listing_images");
    expect(select).toHaveBeenCalledWith("listing_id,image_url,sort_order");
    expect(inFilter).toHaveBeenCalledWith("listing_id", ["one"]);
    expect(order).toHaveBeenCalledWith("sort_order", { ascending: true });
  });

  it("normalizes provider query failures without exposing raw errors", async () => {
    const raw = { message: "private database detail", details: "secret" };
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          order: vi.fn().mockResolvedValue({ data: null, error: raw })
        }))
      }))
    } as unknown as SupabaseClient;
    const result = await createPostsApi(() => client).listListings();

    expect(result).toEqual({
      success: false,
      data: null,
      error: {
        code: "LISTINGS_READ_FAILED",
        message: "帖子列表暂时无法加载。"
      }
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("contains missing clients and thrown client getters", async () => {
    await expect(createPostsApi(() => null).listListings()).resolves.toEqual({
      success: false,
      data: null,
      error: {
        code: "POSTS_CLIENT_UNAVAILABLE",
        message: "帖子服务暂时不可用，请稍后再试。"
      }
    });
    await expect(
      createPostsApi(() => {
        throw new Error("private getter failure");
      }).getListingById("one")
    ).resolves.toMatchObject({
      success: false,
      error: { code: "POSTS_CLIENT_UNAVAILABLE" }
    });
  });
});
