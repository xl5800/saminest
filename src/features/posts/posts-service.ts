import { fail, ok, type Result } from "../../services/result";
import {
  postsApi,
  type PostsApi
} from "../../services/api/posts-api";
import {
  profilesReadApi,
  type ProfilesReadApi
} from "../../services/api/profiles-read-api";
import type {
  ListingImagesMap,
  ListingMappingContext,
  SupabaseListingRow,
  UiListing
} from "../../types/listing";
import type { ProfilesMap } from "../../types/profile";
import {
  dbListingToUi,
  formatMonthDay,
  listingImagesToMap,
  normalizeImages,
  profilesToMap,
  timeAgo,
  typeLabel
} from "./post-mappers";

export interface PostsService {
  fetchProfilesMap(userIds: string[]): Promise<Result<ProfilesMap>>;
  fetchListingImagesMap(
    listingIds: string[]
  ): Promise<Result<ListingImagesMap>>;
  loadListings(
    context: ListingMappingContext
  ): Promise<Result<UiListing[]>>;
  fetchListingById(
    id: string,
    context: ListingMappingContext
  ): Promise<Result<UiListing | null>>;
}

export interface PostsBridge {
  service: PostsService;
  mappers: {
    dbListingToUi: typeof dbListingToUi;
    normalizeImages: typeof normalizeImages;
    timeAgo: typeof timeAgo;
    formatMonthDay: typeof formatMonthDay;
    typeLabel: typeof typeLabel;
  };
}

function uniqueIds(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function serviceFailure<T>(): Result<T> {
  return fail("POSTS_READ_FAILED", "帖子数据暂时无法加载。");
}

export function createPostsService(
  api: PostsApi = postsApi,
  profileApi: ProfilesReadApi = profilesReadApi
): PostsService {
  const fetchProfilesMap = async (
    userIds: string[]
  ): Promise<Result<ProfilesMap>> => {
    const ids = uniqueIds(userIds);
    if (!ids.length) return ok({});
    try {
      const result = await profileApi.listProfiles(ids);
      return result.success ? ok(profilesToMap(result.data)) : result;
    } catch {
      return serviceFailure();
    }
  };

  const fetchListingImagesMap = async (
    listingIds: string[]
  ): Promise<Result<ListingImagesMap>> => {
    const ids = uniqueIds(listingIds);
    if (!ids.length) return ok({});
    try {
      const result = await api.listListingImages(ids);
      return result.success ? ok(listingImagesToMap(result.data)) : result;
    } catch {
      return serviceFailure();
    }
  };

  const enrichRows = async (
    rows: SupabaseListingRow[],
    context: ListingMappingContext
  ): Promise<UiListing[]> => {
    const profiles = await fetchProfilesMap(rows.map((row) => row.user_id));
    const images = await fetchListingImagesMap(rows.map((row) => row.id));
    const profileMap = profiles.success ? profiles.data : {};
    const imageMap = images.success ? images.data : {};
    return rows.map((row) =>
      dbListingToUi({ row, profiles: profileMap, images: imageMap, context })
    );
  };

  return {
    fetchProfilesMap,
    fetchListingImagesMap,

    async loadListings(context) {
      try {
        const result = await api.listListings();
        if (!result.success) return result;
        return ok(await enrichRows(result.data, context));
      } catch {
        return serviceFailure();
      }
    },

    async fetchListingById(id, context) {
      if (!id) return ok(null);
      try {
        const result = await api.getListingById(id);
        if (!result.success) return result;
        if (!result.data) return ok(null);
        const listings = await enrichRows([result.data], context);
        return ok(listings[0] || null);
      } catch {
        return serviceFailure();
      }
    }
  };
}

export function createPostsBridge(
  service: PostsService = createPostsService()
): PostsBridge {
  return {
    service,
    mappers: {
      dbListingToUi,
      normalizeImages,
      timeAgo,
      formatMonthDay,
      typeLabel
    }
  };
}
