import { describe, expect, it } from "vitest";
import {
  AVATAR_METADATA_URL_MAX_LENGTH,
  isAllowedAvatarMetadataValue,
  isLegacyAvatarDataUrl,
  isSafeAvatarMetadataUrl,
  isUnsafeAvatarMetadataValue
} from "./avatar";

describe("Avatar metadata safety", () => {
  it("recognizes legacy image Data URLs", () => {
    expect(isLegacyAvatarDataUrl("data:image/jpeg;base64,AAAA")).toBe(true);
    expect(isLegacyAvatarDataUrl("DATA:image/png;base64,AAAA")).toBe(false);
    expect(isLegacyAvatarDataUrl("data:text/plain;base64,AAAA")).toBe(false);
    expect(isLegacyAvatarDataUrl("blob:https://example.com/avatar")).toBe(false);
  });

  it("accepts only short HTTP or HTTPS metadata URLs", () => {
    expect(isSafeAvatarMetadataUrl("https://cdn.example/avatar.jpg")).toBe(true);
    expect(isSafeAvatarMetadataUrl("http://localhost/avatar.jpg")).toBe(true);
    expect(isSafeAvatarMetadataUrl("/storage/avatar.jpg")).toBe(false);
    expect(isSafeAvatarMetadataUrl("ftp://cdn.example/avatar.jpg")).toBe(false);
    expect(isSafeAvatarMetadataUrl(" https://cdn.example/avatar.jpg")).toBe(false);
    expect(
      isSafeAvatarMetadataUrl(
        `https://cdn.example/${"a".repeat(AVATAR_METADATA_URL_MAX_LENGTH)}`
      )
    ).toBe(false);
  });

  it("rejects Data and Blob values while allowing explicit clearing", () => {
    expect(isUnsafeAvatarMetadataValue("data:image/png;base64,AAAA")).toBe(true);
    expect(isUnsafeAvatarMetadataValue("blob:https://example.com/avatar")).toBe(true);
    expect(isAllowedAvatarMetadataValue("data:image/png;base64,AAAA")).toBe(false);
    expect(isAllowedAvatarMetadataValue("blob:https://example.com/avatar")).toBe(false);
    expect(isAllowedAvatarMetadataValue("")).toBe(true);
  });
});
