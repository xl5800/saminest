import { fail, ok, type Result } from "../result";
import {
  getSupabaseClient,
  type SupabaseClient
} from "../supabase/client";
import type {
  ListingImageRow,
  SupabaseListingRow
} from "../../types/listing";

interface QueryResponse<T> {
  data: T | null;
  error: unknown;
  status?: number;
  statusText?: string;
}

interface ListingsTable {
  select(columns: "*"): {
    order(
      column: "created_at",
      options: { ascending: false }
    ): Promise<QueryResponse<SupabaseListingRow[]>>;
    eq(column: "id", id: string): {
      maybeSingle(): Promise<QueryResponse<SupabaseListingRow>>;
    };
  };
}

interface ListingImagesTable {
  select(columns: "listing_id,image_url,sort_order"): {
    in(column: "listing_id", ids: string[]): {
      order(
        column: "sort_order",
        options: { ascending: true }
      ): Promise<QueryResponse<ListingImageRow[]>>;
    };
  };
}

interface PostsReadClient {
  from(table: "listings"): ListingsTable;
  from(table: "listing_images"): ListingImagesTable;
}

export type PostsClientGetter = () => SupabaseClient | null;

export interface PostsApi {
  listListings(): Promise<Result<SupabaseListingRow[]>>;
  getListingById(id: string): Promise<Result<SupabaseListingRow | null>>;
  listListingImages(ids: string[]): Promise<Result<ListingImageRow[]>>;
}

function unavailable<T>(): Result<T> {
  return fail(
    "POSTS_CLIENT_UNAVAILABLE",
    "帖子服务暂时不可用，请稍后再试。"
  );
}

function readFailure<T>(code: string, message: string): Result<T> {
  return fail(code, message);
}

function normalizeError(error: unknown): {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
} {
  if (!error || typeof error !== "object") {
    return {};
  }

  const source = error as Record<string, unknown>;

  return {
    code: source.code,
    message: source.message,
    details: source.details,
    hint: source.hint
  };
}

export function createPostsApi(
  getClient: PostsClientGetter = getSupabaseClient
): PostsApi {
  const client = (): Result<PostsReadClient> => {
    try {
      const value = getClient() as PostsReadClient | null;
      return value?.from ? ok(value) : unavailable();
    } catch {
      return unavailable();
    }
  };

  return {
    async listListings() {
      const port = client();
      if (!port.success) return port;

      try {
        const response = await port.data
          .from("listings")
          .select("*")
          .order("created_at", { ascending: false });

        if (response.error) {
          return readFailure(
            "LISTINGS_READ_FAILED",
            "帖子列表暂时无法加载。"
          );
        }

        return ok(response.data || []);
      } catch {
        return readFailure(
          "LISTINGS_READ_FAILED",
          "帖子列表暂时无法加载。"
        );
      }
    },

    async getListingById(id) {
      const port = client();
      if (!port.success) return port;

      try {
        const response = await port.data
          .from("listings")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        if (response.error) {
          return readFailure(
            "LISTING_READ_FAILED",
            "帖子详情暂时无法加载。"
          );
        }

        return ok(response.data || null);
      } catch {
        return readFailure(
          "LISTING_READ_FAILED",
          "帖子详情暂时无法加载。"
        );
      }
    },

    async listListingImages(ids) {
      const port = client();
      if (!port.success) return port;

      try {
        console.log(
          "[DEBUG] listing image ids.length =",
          ids.length
        );
        console.log("[DEBUG] listing image ids =", ids);

        const response = await port.data
          .from("listing_images")
          .select("listing_id,image_url,sort_order")
          .in("listing_id", ids)
          .order("sort_order", { ascending: true });

        console.log("[DEBUG] listing_images response =", {
          status: response.status,
          statusText: response.statusText,
          hasData: Array.isArray(response.data),
          dataLength: Array.isArray(response.data)
            ? response.data.length
            : null,
          hasError: Boolean(response.error)
        });

        if (response.error) {
          const error = normalizeError(response.error);

          console.error("[DEBUG] listing_images error =", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            status: response.status,
            statusText: response.statusText
          });

          return readFailure(
            "LISTING_IMAGES_READ_FAILED",
            "帖子图片暂时无法加载。"
          );
        }

        return ok(response.data || []);
      } catch (error) {
        console.error(
          "[DEBUG] listing_images unexpected exception =",
          error
        );

        return readFailure(
          "LISTING_IMAGES_READ_FAILED",
          "帖子图片暂时无法加载。"
        );
      }
    }
  };
}

export const postsApi = createPostsApi();