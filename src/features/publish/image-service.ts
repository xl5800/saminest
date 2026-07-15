import {
  storageApi,
  type StorageApi
} from "../../services/api/storage-api";
import { fail, ok, type Result } from "../../services/result";
import {
  LISTING_IMAGES_BUCKET,
  type ListingImagesUploadInput,
  type StorageUploadOptions
} from "../../types/upload";

interface DataUrlResponse {
  blob(): Promise<Blob>;
}

export type DataUrlFetcher = (dataUrl: string) => Promise<DataUrlResponse>;

export interface ImageServiceDependencies {
  fetcher?: DataUrlFetcher;
  now?: () => number;
}

export interface ImageService {
  isDataUrl(value: unknown): boolean;
  dataUrlToBlob(dataUrl: unknown): Promise<Result<Blob>>;
  uploadListingImages(
    input: ListingImagesUploadInput
  ): Promise<Result<string[]>>;
  prepareCloudListingImages(
    input: ListingImagesUploadInput
  ): Promise<Result<string[]>>;
}

export function isDataUrl(value: unknown): boolean {
  return String(value || "").startsWith("data:");
}

function imageExtension(blob: Blob): "png" | "jpg" {
  return blob.type === "image/png" ? "png" : "jpg";
}

function uploadOptions(blob: Blob): StorageUploadOptions {
  return {
    cacheControl: "3600",
    contentType: blob.type || "image/jpeg",
    upsert: true
  };
}

function contextAvailable(input: ListingImagesUploadInput): Result<boolean> {
  try {
    return ok(
      Boolean(input.isUploadAvailable() && input.getUserId() && input.listingId)
    );
  } catch {
    return fail(
      "IMAGE_UPLOAD_CONTEXT_CHECK_FAILED",
      "无法检查图片上传环境，请稍后再试。"
    );
  }
}

function stableUserId(input: ListingImagesUploadInput): Result<string> {
  try {
    return ok(String(input.getUserId() || ""));
  } catch {
    return fail(
      "IMAGE_UPLOAD_USER_READ_FAILED",
      "无法确认图片上传账号，请重新登录后再试。"
    );
  }
}

export function createImageService(
  api: StorageApi = storageApi,
  dependencies: ImageServiceDependencies = {}
): ImageService {
  const fetcher: DataUrlFetcher =
    dependencies.fetcher || ((dataUrl) => globalThis.fetch(dataUrl));
  const now = dependencies.now || Date.now;

  const dataUrlToBlob = async (dataUrl: unknown): Promise<Result<Blob>> => {
    const value = String(dataUrl || "");
    if (!isDataUrl(value)) {
      return fail(
        "IMAGE_DATA_URL_INVALID",
        "图片数据无效，请重新选择图片。"
      );
    }

    try {
      const response = await fetcher(value);
      return ok(await response.blob());
    } catch {
      return fail(
        "IMAGE_DATA_URL_CONVERSION_FAILED",
        "图片数据无法读取，请重新选择图片。"
      );
    }
  };

  const uploadListingImages = async (
    input: ListingImagesUploadInput
  ): Promise<Result<string[]>> => {
    const context = contextAvailable(input);
    if (!context.success) return context;
    if (!context.data) {
      return fail(
        "IMAGE_UPLOAD_CONTEXT_INVALID",
        "无法确认图片上传环境，请重新登录后再试。"
      );
    }

    const uploaded: string[] = [];
    for (const [index, image] of input.images.entries()) {
      if (!isDataUrl(image)) {
        uploaded.push(image);
        continue;
      }

      const converted = await dataUrlToBlob(image);
      if (!converted.success) return converted;

      const userId = stableUserId(input);
      if (!userId.success) return userId;
      const extension = imageExtension(converted.data);
      const path = `${userId.data}/${input.listingId}/${now()}-${index}.${extension}`;
      const upload = await api.uploadObject({
        bucket: LISTING_IMAGES_BUCKET,
        path,
        body: converted.data,
        options: uploadOptions(converted.data)
      });
      if (!upload.success) return upload;

      const publicUrl = api.getPublicUrl(LISTING_IMAGES_BUCKET, path);
      if (!publicUrl.success) return publicUrl;
      if (publicUrl.data) uploaded.push(publicUrl.data);
    }
    return ok(uploaded);
  };

  return {
    isDataUrl,
    dataUrlToBlob,
    uploadListingImages,

    async prepareCloudListingImages(input) {
      if (!input.images.some(isDataUrl)) return ok(input.images);
      const uploaded = await uploadListingImages(input);
      if (!uploaded.success) return uploaded;
      return ok(
        uploaded.data.length === input.images.length ? uploaded.data : []
      );
    }
  };
}
