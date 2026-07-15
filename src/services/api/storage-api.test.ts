import { describe, expect, it, vi } from "vitest";
import type { StorageUploadInput } from "../../types/upload";
import type { SupabaseClient } from "../supabase/client";
import { createStorageApi } from "./storage-api";

function uploadInput(blob = new Blob(["image"], { type: "image/png" })):
  StorageUploadInput {
  return {
    bucket: "listing-images",
    path: "user/listing/123-0.png",
    body: blob,
    options: {
      cacheControl: "3600",
      contentType: blob.type,
      upsert: true
    }
  };
}

describe("Storage API", () => {
  it("uploads to the requested bucket with the exact legacy parameters", async () => {
    const upload = vi.fn().mockResolvedValue({ data: {}, error: null });
    const from = vi.fn(() => ({ upload }));
    const client = { storage: { from } } as unknown as SupabaseClient;
    const api = createStorageApi(() => client);
    const input = uploadInput();

    await expect(api.uploadObject(input)).resolves.toEqual({
      success: true,
      data: null,
      error: null
    });
    expect(from).toHaveBeenCalledWith("listing-images");
    expect(upload).toHaveBeenCalledWith(
      input.path,
      input.body,
      input.options
    );
  });

  it("normalizes provider upload errors without exposing raw details", async () => {
    const raw = { message: "private storage detail", secret: "bucket-policy" };
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ data: null, error: raw })
        }))
      }
    } as unknown as SupabaseClient;
    const result = await createStorageApi(() => client).uploadObject(
      uploadInput()
    );

    expect(result).toEqual({
      success: false,
      data: null,
      error: {
        code: "STORAGE_UPLOAD_FAILED",
        message: "图片上传失败，请稍后再试。"
      }
    });
    expect(JSON.stringify(result)).not.toContain("bucket-policy");
  });

  it("normalizes thrown upload requests separately", async () => {
    const client = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockRejectedValue(new Error("private rejection"))
        }))
      }
    } as unknown as SupabaseClient;

    await expect(
      createStorageApi(() => client).uploadObject(uploadInput())
    ).resolves.toMatchObject({
      success: false,
      error: { code: "STORAGE_UPLOAD_REQUEST_FAILED" }
    });
  });

  it("reads a public URL through a separate bucket access", () => {
    const getPublicUrl = vi.fn(() => ({
      data: { publicUrl: "https://cdn.example/listing.png" }
    }));
    const from = vi.fn(() => ({ getPublicUrl }));
    const client = { storage: { from } } as unknown as SupabaseClient;
    const api = createStorageApi(() => client);

    expect(api.getPublicUrl("listing-images", "user/listing/file.png"))
      .toEqual({
        success: true,
        data: "https://cdn.example/listing.png",
        error: null
      });
    expect(from).toHaveBeenCalledWith("listing-images");
    expect(getPublicUrl).toHaveBeenCalledWith("user/listing/file.png");
  });

  it("keeps missing or malformed public URL data as a successful null", () => {
    const responses = [
      { data: {} },
      { data: null },
      {},
      { data: { publicUrl: { unexpected: true } } }
    ];
    for (const response of responses) {
      const client = {
        storage: {
          from: vi.fn(() => ({ getPublicUrl: vi.fn(() => response) }))
        }
      } as unknown as SupabaseClient;
      expect(
        createStorageApi(() => client).getPublicUrl(
          "listing-images",
          "path.jpg"
        )
      ).toEqual({ success: true, data: null, error: null });
    }
  });

  it("normalizes thrown public URL lookups", () => {
    const client = {
      storage: {
        from: vi.fn(() => ({
          getPublicUrl: vi.fn(() => {
            throw new Error("private URL failure");
          })
        }))
      }
    } as unknown as SupabaseClient;

    expect(
      createStorageApi(() => client).getPublicUrl(
        "listing-images",
        "path.jpg"
      )
    ).toMatchObject({
      success: false,
      error: { code: "STORAGE_PUBLIC_URL_FAILED" }
    });
  });

  it("contains missing clients, missing storage, and thrown getters", async () => {
    const nullApi = createStorageApi(() => null);
    const missingStorageApi = createStorageApi(
      () => ({} as SupabaseClient)
    );
    const thrownApi = createStorageApi(() => {
      throw new Error("private getter failure");
    });

    await expect(nullApi.uploadObject(uploadInput())).resolves.toMatchObject({
      success: false,
      error: { code: "STORAGE_CLIENT_UNAVAILABLE" }
    });
    expect(
      missingStorageApi.getPublicUrl("listing-images", "path.jpg")
    ).toMatchObject({
      success: false,
      error: { code: "STORAGE_CLIENT_UNAVAILABLE" }
    });
    await expect(thrownApi.uploadObject(uploadInput())).resolves.toMatchObject({
      success: false,
      error: { code: "STORAGE_CLIENT_UNAVAILABLE" }
    });
  });
});
