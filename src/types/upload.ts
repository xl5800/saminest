export const LISTING_IMAGES_BUCKET = "listing-images" as const;

export type ListingImagesBucket = typeof LISTING_IMAGES_BUCKET;

export interface StorageUploadOptions {
  cacheControl: "3600";
  contentType: string;
  upsert: true;
}

export interface StorageUploadInput {
  bucket: ListingImagesBucket;
  path: string;
  body: Blob;
  options: StorageUploadOptions;
}

export interface ListingImagesUploadInput {
  listingId: string;
  images: string[];
  isUploadAvailable(): boolean;
  getUserId(): string;
}
