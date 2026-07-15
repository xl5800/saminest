import { describe, expect, it, vi } from "vitest";
import type { StorageApi } from "../../services/api/storage-api";
import { fail, ok, type Result } from "../../services/result";
import type {
  ListingImagesUploadInput,
  StorageUploadInput
} from "../../types/upload";
import {
  createImageService,
  isDataUrl,
  type DataUrlFetcher
} from "./image-service";

function apiStub(overrides: Partial<StorageApi> = {}): StorageApi {
  return {
    uploadObject: vi.fn().mockResolvedValue(ok(null)),
    getPublicUrl: vi.fn((_bucket, path) =>
      ok(`https://cdn.example/${path}`)
    ),
    ...overrides
  };
}

function uploadContext(
  images: string[],
  overrides: Partial<ListingImagesUploadInput> = {}
): ListingImagesUploadInput {
  return {
    listingId: "listing-1",
    images,
    isUploadAvailable: vi.fn(() => true),
    getUserId: vi.fn(() => "user-1"),
    ...overrides
  };
}

function blobFetcher(type = "image/jpeg", bytes = [1, 2, 3]): DataUrlFetcher {
  return vi.fn(async () => ({
    blob: async () => new Blob([new Uint8Array(bytes)], { type })
  }));
}

describe("Data URL conversion", () => {
  it("preserves the legacy data: prefix check exactly", () => {
    expect(isDataUrl("data:image/png;base64,AA==")).toBe(true);
    expect(isDataUrl("DATA:image/png;base64,AA==")).toBe(false);
    expect(isDataUrl(" data:image/png;base64,AA==")).toBe(false);
    expect(isDataUrl(null)).toBe(false);
  });

  it("converts PNG bytes and MIME type exactly", async () => {
    const service = createImageService();
    const result = await service.dataUrlToBlob(
      "data:image/png;base64,AAEC"
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.type).toBe("image/png");
    expect([...new Uint8Array(await result.data.arrayBuffer())]).toEqual([
      0, 1, 2
    ]);
  });

  it("converts JPEG bytes and MIME type exactly", async () => {
    const service = createImageService();
    const result = await service.dataUrlToBlob(
      "data:image/jpeg;base64,/9j/"
    );

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.type).toBe("image/jpeg");
    expect([...new Uint8Array(await result.data.arrayBuffer())]).toEqual([
      255, 216, 255
    ]);
  });

  it("keeps valid empty Data URL payloads as zero-byte blobs", async () => {
    const service = createImageService();
    const plain = await service.dataUrlToBlob("data:,");
    const png = await service.dataUrlToBlob("data:image/png;base64,");

    expect(plain.success && plain.data.size).toBe(0);
    expect(png.success && png.data.size).toBe(0);
    expect(png.success && png.data.type).toBe("image/png");
  });

  it("returns stable failures for empty and invalid Data URLs", async () => {
    const service = createImageService();

    await expect(service.dataUrlToBlob("")).resolves.toMatchObject({
      success: false,
      error: { code: "IMAGE_DATA_URL_INVALID" }
    });
    await expect(
      service.dataUrlToBlob("data:image/png;base64,%%%")
    ).resolves.toMatchObject({
      success: false,
      error: { code: "IMAGE_DATA_URL_CONVERSION_FAILED" }
    });
  });
});

describe("Listing image service", () => {
  it("returns remote HTTP and HTTPS URLs unchanged without uploading", async () => {
    const api = apiStub();
    const images = ["http://example/a.jpg", "https://example/b.jpg"];
    const service = createImageService(api, { fetcher: blobFetcher() });
    const result = await service.uploadListingImages(uploadContext(images));

    expect(result).toEqual({ success: true, data: images, error: null });
    expect(api.uploadObject).not.toHaveBeenCalled();
    expect(api.getPublicUrl).not.toHaveBeenCalled();
  });

  it("returns remote-only and empty prepare inputs by the same reference", async () => {
    const api = apiStub();
    const service = createImageService(api, { fetcher: blobFetcher() });
    const remote = ["https://example/a.jpg", "blob:existing"];
    const empty: string[] = [];
    const remoteContext = uploadContext(remote);
    const emptyContext = uploadContext(empty);

    const remoteResult = await service.prepareCloudListingImages(remoteContext);
    const emptyResult = await service.prepareCloudListingImages(emptyContext);

    expect(remoteResult.success && remoteResult.data).toBe(remote);
    expect(emptyResult.success && emptyResult.data).toBe(empty);
    expect(remoteContext.isUploadAvailable).not.toHaveBeenCalled();
    expect(remoteContext.getUserId).not.toHaveBeenCalled();
    expect(api.uploadObject).not.toHaveBeenCalled();
  });

  it("checks context for a direct empty upload but makes no Storage call", async () => {
    const api = apiStub();
    const context = uploadContext([]);
    const result = await createImageService(api).uploadListingImages(context);

    expect(result).toEqual({ success: true, data: [], error: null });
    expect(context.isUploadAvailable).toHaveBeenCalledOnce();
    expect(context.getUserId).toHaveBeenCalledOnce();
    expect(api.uploadObject).not.toHaveBeenCalled();
  });

  it("uploads one PNG with the exact bucket, path, and options", async () => {
    const api = apiStub();
    const service = createImageService(api, {
      fetcher: blobFetcher("image/png", [9, 8]),
      now: () => 12345
    });
    const result = await service.uploadListingImages(
      uploadContext(["data:image/png;base64,CQg="])
    );

    expect(result).toEqual({
      success: true,
      data: ["https://cdn.example/user-1/listing-1/12345-0.png"],
      error: null
    });
    expect(api.uploadObject).toHaveBeenCalledOnce();
    const input = vi.mocked(api.uploadObject).mock.calls[0][0];
    expect(input).toMatchObject({
      bucket: "listing-images",
      path: "user-1/listing-1/12345-0.png",
      options: {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true
      }
    });
    expect(input.body).toBeInstanceOf(Blob);
    expect(api.getPublicUrl).toHaveBeenCalledWith(
      "listing-images",
      "user-1/listing-1/12345-0.png"
    );
  });

  it("uses jpg for JPEG and unknown MIME while preserving contentType", async () => {
    const types = ["image/jpeg", "image/webp", ""];
    const fetcher = vi.fn(async () => {
      const type = types.shift() || "";
      return { blob: async () => new Blob(["x"], { type }) };
    });
    const api = apiStub();
    const now = vi.fn()
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(101)
      .mockReturnValueOnce(102);
    const service = createImageService(api, { fetcher, now });

    await service.uploadListingImages(
      uploadContext(["data:a", "data:b", "data:c"])
    );
    const calls = vi.mocked(api.uploadObject).mock.calls
      .map(([input]) => input as StorageUploadInput);

    expect(calls.map((input) => input.path)).toEqual([
      "user-1/listing-1/100-0.jpg",
      "user-1/listing-1/101-1.jpg",
      "user-1/listing-1/102-2.jpg"
    ]);
    expect(calls.map((input) => input.options.contentType)).toEqual([
      "image/jpeg",
      "image/webp",
      "image/jpeg"
    ]);
  });

  it("preserves mixed input order and uses the original array index", async () => {
    const api = apiStub();
    const service = createImageService(api, {
      fetcher: blobFetcher("image/jpeg"),
      now: () => 999
    });
    const images = [
      "http://example/first.jpg",
      "data:image/jpeg;base64,AQID",
      "https://example/last.jpg"
    ];
    const result = await service.prepareCloudListingImages(
      uploadContext(images)
    );

    expect(result).toEqual({
      success: true,
      data: [
        images[0],
        "https://cdn.example/user-1/listing-1/999-1.jpg",
        images[2]
      ],
      error: null
    });
  });

  it("reads Date.now and the current user separately for each local image", async () => {
    const api = apiStub();
    const now = vi.fn().mockReturnValueOnce(10).mockReturnValueOnce(20);
    const getUserId = vi.fn()
      .mockReturnValueOnce("guard-user")
      .mockReturnValueOnce("user-a")
      .mockReturnValueOnce("user-b");
    const service = createImageService(api, {
      fetcher: blobFetcher("image/png"),
      now
    });

    await service.uploadListingImages(
      uploadContext(["data:first", "data:second"], { getUserId })
    );
    const paths = vi.mocked(api.uploadObject).mock.calls
      .map(([input]) => input.path);

    expect(paths).toEqual([
      "user-a/listing-1/10-0.png",
      "user-b/listing-1/20-1.png"
    ]);
    expect(getUserId).toHaveBeenCalledTimes(3);
    expect(now).toHaveBeenCalledTimes(2);
  });

  it("waits for each upload before starting the next image", async () => {
    let resolveFirst!: (result: Result<null>) => void;
    let signalFirstStarted!: () => void;
    const firstUpload = new Promise<Result<null>>((resolve) => {
      resolveFirst = resolve;
    });
    const firstStarted = new Promise<void>((resolve) => {
      signalFirstStarted = resolve;
    });
    const uploadObject = vi.fn()
      .mockImplementationOnce(() => {
        signalFirstStarted();
        return firstUpload;
      })
      .mockResolvedValueOnce(ok(null));
    const api = apiStub({ uploadObject });
    const service = createImageService(api, {
      fetcher: blobFetcher("image/jpeg"),
      now: () => 1
    });

    const pending = service.uploadListingImages(
      uploadContext(["data:first", "data:second"])
    );
    await firstStarted;
    expect(uploadObject).toHaveBeenCalledTimes(1);

    resolveFirst(ok(null));
    await pending;
    expect(uploadObject).toHaveBeenCalledTimes(2);
  });

  it("uploads duplicate Data URLs independently", async () => {
    const api = apiStub();
    const service = createImageService(api, {
      fetcher: blobFetcher("image/png"),
      now: () => 7
    });
    const same = "data:image/png;base64,AQ==";

    await service.uploadListingImages(uploadContext([same, same]));
    expect(api.uploadObject).toHaveBeenCalledTimes(2);
  });

  it("returns a stable context failure without touching Storage", async () => {
    const api = apiStub();
    const service = createImageService(api, { fetcher: blobFetcher() });

    const unavailable = await service.uploadListingImages(
      uploadContext(["data:image/jpeg;base64,AQ=="], {
        isUploadAvailable: () => false
      })
    );
    const missingUser = await service.uploadListingImages(
      uploadContext(["data:image/jpeg;base64,AQ=="], {
        getUserId: () => ""
      })
    );

    expect(unavailable).toMatchObject({
      success: false,
      error: { code: "IMAGE_UPLOAD_CONTEXT_INVALID" }
    });
    expect(missingUser).toMatchObject({
      success: false,
      error: { code: "IMAGE_UPLOAD_CONTEXT_INVALID" }
    });
    expect(api.uploadObject).not.toHaveBeenCalled();
  });

  it("propagates Storage client and upload failures and stops the batch", async () => {
    const fetcher = blobFetcher("image/jpeg");
    const uploadObject = vi.fn().mockResolvedValue(
      fail("STORAGE_UPLOAD_FAILED", "图片上传失败，请稍后再试。")
    );
    const api = apiStub({ uploadObject });
    const service = createImageService(api, { fetcher });

    const result = await service.uploadListingImages(
      uploadContext(["data:first", "data:second"])
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "STORAGE_UPLOAD_FAILED" }
    });
    expect(uploadObject).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledOnce();
    expect(api.getPublicUrl).not.toHaveBeenCalled();

    const unavailable = createImageService(
      apiStub({
        uploadObject: vi.fn().mockResolvedValue(
          fail("STORAGE_CLIENT_UNAVAILABLE", "图片服务暂时不可用，请稍后再试。")
        )
      }),
      { fetcher: blobFetcher() }
    );
    await expect(
      unavailable.uploadListingImages(
        uploadContext(["data:image/jpeg;base64,AQ=="])
      )
    ).resolves.toMatchObject({
      success: false,
      error: { code: "STORAGE_CLIENT_UNAVAILABLE" }
    });
  });

  it("stops after a middle upload failure without processing later images", async () => {
    const fetcher = blobFetcher("image/jpeg");
    const uploadObject = vi.fn()
      .mockResolvedValueOnce(ok(null))
      .mockResolvedValueOnce(
        fail("STORAGE_UPLOAD_FAILED", "图片上传失败，请稍后再试。")
      );
    const api = apiStub({ uploadObject });
    const service = createImageService(api, { fetcher, now: () => 8 });

    const result = await service.uploadListingImages(
      uploadContext(["data:first", "data:second", "data:third"])
    );

    expect(result).toMatchObject({
      success: false,
      error: { code: "STORAGE_UPLOAD_FAILED" }
    });
    expect(uploadObject).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(api.getPublicUrl).toHaveBeenCalledOnce();
  });

  it("distinguishes callback exceptions from an unavailable context", async () => {
    const api = apiStub();
    const service = createImageService(api, { fetcher: blobFetcher() });
    const checkFailure = await service.uploadListingImages(
      uploadContext(["data:first"], {
        isUploadAvailable: () => {
          throw new Error("availability failed");
        }
      })
    );
    const getUserId = vi.fn()
      .mockReturnValueOnce("guard-user")
      .mockImplementationOnce(() => {
        throw new Error("user lookup failed");
      });
    const userFailure = await service.uploadListingImages(
      uploadContext(["data:first"], { getUserId })
    );

    expect(checkFailure).toMatchObject({
      success: false,
      error: { code: "IMAGE_UPLOAD_CONTEXT_CHECK_FAILED" }
    });
    expect(userFailure).toMatchObject({
      success: false,
      error: { code: "IMAGE_UPLOAD_USER_READ_FAILED" }
    });
    expect(api.uploadObject).not.toHaveBeenCalled();
  });

  it("skips a missing public URL and prepare collapses partial results", async () => {
    const getPublicUrl = vi.fn()
      .mockReturnValueOnce(ok<string | null>(null))
      .mockReturnValueOnce(ok("https://cdn.example/second.jpg"));
    const api = apiStub({ getPublicUrl });
    const service = createImageService(api, {
      fetcher: blobFetcher("image/jpeg"),
      now: () => 5
    });
    const input = uploadContext(["data:first", "data:second"]);

    const direct = await service.uploadListingImages(input);
    expect(direct).toEqual({
      success: true,
      data: ["https://cdn.example/second.jpg"],
      error: null
    });

    const prepareApi = apiStub({
      getPublicUrl: vi.fn()
        .mockReturnValueOnce(ok<string | null>(null))
        .mockReturnValueOnce(ok("https://cdn.example/second.jpg"))
    });
    const prepared = await createImageService(prepareApi, {
      fetcher: blobFetcher("image/jpeg"),
      now: () => 5
    }).prepareCloudListingImages(input);
    expect(prepared).toEqual({ success: true, data: [], error: null });
  });

  it("propagates public URL failures without exposing provider objects", async () => {
    const api = apiStub({
      getPublicUrl: vi.fn(() =>
        fail(
          "STORAGE_PUBLIC_URL_FAILED",
          "无法读取上传后的图片地址，请稍后再试。"
        )
      )
    });
    const result = await createImageService(api, {
      fetcher: blobFetcher("image/jpeg")
    }).prepareCloudListingImages(
      uploadContext(["data:image/jpeg;base64,AQ=="])
    );

    expect(result).toEqual({
      success: false,
      data: null,
      error: {
        code: "STORAGE_PUBLIC_URL_FAILED",
        message: "无法读取上传后的图片地址，请稍后再试。"
      }
    });
  });
});

describe("Avatar image service", () => {
  it("returns an existing short HTTP URL without touching Storage", async () => {
    const api = apiStub();
    const service = createImageService(api, { fetcher: blobFetcher() });
    const avatarUrl = "https://cdn.example/avatar.jpg";

    await expect(service.uploadAvatar({
      userId: "user-1",
      image: avatarUrl
    })).resolves.toEqual({ success: true, data: avatarUrl, error: null });
    expect(api.uploadObject).not.toHaveBeenCalled();
    expect(api.getPublicUrl).not.toHaveBeenCalled();
  });

  it("uploads one PNG avatar with the existing bucket and options", async () => {
    const api = apiStub();
    const service = createImageService(api, {
      fetcher: blobFetcher("image/png", [1, 2, 3]),
      now: () => 12345,
      uniqueId: () => "upload-a"
    });

    await expect(service.uploadAvatar({
      userId: "user-1",
      image: "data:image/png;base64,AQID"
    })).resolves.toEqual({
      success: true,
      data: "https://cdn.example/user-1/avatar/12345-upload-a.png",
      error: null
    });
    expect(api.uploadObject).toHaveBeenCalledOnce();
    expect(api.uploadObject).toHaveBeenCalledWith(expect.objectContaining({
      bucket: "listing-images",
      path: "user-1/avatar/12345-upload-a.png",
      options: {
        cacheControl: "3600",
        contentType: "image/png",
        upsert: true
      }
    }));
    expect(api.getPublicUrl).toHaveBeenCalledWith(
      "listing-images",
      "user-1/avatar/12345-upload-a.png"
    );
  });

  it("uses distinct avatar paths when uploads start in the same millisecond", async () => {
    const api = apiStub();
    const uniqueId = vi.fn()
      .mockReturnValueOnce("upload-a")
      .mockReturnValueOnce("upload-b");
    const service = createImageService(api, {
      fetcher: blobFetcher("image/png"),
      now: () => 12345,
      uniqueId
    });

    await Promise.all([
      service.uploadAvatar({
        userId: "user-1",
        image: "data:image/png;base64,FIRST"
      }),
      service.uploadAvatar({
        userId: "user-1",
        image: "data:image/png;base64,SECOND"
      })
    ]);

    const paths = vi.mocked(api.uploadObject).mock.calls
      .map(([input]) => input.path);
    expect(paths).toEqual([
      "user-1/avatar/12345-upload-a.png",
      "user-1/avatar/12345-upload-b.png"
    ]);
    expect(new Set(paths).size).toBe(2);
  });

  it("keeps a late older upload from overwriting the newer avatar object", async () => {
    let releaseFirst!: () => void;
    let signalFirstStarted!: () => void;
    const firstRelease = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const firstStarted = new Promise<void>((resolve) => {
      signalFirstStarted = resolve;
    });
    const storedObjects = new Map<string, string>();
    const uploadObject = vi.fn(async (input: StorageUploadInput) => {
      if (input.path.endsWith("older.png")) {
        signalFirstStarted();
        await firstRelease;
      }
      storedObjects.set(input.path, await input.body.text());
      return ok(null);
    });
    const api = apiStub({ uploadObject });
    const fetcher: DataUrlFetcher = vi.fn(async (dataUrl) => ({
      blob: async () => new Blob(
        [dataUrl.includes("OLDER") ? "older-bytes" : "newer-bytes"],
        { type: "image/png" }
      )
    }));
    const uniqueId = vi.fn()
      .mockReturnValueOnce("older")
      .mockReturnValueOnce("newer");
    const service = createImageService(api, {
      fetcher,
      now: () => 777,
      uniqueId
    });

    const older = service.uploadAvatar({
      userId: "user-1",
      image: "data:image/png;base64,OLDER"
    });
    await firstStarted;
    const newer = service.uploadAvatar({
      userId: "user-1",
      image: "data:image/png;base64,NEWER"
    });
    await expect(newer).resolves.toMatchObject({
      success: true,
      data: "https://cdn.example/user-1/avatar/777-newer.png"
    });
    releaseFirst();
    await expect(older).resolves.toMatchObject({
      success: true,
      data: "https://cdn.example/user-1/avatar/777-older.png"
    });

    expect(storedObjects).toEqual(new Map([
      ["user-1/avatar/777-newer.png", "newer-bytes"],
      ["user-1/avatar/777-older.png", "older-bytes"]
    ]));
    expect(storedObjects.get("user-1/avatar/777-newer.png")).toBe(
      "newer-bytes"
    );
  });

  it("rejects invalid avatar sources before Storage", async () => {
    const api = apiStub();
    const service = createImageService(api, { fetcher: blobFetcher() });

    for (const input of [
      { userId: "", image: "data:image/png;base64,AAAA" },
      { userId: "user-1", image: "" },
      { userId: "user-1", image: "blob:https://example.com/avatar" },
      { userId: "user-1", image: "ftp://example.com/avatar" }
    ]) {
      await expect(service.uploadAvatar(input)).resolves.toMatchObject({
        success: false
      });
    }
    expect(api.uploadObject).not.toHaveBeenCalled();
  });

  it("propagates upload and public URL failures", async () => {
    const uploadFailure = createImageService(apiStub({
      uploadObject: vi.fn().mockResolvedValue(
        fail("STORAGE_UPLOAD_FAILED", "上传失败")
      )
    }), { fetcher: blobFetcher("image/jpeg") });
    await expect(uploadFailure.uploadAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,AAAA"
    })).resolves.toMatchObject({
      success: false,
      error: { code: "STORAGE_UPLOAD_FAILED" }
    });

    const publicUrlFailure = createImageService(apiStub({
      getPublicUrl: vi.fn(() =>
        fail("STORAGE_PUBLIC_URL_FAILED", "公开地址读取失败")
      )
    }), { fetcher: blobFetcher("image/jpeg") });
    await expect(publicUrlFailure.uploadAvatar({
      userId: "user-1",
      image: "data:image/jpeg;base64,AAAA"
    })).resolves.toMatchObject({
      success: false,
      error: { code: "STORAGE_PUBLIC_URL_FAILED" }
    });
  });

  it("rejects missing or unsafe public avatar URLs", async () => {
    for (const value of [
      null,
      "data:image/jpeg;base64,AAAA",
      "blob:https://example.com/avatar"
    ]) {
      const service = createImageService(apiStub({
        getPublicUrl: vi.fn(() => ok(value))
      }), { fetcher: blobFetcher("image/jpeg") });
      await expect(service.uploadAvatar({
        userId: "user-1",
        image: "data:image/jpeg;base64,AAAA"
      })).resolves.toMatchObject({
        success: false,
        error: { code: "AVATAR_PUBLIC_URL_INVALID" }
      });
    }
  });
});
