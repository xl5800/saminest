import type { SupabaseListingRow } from "../../types/listing";
import type { ListingWritePayload } from "../../types/publish";
import { fail, ok, type Result } from "../result";
import {
  getSupabaseClient,
  type SupabaseClient
} from "../supabase/client";

interface QueryResponse<T> {
  data: T | null;
  error: unknown;
}

interface SelectSingleQuery<T> {
  select(): {
    single(): Promise<QueryResponse<T>>;
  };
}

interface UpdateFilter<T> {
  eq(column: "id", id: string): SelectSingleQuery<T>;
}

interface MutationFilter {
  eq(column: "id", id: string): Promise<QueryResponse<unknown>>;
}

interface ListingsWriteTable {
  insert(payload: ListingWritePayload): SelectSingleQuery<SupabaseListingRow>;
  update(
    payload: ListingWritePayload
  ): UpdateFilter<SupabaseListingRow>;
  update(payload: Pick<ListingWritePayload, "image_url">): MutationFilter;
  delete(): MutationFilter;
}

interface ListingsWriteClient {
  from(table: "listings"): ListingsWriteTable;
}

export type ListingWriteClientGetter = () => SupabaseClient | null;

export interface ListingWriteApi {
  insertListing(
    payload: ListingWritePayload
  ): Promise<Result<SupabaseListingRow>>;
  updateListing(
    id: string,
    payload: ListingWritePayload
  ): Promise<Result<SupabaseListingRow>>;
  updateListingImageUrl(
    id: string,
    imageUrl: string | null
  ): Promise<Result<null>>;
  deleteListing(id: string): Promise<Result<null>>;
}

function unavailable<T>(): Result<T> {
  return fail(
    "LISTINGS_WRITE_CLIENT_UNAVAILABLE",
    "发布服务暂时不可用，请稍后再试。"
  );
}

function writeClient(
  getClient: ListingWriteClientGetter
): Result<ListingsWriteClient> {
  try {
    const client = getClient() as ListingsWriteClient | null;
    return client?.from ? ok(client) : unavailable();
  } catch {
    return unavailable();
  }
}

export function createListingWriteApi(
  getClient: ListingWriteClientGetter = getSupabaseClient
): ListingWriteApi {
  return {
    async insertListing(payload) {
      const client = writeClient(getClient);
      if (!client.success) return client;

      try {
        const response = await client.data
          .from("listings")
          .insert(payload)
          .select()
          .single();
        if (response.error || !response.data) {
          return fail("LISTING_INSERT_FAILED", "发布失败，请稍后再试。");
        }
        return ok(response.data);
      } catch {
        return fail("LISTING_INSERT_FAILED", "发布失败，请稍后再试。");
      }
    },

    async updateListing(id, payload) {
      const client = writeClient(getClient);
      if (!client.success) return client;

      try {
        const response = await client.data
          .from("listings")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
        if (response.error || !response.data) {
          return fail("LISTING_UPDATE_FAILED", "发布失败，请稍后再试。");
        }
        return ok(response.data);
      } catch {
        return fail("LISTING_UPDATE_FAILED", "发布失败，请稍后再试。");
      }
    },

    async updateListingImageUrl(id, imageUrl) {
      const client = writeClient(getClient);
      if (!client.success) return client;

      try {
        const response = await client.data
          .from("listings")
          .update({ image_url: imageUrl })
          .eq("id", id);
        if (response.error) {
          return fail(
            "LISTING_IMAGE_URL_UPDATE_FAILED",
            "图片保存失败，请稍后再试。"
          );
        }
        return ok(null);
      } catch {
        return fail(
          "LISTING_IMAGE_URL_UPDATE_FAILED",
          "图片保存失败，请稍后再试。"
        );
      }
    },

    async deleteListing(id) {
      const client = writeClient(getClient);
      if (!client.success) return client;

      try {
        const response = await client.data
          .from("listings")
          .delete()
          .eq("id", id);
        if (response.error) {
          return fail(
            "LISTING_DELETE_FAILED",
            "发布失败后的数据清理未完成。"
          );
        }
        return ok(null);
      } catch {
        return fail(
          "LISTING_DELETE_FAILED",
          "发布失败后的数据清理未完成。"
        );
      }
    }
  };
}

export const listingWriteApi = createListingWriteApi();
