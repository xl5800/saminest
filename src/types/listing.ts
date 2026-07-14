import type { ProfilesMap } from "./profile";

export type ListingType = "rent" | "wanted" | "used";

export interface SupabaseListingRow {
  id: string;
  user_id: string;
  type: string | null;
  status: string | null;
  title: string;
  description: string | null;
  price: number | string | null;
  area: string;
  category: string | null;
  move_in: string | null;
  nearby: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  image_url: unknown;
  contact: string | null;
  is_featured?: boolean | null;
  reported_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  expires_at?: string | null;
  [key: string]: unknown;
}

export interface ListingImageRow {
  listing_id: string;
  image_url: string | null;
  sort_order: number | null;
}

export interface UiListing {
  id: string;
  type: ListingType;
  title: string;
  price: string;
  area: string;
  time: string;
  tags: string[];
  detailTags: string[];
  photoCount: number;
  image: string;
  images: string[];
  desc: string;
  roomType: string;
  moveIn: string;
  contact: string;
  owner: string;
  ownerAvatar: string;
  ownerAccount: string;
  mine: boolean;
  status: string;
  reportedCount: number;
  createdAt: number;
}

export type ListingImagesMap = Record<string, string[]>;

export interface ListingMappingContext {
  currentUserId: string;
  getCurrentUserId?: () => string;
  fallbackImages: Record<ListingType, string>;
  now?: number;
}

export interface ListingMappingInput {
  row: SupabaseListingRow;
  profiles?: ProfilesMap;
  images?: ListingImagesMap;
  context: ListingMappingContext;
}
