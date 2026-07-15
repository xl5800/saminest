import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const legacyPath = fileURLToPath(
  new URL("../../../public/legacy-app.js", import.meta.url)
);
const legacySource = readFileSync(legacyPath, "utf8");

function functionSource(name) {
  const marker = `async function ${name}`;
  const start = legacySource.indexOf(marker);
  if (start < 0) throw new Error(`Missing legacy function: ${name}`);
  const bodyStart = legacySource.indexOf("{", start);
  let depth = 0;
  for (let index = bodyStart; index < legacySource.length; index += 1) {
    if (legacySource[index] === "{") depth += 1;
    if (legacySource[index] === "}") depth -= 1;
    if (depth === 0) return legacySource.slice(start, index + 1);
  }
  throw new Error(`Unclosed legacy function: ${name}`);
}

function legacyAdapter(name, service, logger = { warn: vi.fn() }) {
  const factory = new Function(
    "imageUploadModule",
    "cloudReady",
    "currentUserId",
    "console",
    `return (${functionSource(name)});`
  );
  return factory(
    () => service,
    () => true,
    () => "user-1",
    logger
  );
}

function failure(code, message = "稳定错误") {
  return { success: false, data: null, error: { code, message } };
}

describe("Legacy listing image adapters", () => {
  it("maps upload response and invalid-context failures to an empty array", async () => {
    const logger = { warn: vi.fn() };
    const providerFailure = legacyAdapter(
      "uploadListingImagesToSupabase",
      {
        uploadListingImages: vi.fn().mockResolvedValue(
          failure("STORAGE_UPLOAD_FAILED")
        )
      },
      logger
    );
    const contextFailure = legacyAdapter(
      "uploadListingImagesToSupabase",
      {
        uploadListingImages: vi.fn().mockResolvedValue(
          failure("IMAGE_UPLOAD_CONTEXT_INVALID")
        )
      },
      logger
    );

    await expect(providerFailure("listing", ["data:x"]))
      .resolves.toEqual([]);
    await expect(contextFailure("listing", ["data:x"]))
      .resolves.toEqual([]);
    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it("throws sanitized Errors for request, URL, conversion, and callback failures", async () => {
    const codes = [
      "STORAGE_UPLOAD_REQUEST_FAILED",
      "STORAGE_PUBLIC_URL_FAILED",
      "IMAGE_DATA_URL_CONVERSION_FAILED",
      "IMAGE_UPLOAD_CONTEXT_CHECK_FAILED",
      "IMAGE_UPLOAD_USER_READ_FAILED"
    ];

    for (const code of codes) {
      const adapter = legacyAdapter("prepareCloudListingImages", {
        prepareCloudListingImages: vi.fn().mockResolvedValue(
          failure(code, `stable:${code}`)
        )
      });
      await expect(adapter("listing", ["data:x"]))
        .rejects.toThrow(`stable:${code}`);
    }
  });

  it("returns service success data unchanged, including a collapsed empty list", async () => {
    const images = ["https://example/existing.jpg"];
    const passthrough = legacyAdapter("prepareCloudListingImages", {
      prepareCloudListingImages: vi.fn().mockResolvedValue({
        success: true,
        data: images,
        error: null
      })
    });
    const missingPublicUrl = legacyAdapter("prepareCloudListingImages", {
      prepareCloudListingImages: vi.fn().mockResolvedValue({
        success: true,
        data: [],
        error: null
      })
    });

    await expect(passthrough("listing", images)).resolves.toBe(images);
    await expect(missingPublicUrl("listing", ["data:x"]))
      .resolves.toEqual([]);
  });
});
