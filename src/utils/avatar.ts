export const AVATAR_METADATA_URL_MAX_LENGTH = 2048;

export function isLegacyAvatarDataUrl(value: unknown): value is string {
  return (
    typeof value === "string"
    && /^data:image\/[a-z0-9.+-]+;base64,/.test(value)
  );
}

export function isUnsafeAvatarMetadataValue(value: unknown): boolean {
  return (
    typeof value === "string"
    && /^(?:data|blob):/i.test(value.trim())
  );
}

export function isSafeAvatarMetadataUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value || value !== value.trim()) {
    return false;
  }
  if (value.length > AVATAR_METADATA_URL_MAX_LENGTH) return false;
  if (isUnsafeAvatarMetadataValue(value)) return false;

  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:")
      && Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

export function isAllowedAvatarMetadataValue(value: unknown): boolean {
  return value === "" || isSafeAvatarMetadataUrl(value);
}
