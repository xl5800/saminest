import { describe, expect, it } from "vitest";
import type {
  ListingMappingContext,
  SupabaseListingRow
} from "../../types/listing";
import {
  dbListingToUi,
  formatDbPrice,
  listingImagesToMap,
  mapStatusFromDb,
  mapTypeFromDb,
  normalizeImages
} from "./post-mappers";

const NOW = Date.parse("2026-07-14T12:00:00.000Z");

const context: ListingMappingContext = {
  currentUserId: "user-1",
  fallbackImages: {
    rent: "fallback-rent",
    wanted: "fallback-wanted",
    used: "fallback-used"
  },
  now: NOW
};

function row(overrides: Partial<SupabaseListingRow> = {}): SupabaseListingRow {
  return {
    id: "listing-1",
    user_id: "user-1",
    type: "rental",
    status: "approved",
    title: "Rockville 单间",
    description: "房间介绍",
    price: 850,
    area: "Rockville, MD",
    category: "单间",
    move_in: "2026-08-01",
    nearby: "近地铁，包水电",
    image_url: null,
    contact: "站内消息",
    reported_count: 2,
    created_at: "2026-07-14T10:00:00.000Z",
    updated_at: "2026-07-14T11:00:00.000Z",
    ...overrides
  };
}

describe("post mappers", () => {
  it("normalizes a single image_url and JSON image arrays", () => {
    expect(normalizeImages("https://img/one.jpg")).toEqual([
      "https://img/one.jpg"
    ]);
    expect(normalizeImages('["a.jpg","b.jpg",""]')).toEqual([
      "a.jpg",
      "b.jpg"
    ]);
  });

  it("keeps the legacy fallback for invalid image JSON", () => {
    expect(normalizeImages("[invalid")).toEqual([]);
    expect(normalizeImages('{"image":"a.jpg"}')).toEqual([
      '{"image":"a.jpg"}'
    ]);
  });

  it("maps database status values exactly", () => {
    expect(mapStatusFromDb("approved")).toBe("active");
    expect(mapStatusFromDb("expired")).toBe("expired");
    expect(mapStatusFromDb("rejected")).toBe("rejected");
    expect(mapStatusFromDb(null)).toBe("pending");
  });

  it("maps wanted before the database type fallback", () => {
    expect(mapTypeFromDb(row({ category: "wanted", type: "rental" }))).toBe(
      "wanted"
    );
    expect(mapTypeFromDb(row({ category: "家具", type: "secondhand" }))).toBe(
      "used"
    );
    expect(mapTypeFromDb(row({ category: "单间", type: "rental" }))).toBe(
      "rent"
    );
  });

  it("preserves the legacy price conversion", () => {
    expect(formatDbPrice(row({ type: "rental", price: "850" }))).toBe(
      "$850/月"
    );
    expect(formatDbPrice(row({ type: "secondhand", price: "12.50" }))).toBe(
      "$12.5"
    );
    expect(formatDbPrice(row({ price: 0 }))).toBe("价格面议");
    expect(formatDbPrice(row({ price: "invalid" }))).toBe("价格面议");
  });

  it("maps profile, tags, dates and the unchanged UI shape", () => {
    const source = row();
    const listing = dbListingToUi({
      row: source,
      profiles: {
        "user-1": {
          id: "user-1",
          email: "owner@example.com",
          display_name: "房东",
          role: "user",
          avatar_url: "avatar.jpg"
        }
      },
      context
    });

    expect(listing).toEqual({
      id: "listing-1",
      type: "rent",
      title: "Rockville 单间",
      price: "$850/月",
      area: "Rockville, MD",
      time: "2小时前",
      tags: ["近地铁", "包水电"],
      detailTags: ["近地铁", "包水电"],
      photoCount: 0,
      image: "fallback-rent",
      images: [],
      desc: "房间介绍",
      roomType: "单间",
      moveIn: "2026-08-01",
      contact: "站内消息",
      owner: "房东",
      ownerAvatar: "avatar.jpg",
      ownerAccount: "user-1",
      mine: true,
      status: "active",
      reportedCount: 2,
      createdAt: Date.parse(source.created_at || "")
    });
    expect(listing).not.toHaveProperty("updatedAt");
  });

  it("uses the email and then publisher fallbacks for missing profiles", () => {
    const emailOwner = dbListingToUi({
      row: row({ user_id: "user-2" }),
      profiles: {
        "user-2": {
          id: "user-2",
          email: "owner@example.com",
          display_name: "",
          role: "user"
        }
      },
      context
    });
    const missingOwner = dbListingToUi({
      row: row({ user_id: "missing" }),
      context
    });

    expect(emailOwner.owner).toBe("owner@example.com");
    expect(emailOwner.ownerAvatar).toBe("");
    expect(missingOwner.owner).toBe("发布者");
    expect(missingOwner.mine).toBe(false);
  });

  it("reads the active user when mapping finishes", () => {
    let activeUserId = "someone-else";
    const dynamicContext: ListingMappingContext = {
      ...context,
      getCurrentUserId: () => activeUserId
    };
    activeUserId = "user-1";

    expect(
      dbListingToUi({ row: row(), context: dynamicContext }).mine
    ).toBe(true);
  });

  it("keeps listing_images first and appends unique image_url entries", () => {
    const listing = dbListingToUi({
      row: row({ image_url: '["legacy.jpg","last.jpg"]' }),
      images: { "listing-1": ["table-1.jpg", "legacy.jpg", "table-2.jpg"] },
      context
    });

    expect(listing.images).toEqual([
      "table-1.jpg",
      "legacy.jpg",
      "table-2.jpg",
      "last.jpg"
    ]);
    expect(listing.image).toBe("table-1.jpg");
    expect(listing.photoCount).toBe(4);
  });

  it("preserves listing image row order supplied by the sorted query", () => {
    expect(
      listingImagesToMap([
        { listing_id: "one", image_url: "first.jpg", sort_order: 0 },
        { listing_id: "two", image_url: "other.jpg", sort_order: 0 },
        { listing_id: "one", image_url: "second.jpg", sort_order: 1 }
      ])
    ).toEqual({
      one: ["first.jpg", "second.jpg"],
      two: ["other.jpg"]
    });
  });
});
