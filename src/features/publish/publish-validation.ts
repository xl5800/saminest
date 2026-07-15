import { normalizeImages, typeLabel } from "../posts/post-mappers";
import { fail, ok, type Result } from "../../services/result";
import type {
  ListingWritePayload,
  PublishListing,
  PublishValidationData,
  PublishValidationInput
} from "../../types/publish";

export function mapStatusToDb(status: unknown): string {
  if (status === "expired") return "expired";
  return status === "active" ? "approved" : String(status || "pending");
}

export function mapTypeToDb(
  type: PublishListing["type"]
): "rental" | "secondhand" {
  return type === "used" ? "secondhand" : "rental";
}

export function parsePriceNumber(value: unknown): number {
  const matched = String(value || "")
    .replace(/,/g, "")
    .match(/\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : 0;
}

export function normalizeDateValue(value: unknown): string | null {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

export function listingImages(
  listing: PublishListing,
  fallbackImages: readonly string[] = []
): string[] {
  const explicitImages = [
    ...normalizeImages(listing.images),
    ...normalizeImages(listing.imageDataUrls),
    ...normalizeImages(listing.imageUrls),
    ...normalizeImages(listing.image_url)
  ];
  if (explicitImages.length) return [...new Set(explicitImages)];

  const image = String(
    listing.image || listing.imageDataUrl || listing.coverImage || ""
  );
  const isFallback = fallbackImages.includes(image);
  return image && (!isFallback || listing.photoCount) ? [image] : [];
}

export function uiListingToDb(
  listing: PublishListing,
  userId: string,
  fallbackImages: readonly string[] = []
): ListingWritePayload {
  const images = listingImages(listing, fallbackImages);
  return {
    user_id: userId,
    type: mapTypeToDb(listing.type),
    status: mapStatusToDb(listing.status),
    title: listing.title,
    description: listing.desc || "暂无详细描述。",
    price: parsePriceNumber(listing.price),
    area: listing.area,
    category:
      listing.type === "wanted"
        ? "wanted"
        : listing.roomType || listing.tags?.[0] || typeLabel(listing.type),
    move_in: normalizeDateValue(listing.moveIn),
    nearby: Array.isArray(listing.tags)
      ? [
          ...new Set(
            [listing.roomType, listing.moveIn, ...listing.tags].filter(Boolean)
          )
        ].join(", ")
      : "",
    image_url:
      images.length > 1
        ? JSON.stringify(images)
        : images[0] || listing.image || null,
    contact: listing.contact || "站内消息"
  };
}

export function validatePublishInput(
  input: PublishValidationInput
): Result<PublishValidationData> {
  const title = String(input.title || "").trim();
  if (!title) {
    return fail("PUBLISH_TITLE_REQUIRED", "请填写标题。");
  }

  return ok({
    title,
    price: parsePriceNumber(input.price)
  });
}
