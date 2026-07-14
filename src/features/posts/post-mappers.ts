import type {
  ListingImageRow,
  ListingImagesMap,
  ListingMappingInput,
  ListingType,
  SupabaseListingRow,
  UiListing
} from "../../types/listing";
import type { ProfileRow, ProfilesMap } from "../../types/profile";

export function mapStatusFromDb(status: string | null): string {
  if (status === "expired") return "expired";
  return status === "approved" ? "active" : status || "pending";
}

export function mapTypeFromDb(row: SupabaseListingRow): ListingType {
  if (row.category === "wanted") return "wanted";
  return row.type === "secondhand" ? "used" : "rent";
}

export function formatDbPrice(row: SupabaseListingRow): string {
  const amount = Number(row.price || 0);
  if (!amount) return "价格面议";
  return row.type === "rental" ? `$${amount}/月` : `$${amount}`;
}

export function formatMonthDay(value: unknown): string {
  const date = new Date((value || Date.now()) as string | number);
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function timeAgo(value: unknown, now = Date.now()): string {
  const time = new Date((value || now) as string | number).getTime();
  const diff = Math.max(0, now - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return formatMonthDay(time);
}

export function normalizeImages(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean) as string[];
  const text = String(value || "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(text);
      return Array.isArray(parsed) ? (parsed.filter(Boolean) as string[]) : [];
    } catch {
      return [];
    }
  }
  return [text];
}

export function typeLabel(type: string): string {
  return { rent: "房源", wanted: "求租", used: "二手" }[type] || "帖子";
}

export function profilesToMap(rows: ProfileRow[]): ProfilesMap {
  return Object.fromEntries(rows.map((profile) => [profile.id, profile]));
}

export function listingImagesToMap(
  rows: ListingImageRow[]
): ListingImagesMap {
  return rows.reduce<ListingImagesMap>((map, item) => {
    map[item.listing_id] ||= [];
    if (item.image_url) map[item.listing_id].push(item.image_url);
    return map;
  }, {});
}

export function dbListingToUi(input: ListingMappingInput): UiListing {
  const { row, context } = input;
  const profileMap = input.profiles || {};
  const imageMap = input.images || {};
  const type = mapTypeFromDb(row);
  const tags = String(row.nearby || row.category || "")
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const ownerProfile = profileMap[row.user_id];
  const ownerName =
    ownerProfile?.display_name || ownerProfile?.email || "发布者";
  const ownerAvatar = ownerProfile?.avatar_url || "";
  const images = [
    ...new Set([
      ...(imageMap[row.id] || []),
      ...normalizeImages(row.image_url)
    ])
  ];
  const now = context.now ?? Date.now();
  const currentUserId = context.getCurrentUserId?.() ?? context.currentUserId;

  return {
    id: row.id,
    type,
    title: row.title,
    price: formatDbPrice(row),
    area: row.area,
    time: timeAgo(row.created_at, now),
    tags,
    detailTags: tags.length ? tags : [typeLabel(type)],
    photoCount: images.length,
    image:
      images[0] ||
      context.fallbackImages[type] ||
      context.fallbackImages.used,
    images,
    desc: row.description || "",
    roomType: row.category || "",
    moveIn: row.move_in || "",
    contact: row.contact || "站内消息",
    owner: ownerName,
    ownerAvatar,
    ownerAccount: row.user_id,
    mine: row.user_id === currentUserId,
    status: mapStatusFromDb(row.status),
    reportedCount: row.reported_count || 0,
    createdAt: new Date((row.created_at || now) as string | number).getTime()
  };
}
