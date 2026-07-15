import {
  imageService,
  type ImageService
} from "./image-service";
import {
  listingImagesWriteApi,
  type ListingImagesWriteApi
} from "../../services/api/listing-images-write-api";
import {
  listingWriteApi,
  type ListingWriteApi
} from "../../services/api/listing-write-api";
import { fail, ok, type Result } from "../../services/result";
import type { ListingType } from "../../types/listing";
import type { PublishListing } from "../../types/publish";
import { typeLabel } from "../posts/post-mappers";
import {
  uiListingToDb,
  validatePublishInput
} from "./publish-validation";

export interface PublishFormFields {
  title: unknown;
  price?: unknown;
  area?: unknown;
  tags?: unknown;
  desc?: unknown;
  roomType?: unknown;
  moveIn?: unknown;
  contact?: unknown;
}

export interface PublishAuthContext {
  loggedIn: boolean;
  banned: boolean;
  userId: string;
  account?: string;
  ownerName: string;
  provider?: string;
  cloudConfigured: boolean;
  cloudReady: boolean;
  isAdmin: boolean;
}

export interface PublishRequest {
  type: ListingType;
  form: PublishFormFields;
  selectedChips?: string[];
  images?: string[];
  existing?: PublishListing | null;
  editingId?: string;
  draftId?: string;
  fallbackImages: Record<ListingType, string>;
  auth: PublishAuthContext;
}

export type PublishStateUpdate =
  | { strategy: "reload" }
  | { strategy: "replace"; listing: PublishListing }
  | { strategy: "prepend"; listing: PublishListing };

export interface PublishOutcome {
  mode: "cloud" | "local";
  action: "created" | "updated";
  listingId: string;
  listing: PublishListing;
  draftId: string;
  stateUpdate: PublishStateUpdate;
}

export interface PublishService {
  publish(input: PublishRequest): Promise<Result<PublishOutcome>>;
  saveListingImages(
    listingId: string,
    images: string[]
  ): Promise<Result<null>>;
}

export interface PublishBridge {
  service: PublishService;
  mappers: {
    uiListingToDb: typeof uiListingToDb;
    validatePublishInput: typeof validatePublishInput;
  };
}

export interface PublishServiceDependencies {
  writes?: ListingWriteApi;
  imageWrites?: ListingImagesWriteApi;
  images?: ImageService;
  now?: () => number;
}

function text(value: unknown): string {
  return String(value || "").trim();
}

function cleanOr(value: unknown, fallback: string): string {
  return text(value) || fallback;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(text).filter(Boolean);
  }
  return String(value || "")
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function priceFallback(type: ListingType): string {
  return type === "wanted" ? "预算面议" : "价格面议";
}

function buildTags(input: PublishRequest): string[] {
  const manualTags = normalizeTags(input.form.tags);
  const baseTags = manualTags.length
    ? manualTags
    : (input.selectedChips || []).filter(Boolean);
  const structuredTags = input.type === "rent"
    ? [input.form.roomType, input.form.moveIn]
    : [input.form.moveIn];
  return [
    ...new Set([...baseTags, ...structuredTags.map(text)].filter(Boolean))
  ];
}

function buildListing(
  input: PublishRequest,
  now: () => number
): Result<PublishListing> {
  const validation = validatePublishInput({
    title: input.form.title,
    price: input.form.price
  });
  if (!validation.success) return validation;

  const existing = input.existing || null;
  const images = [...(input.images || [])];
  const tags = buildTags(input);
  const image = images[0] || input.fallbackImages[input.type];
  const listing: PublishListing = {
    id: existing?.id || `${input.type}-${now()}`,
    type: input.type,
    title: validation.data.title,
    price: cleanOr(input.form.price, priceFallback(input.type)),
    area: cleanOr(input.form.area, "本地地区"),
    time: existing?.time || "刚刚",
    tags,
    detailTags: tags.length ? tags : [typeLabel(input.type)],
    photoCount: images.length,
    image,
    images,
    imageDataUrls: images,
    imageDataUrl: images[0] || "",
    desc: cleanOr(input.form.desc, "暂无详细描述。"),
    roomType: cleanOr(input.form.roomType, ""),
    moveIn: cleanOr(input.form.moveIn, ""),
    contact: cleanOr(input.form.contact, "站内消息"),
    owner: input.auth.ownerName,
    ownerAccount: input.auth.userId || input.auth.account || "",
    mine: true,
    status: existing?.status || (input.auth.isAdmin ? "active" : "pending"),
    createdAt: existing?.createdAt || now()
  };
  return ok(listing);
}

function withImages(
  listing: PublishListing,
  images: string[]
): PublishListing {
  return {
    ...listing,
    image: images[0] || "",
    images,
    imageDataUrls: images
  };
}

function imageUploadFailure(isEdit: boolean): Result<never> {
  return fail(
    isEdit
      ? "PUBLISH_EDIT_IMAGE_UPLOAD_FAILED"
      : "PUBLISH_IMAGE_UPLOAD_FAILED",
    isEdit
      ? "图片上传失败，帖子没有更新。请确认 Supabase Storage 的 listing-images bucket 和权限已配置。"
      : "图片上传失败，帖子没有发布。请确认 Supabase Storage 的 listing-images bucket 和权限已配置。"
  );
}

function relationshipFailure(): Result<never> {
  return fail(
    "PUBLISH_IMAGE_RELATION_FAILED",
    "图片已上传，但图片记录保存失败。请检查 listing_images 表权限。"
  );
}

function publishFailure(): Result<never> {
  return fail("PUBLISH_FAILED", "发布失败，请稍后再试。");
}

export function createPublishService(
  dependencies: PublishServiceDependencies = {}
): PublishService {
  const writes = dependencies.writes || listingWriteApi;
  const imageWrites = dependencies.imageWrites || listingImagesWriteApi;
  const images = dependencies.images || imageService;
  const now = dependencies.now || Date.now;

  const prepareImages = async (
    input: PublishRequest,
    listingId: string,
    sourceImages: string[],
    isEdit: boolean
  ): Promise<Result<string[]>> => {
    const result = await images.prepareCloudListingImages({
      listingId,
      images: sourceImages,
      isUploadAvailable: () => input.auth.cloudReady,
      getUserId: () => input.auth.userId
    });
    if (!result.success) {
      return [
        "IMAGE_UPLOAD_CONTEXT_INVALID",
        "STORAGE_UPLOAD_FAILED"
      ].includes(result.error.code)
        ? imageUploadFailure(isEdit)
        : result;
    }
    if (sourceImages.length && !result.data.length) {
      return imageUploadFailure(isEdit);
    }
    return result;
  };

  const payloadFor = (
    input: PublishRequest,
    listing: PublishListing,
    cloudImages: string[]
  ) => uiListingToDb(
    withImages(listing, cloudImages),
    input.auth.userId,
    Object.values(input.fallbackImages)
  );

  const publishExisting = async (
    input: PublishRequest,
    listing: PublishListing
  ): Promise<Result<{ listingId: string; cloudImages: string[] }>> => {
    const listingId = String(input.existing?.id || "");
    const prepared = await prepareImages(
      input,
      listingId,
      [...(input.images || [])],
      true
    );
    if (!prepared.success) return prepared;
    const saved = await writes.updateListing(
      listingId,
      payloadFor(input, listing, prepared.data)
    );
    return saved.success
      ? ok({ listingId: saved.data.id, cloudImages: prepared.data })
      : saved;
  };

  const updateNewListingImages = async (
    input: PublishRequest,
    listing: PublishListing,
    listingId: string,
    cloudImages: string[]
  ): Promise<Result<null>> => {
    if (!cloudImages.length) return ok(null);
    const imageUrl = payloadFor(input, listing, cloudImages).image_url;
    const updated = await writes.updateListingImageUrl(listingId, imageUrl);
    if (updated.success) return updated;
    await writes.deleteListing(listingId);
    return updated;
  };

  const publishNew = async (
    input: PublishRequest,
    listing: PublishListing
  ): Promise<Result<{ listingId: string; cloudImages: string[] }>> => {
    const initialListing = {
      ...listing,
      image: "",
      images: [],
      imageDataUrls: []
    };
    const inserted = await writes.insertListing(
      uiListingToDb(
        initialListing,
        input.auth.userId,
        Object.values(input.fallbackImages)
      )
    );
    if (!inserted.success) return inserted;
    const listingId = inserted.data.id;
    const prepared = await prepareImages(
      input,
      listingId,
      [...(input.images || [])],
      false
    );
    if (!prepared.success) {
      if (prepared.error.code === "PUBLISH_IMAGE_UPLOAD_FAILED") {
        await writes.deleteListing(listingId);
      }
      return prepared;
    }
    const updated = await updateNewListingImages(
      input,
      listing,
      listingId,
      prepared.data
    );
    return updated.success
      ? ok({ listingId, cloudImages: prepared.data })
      : updated;
  };

  const completeCloud = async (
    input: PublishRequest,
    listing: PublishListing,
    saved: { listingId: string; cloudImages: string[] },
    isEdit: boolean
  ): Promise<Result<PublishOutcome>> => {
    const related = await imageWrites.replaceListingImages(
      saved.listingId,
      saved.cloudImages
    );
    if (!related.success && saved.cloudImages.length) {
      return relationshipFailure();
    }
    const savedListing = {
      ...withImages(listing, saved.cloudImages),
      id: saved.listingId
    };
    return ok({
      mode: "cloud",
      action: isEdit ? "updated" : "created",
      listingId: saved.listingId,
      listing: savedListing,
      draftId: input.draftId || "",
      stateUpdate: { strategy: "reload" }
    });
  };

  const publishCloud = async (
    input: PublishRequest,
    listing: PublishListing
  ): Promise<Result<PublishOutcome>> => {
    const isEdit = Boolean(input.existing?.id);
    const saved = isEdit
      ? await publishExisting(input, listing)
      : await publishNew(input, listing);
    return saved.success
      ? completeCloud(input, listing, saved.data, isEdit)
      : saved;
  };

  return {
    saveListingImages(listingId, sourceImages) {
      return imageWrites.replaceListingImages(listingId, sourceImages);
    },

    async publish(input) {
      if (!input.auth.loggedIn) {
        return fail("PUBLISH_AUTH_REQUIRED", "登录后发布信息");
      }
      if (input.auth.banned) {
        return fail("PUBLISH_ACCOUNT_BANNED", "账号已被封禁，不能继续发布。");
      }
      if (
        input.auth.provider === "supabase" &&
        input.auth.cloudConfigured &&
        !input.auth.cloudReady
      ) {
        return fail(
          "PUBLISH_CLOUD_NOT_READY",
          "发布服务正在加载，请稍候再试。"
        );
      }

      const built = buildListing(input, now);
      if (!built.success) return built;
      const isEdit = Boolean(input.existing?.id);

      try {
        if (input.auth.cloudReady && input.auth.userId) {
          return await publishCloud(input, built.data);
        }
        return ok({
          mode: "local",
          action: isEdit ? "updated" : "created",
          listingId: built.data.id,
          listing: built.data,
          draftId: input.draftId || "",
          stateUpdate: isEdit
            ? { strategy: "replace", listing: built.data }
            : { strategy: "prepend", listing: built.data }
        });
      } catch {
        return publishFailure();
      }
    }
  };
}

export const publishService = createPublishService();

export function createPublishBridge(
  service: PublishService = publishService
): PublishBridge {
  return {
    service,
    mappers: {
      uiListingToDb,
      validatePublishInput
    }
  };
}
