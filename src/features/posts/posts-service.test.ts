import { describe, expect, it, vi } from "vitest";
import type { PostsApi } from "../../services/api/posts-api";
import type { ProfilesReadApi } from "../../services/api/profiles-read-api";
import { fail, ok } from "../../services/result";
import type {
  ListingMappingContext,
  SupabaseListingRow
} from "../../types/listing";
import { createPostsService } from "./posts-service";

const context: ListingMappingContext = {
  currentUserId: "user-1",
  fallbackImages: {
    rent: "fallback-rent",
    wanted: "fallback-wanted",
    used: "fallback-used"
  },
  now: Date.parse("2026-07-14T12:00:00Z")
};

function row(
  id: string,
  userId: string,
  createdAt: string,
  overrides: Partial<SupabaseListingRow> = {}
): SupabaseListingRow {
  return {
    id,
    user_id: userId,
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
    updated_at: createdAt,
    ...overrides
  };
}

function createApi(overrides: Partial<PostsApi> = {}): PostsApi {
  return {
    listListings: vi.fn().mockResolvedValue(ok([])),
    getListingById: vi.fn().mockResolvedValue(ok(null)),
    listListingImages: vi.fn().mockResolvedValue(ok([])),
    ...overrides
  };
}

function createProfileApi(
  overrides: Partial<ProfilesReadApi> = {}
): ProfilesReadApi {
  return {
    listProfiles: vi.fn().mockResolvedValue(ok([])),
    ...overrides
  };
}

describe("Posts service", () => {
  it("returns an empty list without enrichment queries", async () => {
    const api = createApi();
    const profileApi = createProfileApi();
    const service = createPostsService(api, profileApi);

    await expect(service.loadListings(context)).resolves.toEqual({
      success: true,
      data: [],
      error: null
    });
    expect(profileApi.listProfiles).not.toHaveBeenCalled();
    expect(api.listListingImages).not.toHaveBeenCalled();
  });

  it("preserves the database row order and deduplicates enrichment ids", async () => {
    const newer = row("newer", "owner", "2026-07-14T11:00:00Z");
    const older = row("older", "owner", "2026-07-13T11:00:00Z");
    const api = createApi({
      listListings: vi.fn().mockResolvedValue(ok([newer, older])),
      listListingImages: vi.fn().mockResolvedValue(
        ok([
          { listing_id: "newer", image_url: "new-1.jpg", sort_order: 0 },
          { listing_id: "newer", image_url: "new-2.jpg", sort_order: 1 }
        ])
      )
    });
    const profileApi = createProfileApi({
      listProfiles: vi.fn().mockResolvedValue(
        ok([
          {
            id: "owner",
            email: "owner@example.com",
            display_name: "Owner",
            role: "user",
            avatar_url: "avatar.jpg"
          }
        ])
      )
    });
    const result = await createPostsService(api, profileApi).loadListings(
      context
    );

    expect(result.success && result.data.map((item) => item.id)).toEqual([
      "newer",
      "older"
    ]);
    expect(profileApi.listProfiles).toHaveBeenCalledWith(["owner"]);
    expect(api.listListingImages).toHaveBeenCalledWith(["newer", "older"]);
    expect(result.success && result.data[0].images).toEqual([
      "new-1.jpg",
      "new-2.jpg"
    ]);
    expect(result.success && result.data[0].owner).toBe("Owner");
  });

  it("keeps profile and image query failures as enrichment fallbacks", async () => {
    const source = row("one", "missing", "2026-07-14T11:00:00Z", {
      image_url: "legacy.jpg"
    });
    const api = createApi({
      listListings: vi.fn().mockResolvedValue(ok([source])),
      listListingImages: vi
        .fn()
        .mockResolvedValue(
          fail("LISTING_IMAGES_READ_FAILED", "帖子图片暂时无法加载。")
        )
    });
    const profileApi = createProfileApi({
      listProfiles: vi
        .fn()
        .mockResolvedValue(
          fail("PROFILES_READ_FAILED", "发布者资料暂时无法加载。")
        )
    });
    const result = await createPostsService(api, profileApi).loadListings(
      context
    );

    expect(result).toMatchObject({
      success: true,
      data: [
        {
          id: "one",
          owner: "发布者",
          images: ["legacy.jpg"],
          image: "legacy.jpg"
        }
      ]
    });
  });

  it("reads and maps one listing", async () => {
    const source = row("one", "owner", "2026-07-14T11:00:00Z");
    const api = createApi({
      getListingById: vi.fn().mockResolvedValue(ok(source))
    });
    const result = await createPostsService(
      api,
      createProfileApi()
    ).fetchListingById("one", context);

    expect(result).toMatchObject({
      success: true,
      data: { id: "one", type: "rent", status: "active" }
    });
  });

  it("returns success with null when one listing does not exist", async () => {
    const api = createApi({
      getListingById: vi.fn().mockResolvedValue(ok(null))
    });
    await expect(
      createPostsService(api, createProfileApi()).fetchListingById(
        "missing",
        context
      )
    ).resolves.toEqual({ success: true, data: null, error: null });
  });

  it("propagates stable base listing query failures", async () => {
    const failure = fail("LISTINGS_READ_FAILED", "帖子列表暂时无法加载。");
    const api = createApi({
      listListings: vi.fn().mockResolvedValue(failure)
    });
    await expect(
      createPostsService(api, createProfileApi()).loadListings(context)
    ).resolves.toEqual(failure);
  });

  it("deduplicates ids for direct profile and image map calls", async () => {
    const api = createApi();
    const profileApi = createProfileApi();
    const service = createPostsService(api, profileApi);

    await service.fetchProfilesMap(["one", "", "one", "two"]);
    await service.fetchListingImagesMap(["a", "a", "", "b"]);

    expect(profileApi.listProfiles).toHaveBeenCalledWith(["one", "two"]);
    expect(api.listListingImages).toHaveBeenCalledWith(["a", "b"]);
  });
});
