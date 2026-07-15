import type { ListingImageWriteRow } from "../../types/publish";
import { fail, ok, type Result } from "../result";
import {
  getSupabaseClient,
  type SupabaseClient
} from "../supabase/client";

interface QueryResponse {
  error: unknown;
}

interface ListingImagesDeleteQuery {
  eq(column: "listing_id", listingId: string): Promise<QueryResponse>;
}

interface ListingImagesWriteTable {
  delete(): ListingImagesDeleteQuery;
  insert(rows: ListingImageWriteRow[]): Promise<QueryResponse>;
}

interface ListingImagesWriteClient {
  from(table: "listing_images"): ListingImagesWriteTable;
}

export type ListingImagesWriteClientGetter = () => SupabaseClient | null;

export interface ListingImagesWriteApi {
  replaceListingImages(
    listingId: string,
    images: string[]
  ): Promise<Result<null>>;
}

function unavailable<T>(): Result<T> {
  return fail(
    "LISTING_IMAGES_WRITE_CLIENT_UNAVAILABLE",
    "帖子图片服务暂时不可用，请稍后再试。"
  );
}

function writeClient(
  getClient: ListingImagesWriteClientGetter
): Result<ListingImagesWriteClient> {
  try {
    const client = getClient() as ListingImagesWriteClient | null;
    return client?.from ? ok(client) : unavailable();
  } catch {
    return unavailable();
  }
}

export function createListingImagesWriteApi(
  getClient: ListingImagesWriteClientGetter = getSupabaseClient
): ListingImagesWriteApi {
  return {
    async replaceListingImages(listingId, images) {
      const client = writeClient(getClient);
      if (!client.success) return client;
      if (!listingId) {
        return fail(
          "LISTING_IMAGES_LISTING_ID_REQUIRED",
          "无法确认帖子图片所属帖子。"
        );
      }

      try {
        const deleted = await client.data
          .from("listing_images")
          .delete()
          .eq("listing_id", listingId);
        if (deleted.error) {
          return fail(
            "LISTING_IMAGES_CLEAR_FAILED",
            "图片记录保存失败，请稍后再试。"
          );
        }

        const cleanImages = [
          ...new Set(images.filter((image): image is string => Boolean(image)))
        ];
        if (!cleanImages.length) return ok(null);

        const rows = cleanImages.map<ListingImageWriteRow>(
          (imageUrl, index) => ({
            listing_id: listingId,
            image_url: imageUrl,
            sort_order: index
          })
        );
        const inserted = await client.data
          .from("listing_images")
          .insert(rows);
        if (inserted.error) {
          return fail(
            "LISTING_IMAGES_INSERT_FAILED",
            "图片记录保存失败，请稍后再试。"
          );
        }
        return ok(null);
      } catch {
        return fail(
          "LISTING_IMAGES_WRITE_FAILED",
          "图片记录保存失败，请稍后再试。"
        );
      }
    }
  };
}

export const listingImagesWriteApi = createListingImagesWriteApi();
