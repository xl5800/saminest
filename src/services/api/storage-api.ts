import type {
  ListingImagesBucket,
  StorageUploadInput
} from "../../types/upload";
import { fail, ok, type Result } from "../result";
import {
  getSupabaseClient,
  type SupabaseClient
} from "../supabase/client";

interface StorageUploadResponse {
  error: unknown;
}

interface StoragePublicUrlResponse {
  data?: {
    publicUrl?: unknown;
  } | null;
}

interface StorageBucketPort {
  upload(
    path: string,
    body: Blob,
    options: StorageUploadInput["options"]
  ): Promise<StorageUploadResponse>;
  getPublicUrl(path: string): StoragePublicUrlResponse;
}

interface StoragePort {
  from(bucket: ListingImagesBucket): StorageBucketPort;
}

interface StorageClient extends SupabaseClient {
  storage: StoragePort;
}

export type StorageClientGetter = () => SupabaseClient | null;

export interface StorageApi {
  uploadObject(input: StorageUploadInput): Promise<Result<null>>;
  getPublicUrl(
    bucket: ListingImagesBucket,
    path: string
  ): Result<string | null>;
}

function unavailable<T>(): Result<T> {
  return fail(
    "STORAGE_CLIENT_UNAVAILABLE",
    "图片服务暂时不可用，请稍后再试。"
  );
}

function storagePort(
  getClient: StorageClientGetter
): Result<StoragePort> {
  try {
    const client = getClient() as StorageClient | null;
    return client?.storage?.from ? ok(client.storage) : unavailable();
  } catch {
    return unavailable();
  }
}

export function createStorageApi(
  getClient: StorageClientGetter = getSupabaseClient
): StorageApi {
  return {
    async uploadObject(input) {
      const storage = storagePort(getClient);
      if (!storage.success) return storage;

      try {
        const response = await storage.data
          .from(input.bucket)
          .upload(input.path, input.body, input.options);
        if (response.error) {
          return fail(
            "STORAGE_UPLOAD_FAILED",
            "图片上传失败，请稍后再试。"
          );
        }
        return ok(null);
      } catch {
        return fail(
          "STORAGE_UPLOAD_REQUEST_FAILED",
          "图片上传请求失败，请稍后再试。"
        );
      }
    },

    getPublicUrl(bucket, path) {
      const storage = storagePort(getClient);
      if (!storage.success) return storage;

      try {
        const response = storage.data.from(bucket).getPublicUrl(path);
        const publicUrl = response?.data?.publicUrl;
        return ok(typeof publicUrl === "string" && publicUrl ? publicUrl : null);
      } catch {
        return fail(
          "STORAGE_PUBLIC_URL_FAILED",
          "无法读取上传后的图片地址，请稍后再试。"
        );
      }
    }
  };
}

export const storageApi = createStorageApi();
