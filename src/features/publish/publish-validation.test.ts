import { describe, expect, it } from "vitest";
import type { PublishListing } from "../../types/publish";
import { typeLabel } from "../posts/post-mappers";
import {
  listingImages,
  mapStatusToDb,
  mapTypeToDb,
  normalizeDateValue,
  parsePriceNumber,
  uiListingToDb,
  validatePublishInput
} from "./publish-validation";

function listing(overrides: Partial<PublishListing> = {}): PublishListing {
  return {
    id: "listing-1",
    type: "rent",
    title: "Room",
    price: "$1,250/月",
    area: "Rockville",
    status: "active",
    desc: "Clean room",
    roomType: "单间",
    moveIn: "2026-08-01",
    contact: "站内消息",
    tags: ["近地铁", "包水电"],
    photoCount: 0,
    image: "",
    images: [],
    imageDataUrls: [],
    ...overrides
  };
}

describe("publish validation and mapping", () => {
  it("keeps the legacy type and status mappings", () => {
    expect(mapTypeToDb("used")).toBe("secondhand");
    expect(mapTypeToDb("rent")).toBe("rental");
    expect(mapTypeToDb("wanted")).toBe("rental");
    expect(mapStatusToDb("active")).toBe("approved");
    expect(mapStatusToDb("expired")).toBe("expired");
    expect(mapStatusToDb("pending")).toBe("pending");
    expect(mapStatusToDb("")).toBe("pending");
  });

  it("keeps the legacy first-number price parsing", () => {
    expect(parsePriceNumber("$1,250.50/月")).toBe(1250.5);
    expect(parsePriceNumber("预算 900 - 1200")).toBe(900);
    expect(parsePriceNumber("价格面议")).toBe(0);
    expect(parsePriceNumber(null)).toBe(0);
  });

  it("only accepts the legacy yyyy-mm-dd date shape", () => {
    expect(normalizeDateValue(" 2026-08-01 ")).toBe("2026-08-01");
    expect(normalizeDateValue("08/01/2026")).toBeNull();
    expect(normalizeDateValue("")).toBeNull();
  });

  it("collects explicit images in legacy order and removes duplicates", () => {
    expect(
      listingImages(
        listing({
          images: ["one.jpg"],
          imageDataUrls: ["two.jpg", "one.jpg"],
          imageUrls: ["three.jpg"],
          image_url: JSON.stringify(["four.jpg", "two.jpg"])
        })
      )
    ).toEqual(["one.jpg", "two.jpg", "three.jpg", "four.jpg"]);
  });

  it("keeps imageDataUrl fallback semantics used by the initial insert", () => {
    expect(
      listingImages(
        listing({
          image: "",
          images: [],
          imageDataUrls: [],
          imageDataUrl: "data:image/png;base64,AA=="
        })
      )
    ).toEqual(["data:image/png;base64,AA=="]);
  });

  it("excludes a visual fallback only when photoCount is empty", () => {
    expect(
      listingImages(
        listing({ image: "fallback.jpg", photoCount: 0 }),
        ["fallback.jpg"]
      )
    ).toEqual([]);
    expect(
      listingImages(
        listing({ image: "fallback.jpg", photoCount: 1 }),
        ["fallback.jpg"]
      )
    ).toEqual(["fallback.jpg"]);
  });

  it("maps the complete legacy database payload with explicit user id", () => {
    expect(
      uiListingToDb(
        listing({
          images: ["one.jpg", "two.jpg"],
          tags: ["近地铁", "包水电", "近地铁"]
        }),
        "user-1"
      )
    ).toEqual({
      user_id: "user-1",
      type: "rental",
      status: "approved",
      title: "Room",
      description: "Clean room",
      price: 1250,
      area: "Rockville",
      category: "单间",
      move_in: "2026-08-01",
      nearby: "单间, 2026-08-01, 近地铁, 包水电",
      image_url: JSON.stringify(["one.jpg", "two.jpg"]),
      contact: "站内消息"
    });
  });

  it("keeps wanted category and legacy text fallbacks", () => {
    expect(
      uiListingToDb(
        listing({
          type: "wanted",
          desc: "",
          roomType: "",
          moveIn: "invalid",
          contact: "",
          tags: [],
          image: "",
          images: []
        }),
        "user-2"
      )
    ).toMatchObject({
      type: "rental",
      category: "wanted",
      description: "暂无详细描述。",
      move_in: null,
      contact: "站内消息"
    });
  });

  it("uses the existing post type label when category data is absent", () => {
    expect(
      uiListingToDb(
        listing({ type: "used", roomType: "", tags: [] }),
        "user-3"
      ).category
    ).toBe(typeLabel("used"));
  });

  it("requires a title without adding a new price restriction", () => {
    expect(validatePublishInput({ title: "  " })).toEqual({
      success: false,
      data: null,
      error: { code: "PUBLISH_TITLE_REQUIRED", message: "请填写标题。" }
    });
    expect(
      validatePublishInput({ title: " Listing ", price: "价格面议" })
    ).toEqual({
      success: true,
      data: { title: "Listing", price: 0 },
      error: null
    });
  });

  it("keeps an explicitly invalid price compatible with legacy parsing", () => {
    expect(
      validatePublishInput({ title: "Listing", price: "not-a-price" })
    ).toEqual({
      success: true,
      data: { title: "Listing", price: 0 },
      error: null
    });
  });
});
