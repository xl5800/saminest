import type { ListingType } from "./listing";

export interface PublishListing {
  id: string;
  type: ListingType;
  title: string;
  price: string;
  area: string;
  status: string;
  time?: string;
  desc?: string;
  roomType?: string;
  moveIn?: string;
  contact?: string;
  tags?: string[];
  detailTags?: string[];
  photoCount?: number;
  image?: string;
  images?: string[];
  imageUrls?: string[];
  imageDataUrls?: string[];
  imageDataUrl?: string;
  image_url?: unknown;
  coverImage?: string;
  owner?: string;
  ownerAvatar?: string;
  ownerAccount?: string;
  mine?: boolean;
  reportedCount?: number;
  createdAt?: number;
  [key: string]: unknown;
}

export interface ListingWritePayload {
  user_id: string;
  type: "rental" | "secondhand";
  status: string;
  title: string;
  description: string;
  price: number;
  area: string;
  category: string;
  move_in: string | null;
  nearby: string;
  image_url: string | null;
  contact: string;
}

export interface ListingImageWriteRow {
  listing_id: string;
  image_url: string;
  sort_order: number;
}

export interface PublishValidationInput {
  title: unknown;
  price?: unknown;
}

export interface PublishValidationData {
  title: string;
  price: number;
}
