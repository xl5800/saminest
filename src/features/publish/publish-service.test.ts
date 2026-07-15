import { describe, expect, it, vi } from "vitest";
import type { ListingImagesWriteApi } from "../../services/api/listing-images-write-api";
import type { ListingWriteApi } from "../../services/api/listing-write-api";
import { fail, ok } from "../../services/result";
import type { SupabaseListingRow } from "../../types/listing";
import type { ListingWritePayload, PublishListing } from "../../types/publish";
import type { ImageService } from "./image-service";
import {
  createPublishService,
  type PublishAuthContext,
  type PublishFormFields,
  type PublishRequest
} from "./publish-service";

const NOW = 1_782_900_000_000;

function row(
  id: string,
  payload: Partial<ListingWritePayload> = {}
): SupabaseListingRow {
  return {
    id,
    user_id: payload.user_id || "user-1",
    type: payload.type || "rental",
    status: payload.status || "pending",
    title: payload.title || "测试房源",
    description: payload.description || "描述",
    price: payload.price ?? 1200,
    area: payload.area || "Rockville",
    category: payload.category || "单间",
    move_in: payload.move_in || null,
    nearby: payload.nearby || "单间",
    image_url: payload.image_url || null,
    contact: payload.contact || "站内消息",
    reported_count: 0,
    created_at: "2026-07-15T12:00:00Z",
    updated_at: "2026-07-15T12:00:00Z"
  };
}

function writeApi(overrides: Partial<ListingWriteApi> = {}): ListingWriteApi {
  return {
    insertListing: vi.fn(async (payload) => ok(row("db-new", payload))),
    updateListing: vi.fn(async (id, payload) => ok(row(id, payload))),
    updateListingImageUrl: vi.fn(async () => ok(null)),
    deleteListing: vi.fn(async () => ok(null)),
    ...overrides
  };
}

function imageWriteApi(
  overrides: Partial<ListingImagesWriteApi> = {}
): ListingImagesWriteApi {
  return {
    replaceListingImages: vi.fn(async () => ok(null)),
    ...overrides
  };
}

function imageModule(overrides: Partial<ImageService> = {}): ImageService {
  return {
    isDataUrl: vi.fn((value) => String(value || "").startsWith("data:")),
    isLegacyAvatarDataUrl: (_value: unknown): _value is string => false,
    isSafeAvatarMetadataUrl: (_value: unknown): _value is string => false,
    dataUrlToBlob: vi.fn(async () => ok(new Blob())),
    uploadAvatar: vi.fn(async () => ok("https://cdn/avatar.jpg")),
    uploadListingImages: vi.fn(async (input) => ok(input.images)),
    prepareCloudListingImages: vi.fn(async (input) => ok(input.images)),
    ...overrides
  };
}

const auth: PublishAuthContext = {
  loggedIn: true,
  banned: false,
  userId: "user-1",
  account: "owner@example.com",
  ownerName: "发布者",
  provider: "supabase",
  cloudConfigured: true,
  cloudReady: true,
  isAdmin: false
};

const form: PublishFormFields = {
  title: "测试房源",
  price: "$1,200/月",
  area: "Rockville",
  tags: "近地铁, 包水电",
  desc: "房源描述",
  roomType: "单间",
  moveIn: "2026-08-01",
  contact: "站内消息"
};

type RequestOverrides = Omit<
  Partial<PublishRequest>,
  "auth" | "form"
> & {
    auth?: Partial<PublishAuthContext>;
    form?: Partial<PublishFormFields>;
  };

function request(overrides: RequestOverrides = {}): PublishRequest {
  return {
    type: overrides.type || "rent",
    form: { ...form, ...overrides.form },
    selectedChips: overrides.selectedChips || [],
    images: overrides.images || [],
    existing: overrides.existing || null,
    editingId: overrides.editingId || "",
    draftId: overrides.draftId || "",
    fallbackImages: overrides.fallbackImages || {
      rent: "fallback-rent.jpg",
      wanted: "fallback-wanted.jpg",
      used: "fallback-used.jpg"
    },
    auth: { ...auth, ...overrides.auth }
  };
}

function existing(overrides: Partial<PublishListing> = {}): PublishListing {
  return {
    id: "existing-1",
    type: "rent",
    title: "旧标题",
    price: "$900/月",
    area: "Bethesda",
    time: "昨天",
    tags: ["旧标签"],
    detailTags: ["旧标签"],
    photoCount: 1,
    image: "https://cdn/old.jpg",
    images: ["https://cdn/old.jpg"],
    imageDataUrls: ["https://cdn/old.jpg"],
    imageDataUrl: "https://cdn/old.jpg",
    desc: "旧描述",
    roomType: "主卧",
    moveIn: "2026-07-20",
    contact: "微信",
    owner: "发布者",
    ownerAccount: "user-1",
    mine: true,
    status: "active",
    createdAt: NOW - 1000,
    ...overrides
  };
}

function setup(options: {
  writes?: ListingWriteApi;
  imageWrites?: ListingImagesWriteApi;
  images?: ImageService;
} = {}) {
  const writes = options.writes || writeApi();
  const imageWrites = options.imageWrites || imageWriteApi();
  const images = options.images || imageModule();
  const service = createPublishService({
    writes,
    imageWrites,
    images,
    now: () => NOW
  });
  return { service, writes, imageWrites, images };
}

describe("Publish service guards and local mode", () => {
  it("rejects an unauthenticated publish before any write", async () => {
    const context = setup();
    const result = await context.service.publish(
      request({ auth: { loggedIn: false } })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "PUBLISH_AUTH_REQUIRED" }
    });
    expect(context.writes.insertListing).not.toHaveBeenCalled();
  });

  it("rejects a banned account before any upload or write", async () => {
    const context = setup();
    const result = await context.service.publish(
      request({ auth: { banned: true } })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "PUBLISH_ACCOUNT_BANNED" }
    });
    expect(context.images.prepareCloudListingImages).not.toHaveBeenCalled();
    expect(context.writes.insertListing).not.toHaveBeenCalled();
  });

  it("rejects a missing title and keeps invalid prices mapped to zero", async () => {
    const missing = setup();
    await expect(
      missing.service.publish(request({ form: { title: "" } }))
    ).resolves.toMatchObject({
      success: false,
      error: { code: "PUBLISH_TITLE_REQUIRED" }
    });

    const invalid = setup();
    await invalid.service.publish(request({ form: { price: "面议" } }));
    expect(invalid.writes.insertListing).toHaveBeenCalledWith(
      expect.objectContaining({ price: 0 })
    );
  });

  it("keeps a logged-in local session on the local state path", async () => {
    const context = setup();
    const result = await context.service.publish(
      request({
        images: [],
        auth: {
          provider: "local",
          userId: "",
          cloudConfigured: false,
          cloudReady: false
        }
      })
    );

    expect(result).toMatchObject({
      success: true,
      data: {
        mode: "local",
        action: "created",
        listingId: `rent-${NOW}`,
        stateUpdate: { strategy: "prepend" },
        listing: {
          status: "pending",
          owner: "发布者",
          ownerAccount: "owner@example.com",
          image: "fallback-rent.jpg",
          images: []
        }
      }
    });
    expect(context.writes.insertListing).not.toHaveBeenCalled();
  });

  it("returns a replace state update for a local edit", async () => {
    const context = setup();
    const result = await context.service.publish(
      request({
        existing: existing(),
        images: ["https://cdn/old.jpg"],
        auth: {
          provider: "local",
          userId: "",
          cloudConfigured: false,
          cloudReady: false
        }
      })
    );

    expect(result).toMatchObject({
      success: true,
      data: {
        action: "updated",
        listingId: "existing-1",
        stateUpdate: { strategy: "replace" },
        listing: { status: "active", createdAt: NOW - 1000 }
      }
    });
  });

  it("blocks a configured Supabase session while its client is unavailable", async () => {
    const context = setup();
    const result = await context.service.publish(
      request({ auth: { cloudReady: false } })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "PUBLISH_CLOUD_NOT_READY" }
    });
  });
});

describe("Publish service cloud writes", () => {
  it("creates a no-image listing and clears image relations", async () => {
    const context = setup();
    const result = await context.service.publish(request({ images: [] }));

    expect(context.writes.insertListing).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        type: "rental",
        status: "pending",
        image_url: null
      })
    );
    expect(context.writes.updateListingImageUrl).not.toHaveBeenCalled();
    expect(context.imageWrites.replaceListingImages).toHaveBeenCalledWith(
      "db-new",
      []
    );
    expect(result).toMatchObject({
      success: true,
      data: {
        mode: "cloud",
        listingId: "db-new",
        stateUpdate: { strategy: "reload" }
      }
    });
  });

  it("uploads one Data URL, updates its cover and writes the relation", async () => {
    const images = imageModule({
      prepareCloudListingImages: vi
        .fn()
        .mockResolvedValue(ok(["https://cdn/new.jpg"]))
    });
    const context = setup({ images });
    const result = await context.service.publish(
      request({ images: ["data:image/jpeg;base64,AA=="] })
    );

    expect(context.writes.insertListing).toHaveBeenCalledWith(
      expect.objectContaining({ image_url: "data:image/jpeg;base64,AA==" })
    );
    expect(context.writes.updateListingImageUrl).toHaveBeenCalledWith(
      "db-new",
      "https://cdn/new.jpg"
    );
    expect(context.imageWrites.replaceListingImages).toHaveBeenCalledWith(
      "db-new",
      ["https://cdn/new.jpg"]
    );
    expect(result).toMatchObject({
      success: true,
      data: {
        listing: {
          image: "https://cdn/new.jpg",
          images: ["https://cdn/new.jpg"]
        }
      }
    });
  });

  it("preserves mixed remote/Data URL image order and JSON cover payload", async () => {
    const prepared = [
      "https://cdn/existing.jpg",
      "https://cdn/uploaded.jpg",
      "https://cdn/last.jpg"
    ];
    const images = imageModule({
      prepareCloudListingImages: vi.fn().mockResolvedValue(ok(prepared))
    });
    const context = setup({ images });
    await context.service.publish(
      request({
        images: [
          "https://cdn/existing.jpg",
          "data:image/png;base64,AA==",
          "https://cdn/last.jpg"
        ]
      })
    );

    expect(context.writes.updateListingImageUrl).toHaveBeenCalledWith(
      "db-new",
      JSON.stringify(prepared)
    );
    expect(context.imageWrites.replaceListingImages).toHaveBeenCalledWith(
      "db-new",
      prepared
    );
  });

  it("updates an existing listing without inserting or reordering remote images", async () => {
    const context = setup();
    const sourceImages = ["https://cdn/one.jpg", "https://cdn/two.jpg"];
    const result = await context.service.publish(
      request({ existing: existing(), images: sourceImages })
    );

    expect(context.writes.insertListing).not.toHaveBeenCalled();
    expect(context.writes.updateListing).toHaveBeenCalledWith(
      "existing-1",
      expect.objectContaining({ image_url: JSON.stringify(sourceImages) })
    );
    expect(context.images.prepareCloudListingImages).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: "existing-1",
        images: sourceImages
      })
    );
    expect(result).toMatchObject({
      success: true,
      data: { action: "updated", listingId: "existing-1" }
    });
  });

  it("keeps tags, owner, status, time and price mappings", async () => {
    const context = setup();
    const result = await context.service.publish(
      request({
        type: "wanted",
        form: {
          tags: "",
          roomType: "合租",
          moveIn: "尽快",
          price: "预算 $1,500.50"
        },
        selectedChips: ["近地铁", "近地铁"],
        auth: { isAdmin: true }
      })
    );

    expect(context.writes.insertListing).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "rental",
        status: "approved",
        category: "wanted",
        price: 1500.5,
        user_id: "user-1"
      })
    );
    expect(result).toMatchObject({
      success: true,
      data: {
        listing: {
          tags: ["近地铁", "尽快"],
          owner: "发布者",
          status: "active",
          time: "刚刚",
          createdAt: NOW
        }
      }
    });
  });
});

describe("Publish service failures and compensation", () => {
  it("propagates insert failures without running later steps", async () => {
    const writes = writeApi({
      insertListing: vi
        .fn()
        .mockResolvedValue(fail("LISTING_INSERT_FAILED", "发布失败"))
    });
    const context = setup({ writes });
    const result = await context.service.publish(
      request({ images: ["data:image/png;base64,AA=="] })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "LISTING_INSERT_FAILED" }
    });
    expect(context.images.prepareCloudListingImages).not.toHaveBeenCalled();
    expect(writes.deleteListing).not.toHaveBeenCalled();
  });

  it("propagates edit failures without deleting the listing", async () => {
    const writes = writeApi({
      updateListing: vi
        .fn()
        .mockResolvedValue(fail("LISTING_UPDATE_FAILED", "发布失败"))
    });
    const context = setup({ writes });
    const result = await context.service.publish(
      request({ existing: existing(), images: [] })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "LISTING_UPDATE_FAILED" }
    });
    expect(writes.deleteListing).not.toHaveBeenCalled();
  });

  it("deletes a new listing after a Storage upload failure", async () => {
    const images = imageModule({
      prepareCloudListingImages: vi
        .fn()
        .mockResolvedValue(fail("STORAGE_UPLOAD_FAILED", "上传失败"))
    });
    const context = setup({ images });
    const result = await context.service.publish(
      request({ images: ["data:image/png;base64,AA=="] })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "PUBLISH_IMAGE_UPLOAD_FAILED" }
    });
    expect(context.writes.deleteListing).toHaveBeenCalledWith("db-new");
  });

  it("does not delete an existing listing after a Storage upload failure", async () => {
    const images = imageModule({
      prepareCloudListingImages: vi
        .fn()
        .mockResolvedValue(fail("STORAGE_UPLOAD_FAILED", "上传失败"))
    });
    const context = setup({ images });
    const result = await context.service.publish(
      request({
        existing: existing(),
        images: ["data:image/png;base64,AA=="]
      })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "PUBLISH_EDIT_IMAGE_UPLOAD_FAILED" }
    });
    expect(context.writes.deleteListing).not.toHaveBeenCalled();
    expect(context.writes.updateListing).not.toHaveBeenCalled();
  });

  it("keeps the legacy boundary for non-Storage conversion failures", async () => {
    const images = imageModule({
      prepareCloudListingImages: vi
        .fn()
        .mockResolvedValue(
          fail("IMAGE_DATA_URL_CONVERSION_FAILED", "图片无法读取")
        )
    });
    const context = setup({ images });
    const result = await context.service.publish(
      request({ images: ["data:image/png;base64,AA=="] })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "IMAGE_DATA_URL_CONVERSION_FAILED" }
    });
    expect(context.writes.deleteListing).not.toHaveBeenCalled();
  });

  it("deletes a new listing when its image_url update fails", async () => {
    const writes = writeApi({
      updateListingImageUrl: vi
        .fn()
        .mockResolvedValue(
          fail("LISTING_IMAGE_URL_UPDATE_FAILED", "图片保存失败")
        )
    });
    const images = imageModule({
      prepareCloudListingImages: vi
        .fn()
        .mockResolvedValue(ok(["https://cdn/new.jpg"]))
    });
    const context = setup({ writes, images });
    const result = await context.service.publish(
      request({ images: ["data:image/png;base64,AA=="] })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "LISTING_IMAGE_URL_UPDATE_FAILED" }
    });
    expect(writes.deleteListing).toHaveBeenCalledWith("db-new");
    expect(context.imageWrites.replaceListingImages).not.toHaveBeenCalled();
  });

  it("does not delete a listing when relation replacement fails", async () => {
    const imageWrites = imageWriteApi({
      replaceListingImages: vi
        .fn()
        .mockResolvedValue(
          fail("LISTING_IMAGES_INSERT_FAILED", "图片记录保存失败")
        )
    });
    const context = setup({ imageWrites });
    const result = await context.service.publish(
      request({ images: ["https://cdn/existing.jpg"] })
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "PUBLISH_IMAGE_RELATION_FAILED" }
    });
    expect(context.writes.deleteListing).not.toHaveBeenCalled();
  });

  it("ignores an empty-image relation clear failure like the legacy flow", async () => {
    const imageWrites = imageWriteApi({
      replaceListingImages: vi
        .fn()
        .mockResolvedValue(
          fail("LISTING_IMAGES_CLEAR_FAILED", "图片记录保存失败")
        )
    });
    const context = setup({ imageWrites });
    await expect(
      context.service.publish(request({ images: [] }))
    ).resolves.toMatchObject({ success: true });
  });

  it("exposes the same relation writer to the thin legacy wrapper", async () => {
    const imageWrites = imageWriteApi();
    const context = setup({ imageWrites });
    await expect(
      context.service.saveListingImages("listing-1", ["one.jpg", "two.jpg"])
    ).resolves.toEqual(ok(null));
    expect(imageWrites.replaceListingImages).toHaveBeenCalledWith(
      "listing-1",
      ["one.jpg", "two.jpg"]
    );
  });
});
