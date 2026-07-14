const STORAGE_KEY = "saminestLocalV1";
const ADMIN_EMAIL = "xlw0980@gmail.com";
const SITE_URL = "https://www.saminest.com";
const DEFAULT_SEO = {
  title: "Saminest | DMV 华语租房、二手与本地信息",
  description: "Saminest 是面向 DMV 华语社区的租房、求租、二手和本地信息发布平台，支持邮箱验证、图片发布、收藏、站内消息和举报。",
  image: `${SITE_URL}/og-image.png`,
  url: SITE_URL
};
// test git
const seedListings = [
  {
    id: "rent-rockville",
    type: "rent",
    title: "Rockville 单间出租，近地铁和超市",
    price: "$850/月",
    area: "Rockville, MD",
    time: "12分钟前",
    tags: ["可立即入住", "包水电"],
    detailTags: ["单间", "拎包入住", "近地铁"],
    photoCount: 6,
    image:
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=700&q=80",
    desc:
      "独立屋内单间出租，家具齐全，步行可到超市和公交站。适合学生或上班族，室友安静，公共区域保持干净。",
    owner: "Rockville 房东"
  },
  {
    id: "rent-wanted-bethesda",
    type: "wanted",
    title: "求租 Bethesda / Rockville 附近单间",
    price: "预算 $900/月",
    area: "Bethesda / Rockville",
    time: "28分钟前",
    tags: ["女生", "无宠物", "8月入住"],
    detailTags: ["近红线", "独立卫浴优先", "长租"],
    photoCount: 0,
    image:
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=80",
    desc:
      "求租 Bethesda 或 Rockville 附近单间，希望交通方便、室友安静，可从 8 月开始入住。预算 900 美元左右。",
    owner: "Lisa Chen"
  },
  {
    id: "used-macbook",
    type: "used",
    title: "MacBook Pro 14 寸 9 成新，带原装充电器",
    price: "$980",
    area: "College Park, MD",
    time: "36分钟前",
    tags: ["可小刀", "自取"],
    detailTags: ["13英寸", "M1芯片", "8G+256G"],
    photoCount: 5,
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=80",
    desc:
      "自用电脑，外观保持很好，电池健康正常。适合学习、办公和轻度剪辑，可当面验机。",
    owner: "陈同学"
  },
  {
    id: "used-desk",
    type: "used",
    title: "IKEA 书桌和办公椅打包转让",
    price: "$120",
    area: "Fairfax, VA",
    time: "1小时前",
    tags: ["可自取", "家具"],
    detailTags: ["书桌", "办公椅", "可拆装"],
    photoCount: 4,
    image:
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=700&q=80",
    desc:
      "书桌和办公椅状态良好，搬家出清，适合学生或居家办公。Fairfax 自取，可帮忙搬到楼下。",
    owner: "Fairfax 卖家"
  }
];

const categories = [
  { key: "rent", name: "租房", icon: "房" },
  { key: "wanted", name: "求租", icon: "求" },
  { key: "used", name: "二手", icon: "物" }
];

const fallbackImages = {
  rent: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=700&q=80",
  wanted: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=700&q=80",
  used: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=700&q=80"
};

const app = document.querySelector("#app");
const supabaseConfig = window.SAMINEST_SUPABASE_CONFIG || window.DMV_SUPABASE_CONFIG || {};
let supabaseClient = null;
let supabaseLoadFailed = false;
let state = loadState();
ensureStateDefaults();

function initializeSupabaseClient() {
  const client = window.SaminestModules?.supabase?.getClient() || null;
  if (client) supabaseClient = client;
  return supabaseClient;
}

function loadState() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Local storage is unavailable; using temporary state", error);
  }
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Continue with the built-in fallback state.
      }
    }
  }

  return {
    session: { loggedIn: false },
    user: { name: "xlw0980", subtitle: "Saminest", avatar: "S" },
    listings: seedListings,
    favorites: ["rent-rockville"],
    drafts: [],
    history: [],
    conversations: [],
    feedback: []
  };
}

function ensureStateDefaults() {
  state.session ||= { loggedIn: false };
  state.user ||= { name: "xlw0980", subtitle: "Saminest", avatar: "S" };
  state.accounts ||= {};
  if (!state.accounts["admin@dmv.test"]) {
    state.accounts["admin@dmv.test"] = { name: "管理员", password: "admin123", role: "admin", email: "admin@dmv.test" };
  }
  state.reports ||= [];
  state.messageReads ||= {};
  state.bannedUsers ||= [];
  state.listings ||= seedListings;
  state.listings = state.listings.map((item) => {
    const ownerAccount = item.ownerAccount || `seed:${item.owner || item.id}`;
    return {
      status: "active",
      reports: [],
      ownerAccount,
      contact: item.contact || "站内消息",
      createdAt: item.createdAt || 1,
      ...item,
      ownerAccount
    };
  });
  state.favorites ||= [];
  state.drafts ||= [];
  state.history ||= [];
  state.conversations ||= [];
  state.feedback ||= [];
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to persist local state", error);
  }
}

function cloudReady() {
  return Boolean(supabaseClient?.auth);
}

function cloudConfigured() {
  return Boolean(supabaseConfig.url && supabaseConfig.anonKey);
}

function cloudLoadingMessage(service = "登录") {
  return supabaseLoadFailed
    ? `${service}服务暂时不可用，请检查网络后刷新重试。`
    : `${service}服务正在加载，请稍候再试。`;
}

function currentUserId() {
  return state.session?.userId || "";
}

function mapStatusFromDb(status) {
  if (status === "expired") return "expired";
  return status === "approved" ? "active" : status || "pending";
}

function mapStatusToDb(status) {
  if (status === "expired") return "expired";
  return status === "active" ? "approved" : status || "pending";
}

function mapTypeFromDb(row) {
  if (row.category === "wanted") return "wanted";
  return row.type === "secondhand" ? "used" : "rent";
}

function mapTypeToDb(type) {
  return type === "used" ? "secondhand" : "rental";
}

function parsePriceNumber(value) {
  const matched = String(value || "").replace(/,/g, "").match(/\d+(\.\d+)?/);
  return matched ? Number(matched[0]) : 0;
}

function formatDbPrice(row) {
  const amount = Number(row.price || 0);
  if (!amount) return "价格面议";
  return row.type === "rental" ? `$${amount}/月` : `$${amount}`;
}

function normalizeDateValue(value) {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function timeAgo(value) {
  const time = new Date(value || Date.now()).getTime();
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  return formatMonthDay(time);
}

function formatMonthDay(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return "";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

function displayListingTime(item = {}) {
  const createdAt = Number(item.createdAt || 0);
  if (createdAt > 100000000000) return formatMonthDay(createdAt);
  return item.time || "刚刚";
}

function normalizeImages(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  if (text.startsWith("[")) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return text ? [text] : [];
}

function listingImages(item = {}) {
  const explicitImages = [
    ...normalizeImages(item.images),
    ...normalizeImages(item.imageDataUrls),
    ...normalizeImages(item.imageUrls),
    ...normalizeImages(item.image_url)
  ];
  if (explicitImages.length) return [...new Set(explicitImages)];
  const image = item.image || item.imageDataUrl || item.coverImage || "";
  const isFallback = Object.values(fallbackImages).includes(image);
  return image && (!isFallback || item.photoCount) ? [image] : [];
}

function postUrl(id) {
  return `#/post/${encodeURIComponent(id || "")}`;
}

function absolutePostUrl(id) {
  return `${SITE_URL}/#/post/${encodeURIComponent(id || "")}`;
}

function compactText(value = "", maxLength = 80) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function seoDescriptionForListing(item) {
  return [typeLabel(item.type), item.area, categoryPrimaryPrice(item), compactText(item.desc, 80)]
    .filter(Boolean)
    .join(" · ");
}

function setMetaContent(selector, content) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute("content", content || "");
}

function resetSeoMeta() {
  document.title = DEFAULT_SEO.title;
  setMetaContent('meta[name="description"]', DEFAULT_SEO.description);
  setMetaContent('meta[property="og:title"]', "Saminest");
  setMetaContent('meta[property="og:description"]', "DMV 华人租房、求租、二手平台");
  setMetaContent('meta[property="og:image"]', DEFAULT_SEO.image);
  setMetaContent('meta[property="og:url"]', DEFAULT_SEO.url);
  setMetaContent('meta[name="twitter:title"]', "Saminest");
  setMetaContent('meta[name="twitter:description"]', "DMV 华人租房、求租、二手平台");
  setMetaContent('meta[name="twitter:image"]', DEFAULT_SEO.image);
}

function updateListingSeo(item) {
  const images = listingImages(item);
  const title = `${item.title || "帖子"} | Saminest`;
  const description = seoDescriptionForListing(item);
  const image = images[0] || DEFAULT_SEO.image;
  const url = absolutePostUrl(item.id);
  document.title = title;
  setMetaContent('meta[name="description"]', description);
  setMetaContent('meta[property="og:title"]', title);
  setMetaContent('meta[property="og:description"]', description);
  setMetaContent('meta[property="og:image"]', image);
  setMetaContent('meta[property="og:url"]', url);
  setMetaContent('meta[name="twitter:title"]', title);
  setMetaContent('meta[name="twitter:description"]', description);
  setMetaContent('meta[name="twitter:image"]', image);
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function imagePreviewTemplate(images = []) {
  return images.map((src, index) => `
    <div class="photo-preview-item">
      <img src="${escapeHtml(src)}" alt="已选图片 ${index + 1}" />
      <button class="photo-remove-button" type="button" data-remove-photo="${index}" aria-label="删除第 ${index + 1} 张图片">×</button>
    </div>
  `).join("");
}

function dbListingToUi(row, profileMap = {}, imageMap = {}) {
  const type = mapTypeFromDb(row);
  const tags = String(row.nearby || row.category || "")
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const ownerProfile = profileMap[row.user_id] || {};
  const ownerName = ownerProfile.display_name || ownerProfile.email || "发布者";
  const ownerAvatar = ownerProfile.avatar_url || "";
  const images = [...new Set([...(imageMap[row.id] || []), ...normalizeImages(row.image_url)])];
  return {
    id: row.id,
    type,
    title: row.title,
    price: formatDbPrice(row),
    area: row.area,
    time: timeAgo(row.created_at),
    tags,
    detailTags: tags.length ? tags : [typeLabel(type)],
    photoCount: images.length,
    image: images[0] || fallbackImages[type] || fallbackImages.used,
    images,
    desc: row.description || "",
    roomType: row.category || "",
    moveIn: row.move_in || "",
    contact: row.contact || "站内消息",
    owner: ownerName,
    ownerAvatar,
    ownerAccount: row.user_id,
    mine: row.user_id === currentUserId(),
    status: mapStatusFromDb(row.status),
    reportedCount: row.reported_count || 0,
    createdAt: new Date(row.created_at || Date.now()).getTime()
  };
}

function uiListingToDb(listing) {
  const images = listingImages(listing);
  return {
    user_id: currentUserId(),
    type: mapTypeToDb(listing.type),
    status: mapStatusToDb(listing.status),
    title: listing.title,
    description: listing.desc || "暂无详细描述。",
    price: parsePriceNumber(listing.price),
    area: listing.area,
    category: listing.type === "wanted" ? "wanted" : listing.roomType || listing.tags?.[0] || typeLabel(listing.type),
    move_in: normalizeDateValue(listing.moveIn),
    nearby: Array.isArray(listing.tags) ? [...new Set([listing.roomType, listing.moveIn, ...listing.tags].filter(Boolean))].join(", ") : "",
    image_url: images.length > 1 ? JSON.stringify(images) : images[0] || listing.image || null,
    contact: listing.contact || "站内消息"
  };
}

async function fetchProfilesMap(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!cloudReady() || !ids.length) return {};
  let { data, error } = await supabaseClient
    .from("profiles")
    .select("id,email,display_name,role,avatar_url")
    .in("id", ids);
  if (error && /avatar_url/i.test(`${error.message || ""} ${error.details || ""}`)) {
    const fallback = await supabaseClient
      .from("profiles")
      .select("id,email,display_name,role")
      .in("id", ids);
    data = fallback.data;
    error = fallback.error;
  }
  if (error) {
    console.warn("Failed to load profiles", error);
    return {};
  }
  return Object.fromEntries((data || []).map((profile) => [profile.id, profile]));
}

async function fetchListingImagesMap(listingIds = []) {
  const ids = [...new Set(listingIds.filter(Boolean))];
  if (!cloudReady() || !ids.length) return {};
  const { data, error } = await supabaseClient
    .from("listing_images")
    .select("listing_id,image_url,sort_order")
    .in("listing_id", ids)
    .order("sort_order", { ascending: true });
  if (error) {
    console.warn("Failed to load listing images", error);
    return {};
  }
  return (data || []).reduce((map, item) => {
    map[item.listing_id] ||= [];
    if (item.image_url) map[item.listing_id].push(item.image_url);
    return map;
  }, {});
}

async function loadListingsFromSupabase() {
  if (!cloudReady()) return false;
  const { data, error } = await supabaseClient
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Failed to load listings", error);
    return false;
  }
  const profileMap = await fetchProfilesMap((data || []).map((item) => item.user_id));
  const imageMap = await fetchListingImagesMap((data || []).map((item) => item.id));
  state.listings = (data || []).map((item) => dbListingToUi(item, profileMap, imageMap));
  saveState();
  return true;
}

async function fetchListingByIdFromSupabase(id) {
  if (!cloudReady() || !id) return null;
  const { data, error } = await supabaseClient
    .from("listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    if (error) console.warn("Failed to load listing by id", error);
    return null;
  }
  const profileMap = await fetchProfilesMap([data.user_id]);
  const imageMap = await fetchListingImagesMap([data.id]);
  const listing = dbListingToUi(data, profileMap, imageMap);
  state.listings = [listing, ...state.listings.filter((item) => item.id !== listing.id)];
  saveState();
  return listing;
}

async function saveListingImagesToSupabase(listingId, images = []) {
  if (!cloudReady() || !listingId) return false;
  const cleanImages = [...new Set(images.filter(Boolean))];
  const deleted = await supabaseClient.from("listing_images").delete().eq("listing_id", listingId);
  if (deleted.error) {
    console.warn("Failed to clear listing images", deleted.error);
    return false;
  }
  if (!cleanImages.length) return true;
  const rows = cleanImages.map((imageUrl, index) => ({
    listing_id: listingId,
    image_url: imageUrl,
    sort_order: index
  }));
  const { error } = await supabaseClient.from("listing_images").insert(rows);
  if (error) {
    console.warn("Failed to save listing images", error);
    return false;
  }
  return true;
}

async function uploadListingImagesToSupabase(listingId, images = []) {
  if (!cloudReady() || !currentUserId() || !listingId) return [];
  const uploaded = [];
  for (const [index, image] of images.entries()) {
    if (!isDataUrl(image)) {
      uploaded.push(image);
      continue;
    }
    const blob = await dataUrlToBlob(image);
    const extension = blob.type === "image/png" ? "png" : "jpg";
    const path = `${currentUserId()}/${listingId}/${Date.now()}-${index}.${extension}`;
    const { error } = await supabaseClient.storage.from("listing-images").upload(path, blob, {
      cacheControl: "3600",
      contentType: blob.type || "image/jpeg",
      upsert: true
    });
    if (error) {
      console.warn("Failed to upload listing image", error);
      return [];
    }
    const { data } = supabaseClient.storage.from("listing-images").getPublicUrl(path);
    if (data?.publicUrl) uploaded.push(data.publicUrl);
  }
  return uploaded;
}

async function prepareCloudListingImages(listingId, images = []) {
  const hasLocalImages = images.some(isDataUrl);
  if (!hasLocalImages) return images;
  const uploadedImages = await uploadListingImagesToSupabase(listingId, images);
  return uploadedImages.length === images.length ? uploadedImages : [];
}

async function loadFavoritesFromSupabase() {
  if (!cloudReady() || !currentUserId()) return false;
  const { data, error } = await supabaseClient
    .from("favorites")
    .select("listing_id")
    .eq("user_id", currentUserId());
  if (error) {
    console.warn("Failed to load favorites", error);
    return false;
  }
  state.favorites = (data || []).map((item) => item.listing_id);
  saveState();
  return true;
}

async function loadBannedUsersFromSupabase() {
  if (!cloudReady() || !currentUserId()) return false;
  const { data, error } = await supabaseClient.from("banned_users").select("user_id");
  if (error) {
    console.warn("Failed to load banned users", error);
    return false;
  }
  state.bannedUsers = (data || []).map((item) => item.user_id);
  saveState();
  return true;
}

async function loadFeedbackFromSupabase() {
  if (!cloudReady() || !isAdmin()) return false;
  const { data, error } = await supabaseClient
    .from("feedback")
    .select("id,user_id,email,message,status,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Failed to load feedback", error);
    return false;
  }
  state.feedback = (data || []).map((item) => ({
    id: item.id,
    account: item.user_id || item.email || "用户",
    email: item.email || "",
    message: item.message || "",
    status: item.status || "new",
    time: timeAgo(item.created_at),
    createdAt: new Date(item.created_at || Date.now()).getTime()
  }));
  saveState();
  return true;
}

async function loadReportsFromSupabase() {
  if (!cloudReady() || !isAdmin()) return false;
  const { data, error } = await supabaseClient
    .from("reports")
    .select("id,listing_id,reporter_id,reason,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Failed to load reports", error);
    return false;
  }
  state.reports = (data || []).map((item) => ({
    id: item.id,
    listingId: item.listing_id,
    account: item.reporter_id || "用户",
    reason: item.reason || "未填写原因",
    time: timeAgo(item.created_at),
    createdAt: new Date(item.created_at || Date.now()).getTime()
  }));
  saveState();
  return true;
}

async function loadConversationsFromSupabase() {
  if (!cloudReady() || !currentUserId()) return false;
  const { data: conversations, error } = await supabaseClient
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${currentUserId()},seller_id.eq.${currentUserId()}`)
    .order("updated_at", { ascending: false });
  if (error) {
    console.warn("Failed to load conversations", error);
    state.conversations = [];
    saveState();
    return false;
  }
  const conversationIds = (conversations || []).map((item) => item.id);
  let messages = [];
  if (conversationIds.length) {
    const result = await supabaseClient
      .from("messages")
      .select("*")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: true });
    if (!result.error) messages = result.data || [];
  }
  const profileMap = await fetchProfilesMap(
    (conversations || []).flatMap((item) => [item.buyer_id, item.seller_id])
  );
  state.conversations = (conversations || []).map((item) => {
    const otherId = item.buyer_id === currentUserId() ? item.seller_id : item.buyer_id;
    const otherProfile = profileMap[otherId] || {};
    const listing = state.listings.find((entry) => entry.id === item.listing_id);
    const threadMessages = messages
      .filter((message) => message.conversation_id === item.id)
      .map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        content: message.content,
        createdAt: message.created_at
      }));
    const last = threadMessages[threadMessages.length - 1];
    return {
      id: item.id,
      listingId: item.listing_id,
      name: otherProfile.display_name || otherProfile.email || "对方",
      avatar: (otherProfile.display_name || otherProfile.email || "对").slice(0, 1).toUpperCase(),
      lastMessage: last?.content || `关于「${listing?.title || "帖子"}」的会话`,
      time: timeAgo(last?.createdAt || item.updated_at || item.created_at),
      messages: threadMessages
    };
  });
  saveState();
  return true;
}

async function refreshCloudData() {
  if (!cloudReady()) return;
  await loadListingsFromSupabase();
  if (isLoggedIn()) {
    await loadBannedUsersFromSupabase();
    await loadFavoritesFromSupabase();
    await loadConversationsFromSupabase();
    if (isAdmin()) {
      await loadFeedbackFromSupabase();
      await loadReportsFromSupabase();
    }
  }
}

function allListings() {
  return sortListings(state.listings.filter(canSeeListing));
}

function publicListings() {
  return sortListings(state.listings.filter((item) => listingStatus(item) === "active" && !state.bannedUsers.includes(item.ownerAccount)));
}

function publicSellerListings(ownerAccount) {
  const ownerId = decodeURIComponent(ownerAccount || "");
  return publicListings().filter((item) => item.ownerAccount === ownerId);
}

function adminListings() {
  return sortListings(state.listings);
}

function sortListings(entries) {
  return [...entries].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
}

function findListing(id) {
  const item = state.listings.find((entry) => entry.id === id);
  return item && canSeeListing(item) ? item : null;
}

function routePathFromLocation() {
  const hashRoute = location.hash.replace(/^#\/?/, "");
  if (hashRoute) return hashRoute;
  const pathRoute = decodeURIComponent(location.pathname || "")
    .replace(/^\/+|\/+$/g, "");
  return !pathRoute || pathRoute === "index.html" ? "home" : pathRoute;
}

function route() {
  if (isPasswordRecoveryHash()) {
    return renderAuthPage(
      "设置新密码",
      "#home",
      "reset"
    );
  }

  const hash = routePathFromLocation();
  const [page, id, subpage] = hash.split("/");
  document.body.dataset.page = page;
  app.scrollTop = 0;
  app.scrollLeft = 0;

  if (page === "auth") {
    return renderAuthPage("欢迎回来", "#home", id || "login");
  }

  if (requiresAuth(page) && !isLoggedIn()) {
    return renderAuthPage(authTitle(page), `#${hash}`, "login");
  }
  if ((page === "admin-review" || page === "admin-feedback" || page === "admin-reports") && !isAdmin()) {
    return renderNoAccess();
  }

  if (!["post", "listing"].includes(page)) resetSeoMeta();

  if (page === "home") return renderHome();
  if (page === "category") return renderCategory(id || "all");
  if (page === "post" || page === "listing") return renderPostDetail(id);
  if (page === "seller") return renderSellerProfile(id, subpage || "all");
  if (page === "publish") return renderPublish();
  if (page === "post-used") return renderUsedForm();
  if (page === "post-rent") return renderRentForm();
  if (page === "post-wanted") return renderWantedForm();
  if (page === "messages") return renderMessages();
  if (page === "conversation") return renderConversation(id);
  if (page === "me") return renderProfile();
  if (page === "me-posts") return renderMyPosts();
  if (page === "drafts") return renderDrafts();
  if (page === "favorites") return renderSavedList("我的收藏", favoriteListings(), "收藏过的帖子会显示在这里。");
  if (page === "history") return renderSavedList("浏览历史", historyListings(), "看过的帖子会显示在这里。");
  if (page === "feedback") return renderFeedback();
  if (page === "admin-feedback") return renderAdminFeedback();
  if (page === "admin-reports") return renderAdminReports();
  if (page === "help") return renderHelp();
  if (page === "terms") return renderTerms();
  if (page === "privacy") return renderPrivacy();
  if (page === "settings") return renderSettings();
  if (page === "settings-profile") return renderProfileSettings();
  if (page === "admin-review") return renderAdminReview(id || "pending");
  renderHome();
}

function requiresAuth(page) {
  return [
    "publish",
    "post-used",
    "post-rent",
    "post-wanted",
    "messages",
    "conversation",
    "me",
    "me-posts",
    "drafts",
    "favorites",
    "feedback",
    "settings",
    "settings-profile",
    "admin-review",
    "admin-feedback",
    "admin-reports"
  ].includes(page);
}

function isLoggedIn() {
  return Boolean(state.session?.loggedIn);
}

function isAdmin() {
  const email = String(state.session?.email || state.session?.account || "").toLowerCase();
  return Boolean(state.session?.role === "admin" || email === ADMIN_EMAIL);
}

function isOwner(item) {
  if (!item) return false;
  return item.ownerAccount
    ? item.ownerAccount === state.session?.userId || item.ownerAccount === state.session?.account
    : Boolean(item.mine);
}

function canSeeListing(item) {
  if (!item) return false;
  if (isAdmin()) return true;
  if (isOwner(item)) return true;
  return listingStatus(item) === "active" && !state.bannedUsers.includes(item.ownerAccount);
}

function currentAccountIsBanned() {
  return [state.session?.userId, state.session?.account].filter(Boolean).some((id) => state.bannedUsers.includes(id));
}

function listingStatus(item) {
  return item?.status || "active";
}

function statusLabel(status) {
  return { pending: "待审核", active: "已通过", rejected: "已拒绝", expired: "已下架" }[status] || "已通过";
}

function authTitle(page) {
  return (
    {
      publish: "登录后发布信息",
      "post-used": "登录后发布二手物品",
      "post-rent": "登录后发布房源",
      "post-wanted": "登录后发布求租需求",
      messages: "登录后查看消息",
      conversation: "登录后查看消息",
      me: "登录后管理你的内容",
      "me-posts": "登录后查看我的发布",
      drafts: "登录后查看草稿",
      favorites: "登录后查看收藏",
      feedback: "登录后提交意见反馈",
      settings: "登录后进入设置",
      "admin-review": "管理员登录后审核内容",
      "admin-feedback": "管理员登录后查看反馈",
      "admin-reports": "管理员登录后查看举报"
    }[page] || "登录后继续"
  );
}

function renderHome() {
  const listings = publicListings();
  app.innerHTML = `
    <section class="home-screen masonry-home">
      ${mobileHeader()}

      <form class="home-search" data-search-form>
        <span class="search-symbol">⌕</span>
        <input type="hidden" name="type" value="all" />
        <input name="q" placeholder="搜租房、求租、二手物品..." />
      </form>

      ${CategoryTabs("home")}

      <div class="home-feed masonry-feed">
        ${listings.length ? listings.map((item) => MasonryCard(item, { favorite: true })).join("") : emptyBlock("暂时还没有帖子")}
      </div>

      ${bottomNav("home")}
    </section>
  `;
}

function renderCategory(type, query = "", filters = {}) {
  const currentType = ["rent", "wanted", "used", "all"].includes(type) ? type : "all";
  const lowerQuery = query.trim().toLowerCase();
  const activeFilters = {
    price: filters.price || "any",
    roomType: filters.roomType || "any",
    moveIn: filters.moveIn || "any",
    sort: filters.sort || "newest"
  };
  const filtered = publicListings().filter((item) => {
    const matchesType = currentType === "all" || item.type === currentType;
    const text = `${item.title} ${item.area} ${item.price} ${item.desc} ${(item.tags || []).join(" ")} ${(item.detailTags || []).join(" ")}`.toLowerCase();
    return matchesType && (!lowerQuery || text.includes(lowerQuery)) && matchesRentFilters(item, activeFilters, currentType);
  });
  const shown = sortCategoryListings(filtered, activeFilters.sort);
  const isRent = currentType === "rent";
  const title = currentType === "all" ? "推荐" : categoryName(currentType);

  app.innerHTML = `
    <section class="page-screen category-screen category-${currentType}">
      ${pageHeader(title)}
      ${CategoryTabs(currentType)}
      <form class="home-search inner-search" data-search-form>
        <span class="search-symbol">⌕</span>
        <input type="hidden" name="type" value="${currentType}" />
        <input name="q" value="${escapeHtml(query)}" placeholder="搜索关键词或地区" />
      </form>
      ${isRent ? FilterBar(activeFilters) : ""}
      <div class="listing-list masonry-feed category-masonry-feed">
        ${shown.length ? shown.map((item) => MasonryCard(item, { favorite: true })).join("") : emptyBlock("没有找到相关帖子")}
      </div>
      ${bottomNav("home")}
    </section>
  `;
}

function CategoryTabs(active = "home") {
  const tabs = [
    ["home", "推荐", "#home"],
    ["rent", "租房", "#category/rent"],
    ["wanted", "求租", "#category/wanted"],
    ["used", "二手", "#category/used"]
  ];
  return `
    <nav class="home-chips home-channel-tabs category-tabs" aria-label="分类导航">
      ${tabs.map(([key, label, href]) => `<a class="home-chip ${active === key ? "active" : ""}" href="${href}">${label}</a>`).join("")}
    </nav>
  `;
}

function FilterBar(filters = {}) {
  return `
    <section class="filter-bar" aria-label="租房筛选" data-rent-filters>
      <label>价格<select name="price"><option value="any" ${selectedFilter(filters.price, "any")}>不限价格</option><option value="under800" ${selectedFilter(filters.price, "under800")}>$800 以下</option><option value="800-1200" ${selectedFilter(filters.price, "800-1200")}>$800-$1200</option><option value="over1200" ${selectedFilter(filters.price, "over1200")}>$1200 以上</option></select></label>
      <label>房型<select name="roomType"><option value="any" ${selectedFilter(filters.roomType, "any")}>全部房型</option><option value="单间" ${selectedFilter(filters.roomType, "单间")}>单间</option><option value="主卧" ${selectedFilter(filters.roomType, "主卧")}>主卧</option><option value="整租" ${selectedFilter(filters.roomType, "整租")}>整租</option><option value="合租" ${selectedFilter(filters.roomType, "合租")}>合租</option></select></label>
      <label>入住<select name="moveIn"><option value="any" ${selectedFilter(filters.moveIn, "any")}>任意时间</option><option value="可立即入住" ${selectedFilter(filters.moveIn, "可立即入住")}>可立即入住</option><option value="一周内" ${selectedFilter(filters.moveIn, "一周内")}>一周内</option><option value="下个月" ${selectedFilter(filters.moveIn, "下个月")}>下个月</option></select></label>
      <label>排序<select name="sort"><option value="newest" ${selectedFilter(filters.sort, "newest")}>最新发布</option><option value="priceAsc" ${selectedFilter(filters.sort, "priceAsc")}>租金从低到高</option><option value="priceDesc" ${selectedFilter(filters.sort, "priceDesc")}>租金从高到低</option></select></label>
    </section>
  `;
}

function selectedFilter(current, value) {
  return (current || "any") === value ? "selected" : "";
}

function matchesRentFilters(item, filters, currentType) {
  if (currentType !== "rent") return true;
  const price = parsePriceNumber(item.price);
  if (filters.price === "under800" && (!price || price >= 800)) return false;
  if (filters.price === "800-1200" && (!price || price < 800 || price > 1200)) return false;
  if (filters.price === "over1200" && (!price || price <= 1200)) return false;
  const roomText = `${item.roomType || ""} ${(item.tags || []).join(" ")} ${(item.detailTags || []).join(" ")}`;
  if (filters.roomType !== "any" && !roomText.includes(filters.roomType)) return false;
  const moveInText = `${item.moveIn || ""} ${(item.tags || []).join(" ")} ${(item.detailTags || []).join(" ")}`;
  if (filters.moveIn !== "any" && !moveInText.includes(filters.moveIn)) return false;
  return true;
}

function sortCategoryListings(listings, sort = "newest") {
  if (sort === "priceAsc") return [...listings].sort((a, b) => parsePriceNumber(a.price) - parsePriceNumber(b.price));
  if (sort === "priceDesc") return [...listings].sort((a, b) => parsePriceNumber(b.price) - parsePriceNumber(a.price));
  return listings;
}

function currentRentFilters() {
  const filterBar = document.querySelector("[data-rent-filters]");
  if (!filterBar) return {};
  return [...filterBar.querySelectorAll("select[name]")].reduce((filters, select) => {
    filters[select.name] = select.value;
    return filters;
  }, {});
}

function renderLoading(message = "加载中...") {
  return window.SaminestModules.loading.renderLoading(app, pageHeader, message);
}

async function renderPostDetail(id) {
  if (!id) return renderUnavailable();
  renderLoading("帖子加载中...");
  let item = findListing(id);
  if (!item) item = await fetchListingByIdFromSupabase(id);
  if (!item || !canSeeListing(item)) return renderUnavailable("帖子不存在或已删除");
  renderDetail(item);
}

function renderDetail(source) {
  const item = typeof source === "string" ? findListing(source) : source;
  if (!item) return renderUnavailable();
  updateListingSeo(item);
  rememberHistory(item.id);
  const canReport = !isOwner(item) && !isAdmin();
  const detailImages = listingImages(item);
  const galleryImages = detailImages;
  const sellerUrl = sellerProfileUrl(item.ownerAccount);
  const sellerPostCount = publicSellerListings(item.ownerAccount).length;

  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("详情")}
      <div class="detail-layout">
        ${detailGalleryTemplate(galleryImages, item)}
        <article class="detail-panel">
          <div class="detail-title-row">
            <h1>${item.title}</h1>
          </div>
          <div class="price">${item.price}</div>
          <div class="meta">
            ${(isOwner(item) || isAdmin()) ? `<span class="status-badge ${listingStatus(item)}">${statusLabel(listingStatus(item))}</span>` : ""}
            <span>${typeLabel(item.type)}</span>
            <span>${escapeHtml(item.area || "本地地区")}</span>
            <span>${escapeHtml(displayListingTime(item))}</span>
            ${item.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <p class="body-copy">${escapeHtml(item.desc || "暂无详细描述。")}</p>
          <div class="mini-note">联系方式：${escapeHtml(item.contact || "站内消息")}</div>
          <div class="mini-note">建议先站内沟通，确认身份和细节后再交换私人联系方式。</div>
          <a class="seller-mini-card" href="${sellerUrl}">
            <span class="seller-avatar">${avatarContent(item.owner, ownerAvatarFor(item))}</span>
            <span>
              <b>${escapeHtml(item.owner || "发布者")}</b>
              <em>${sellerPostCount} 条公开帖子 · 查看主页</em>
            </span>
            <strong>›</strong>
          </a>
          <div class="detail-actions">
            <a class="secondary-button" href="#category/all">继续浏览</a>
            <button class="secondary-button favorite-button ${state.favorites.includes(item.id) ? "active" : ""}" type="button" data-favorite="${item.id}">${state.favorites.includes(item.id) ? "已收藏" : "收藏"}</button>
            <button class="primary-button" type="button" data-contact="${item.id}">联系发布者</button>
            ${canReport ? `<button class="secondary-button report-button" type="button" data-report-listing="${item.id}">举报</button>` : ""}
            ${isAdmin() ? `
              <button class="secondary-button" type="button" data-edit-listing="${item.id}">编辑</button>
              <button class="danger-button" type="button" data-delete-listing="${item.id}">删除</button>
              <button class="primary-button" type="button" data-review-status="${item.id}:active">通过</button>
              <button class="secondary-button" type="button" data-review-status="${item.id}:rejected">拒绝</button>
            ` : ""}
          </div>
        </article>
      </div>
    </section>
  `;
}

function detailGalleryTemplate(images, item) {
  const cleanImages = images.filter(Boolean);
  if (!cleanImages.length) {
    return `<div class="detail-gallery detail-empty-photo">暂无图片</div>`;
  }
  const galleryImages = cleanImages;
  const total = galleryImages.length;
  return `
    <div class="detail-gallery detail-carousel" data-detail-gallery data-gallery-index="0">
      <div class="detail-carousel-track" data-gallery-track>
        ${galleryImages.map((src, index) => `
          <figure class="detail-carousel-slide">
            <img class="detail-photo" src="${escapeHtml(src)}" alt="${escapeHtml(item.title)} 图片 ${index + 1}" />
          </figure>
        `).join("")}
      </div>
      ${total > 1 ? `
        <span class="detail-gallery-count" data-gallery-count>1/${total}</span>
        <button class="detail-gallery-nav prev is-disabled" type="button" data-gallery-action="prev" aria-label="上一张图片">‹</button>
        <button class="detail-gallery-nav next" type="button" data-gallery-action="next" aria-label="下一张图片">›</button>
        <div class="detail-gallery-dots" aria-label="图片分页">
          ${galleryImages.map((_, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-gallery-dot="${index}" aria-label="第 ${index + 1} 张图片"></button>`).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function updateDetailGallery(gallery, nextIndex) {
  if (!gallery) return;
  const track = gallery.querySelector("[data-gallery-track]");
  const slides = [...gallery.querySelectorAll(".detail-carousel-slide")];
  if (!track || !slides.length) return;
  const maxIndex = slides.length - 1;
  const index = Math.max(0, Math.min(maxIndex, Number(nextIndex) || 0));
  gallery.dataset.galleryIndex = String(index);
  track.style.transform = `translateX(-${index * 100}%)`;
  const count = gallery.querySelector("[data-gallery-count]");
  if (count) count.textContent = `${index + 1}/${slides.length}`;
  gallery.querySelectorAll("[data-gallery-dot]").forEach((dot) => {
    dot.classList.toggle("active", Number(dot.dataset.galleryDot) === index);
  });
  gallery.querySelector('[data-gallery-action="prev"]')?.classList.toggle("is-disabled", index === 0);
  gallery.querySelector('[data-gallery-action="next"]')?.classList.toggle("is-disabled", index === maxIndex);
}

function moveDetailGallery(gallery, step) {
  const currentIndex = Number(gallery?.dataset.galleryIndex || 0);
  updateDetailGallery(gallery, currentIndex + step);
}

function sellerAvatar(name = "发") {
  return escapeHtml(String(name || "发").trim().slice(0, 1).toUpperCase() || "发");
}

function sellerProfileUrl(ownerAccount) {
  return ownerAccount ? `#seller/${encodeURIComponent(ownerAccount)}` : "#category/all";
}

function sellerFilterLabel(filter) {
  return {
    all: "全部",
    rent: "租房",
    used: "二手",
    wanted: "求租"
  }[filter] || "全部";
}

function sellerProfileTab(ownerAccount, filter, currentFilter, count) {
  const href = `#seller/${encodeURIComponent(ownerAccount)}/${filter}`;
  return `<a class="${filter === currentFilter ? "active" : ""}" href="${href}">${sellerFilterLabel(filter)}<span>${count}</span></a>`;
}

function renderSellerProfile(ownerAccount, filter = "all") {
  const sellerId = decodeURIComponent(ownerAccount || "");
  if (!sellerId) return renderUnavailable();

  const posts = publicSellerListings(sellerId);
  if (!posts.length) {
    app.innerHTML = `
      <section class="page-screen seller-screen">
        ${pageHeader("发帖者主页")}
        <section class="subpage-card">
          <p>这个发帖者目前没有公开帖子。</p>
          <a class="primary-button" href="#category/all">继续浏览</a>
        </section>
        ${bottomNav("category")}
      </section>
    `;
    return;
  }

  const currentFilter = ["all", "rent", "used", "wanted"].includes(filter) ? filter : "all";
  const seller = posts[0];
  const filteredPosts = currentFilter === "all" ? posts : posts.filter((item) => item.type === currentFilter);
  const typeCounts = {
    all: posts.length,
    rent: posts.filter((item) => item.type === "rent").length,
    used: posts.filter((item) => item.type === "used").length,
    wanted: posts.filter((item) => item.type === "wanted").length
  };
  const latestArea = seller.area || "DMV";
  const contactPost = filteredPosts[0] || posts[0];

  app.innerHTML = `
    <section class="page-screen seller-screen">
      ${pageHeader("发帖者主页")}
      <section class="seller-profile-card">
        <div class="seller-avatar large">${avatarContent(seller.owner, ownerAvatarFor(seller))}</div>
        <div class="seller-profile-main">
          <h2>${escapeHtml(seller.owner || "发布者")}</h2>
          <p>${escapeHtml(latestArea)} · ${posts.length} 条公开帖子</p>
          <div class="seller-profile-actions">
            <button class="primary-button" type="button" data-contact="${contactPost.id}">联系发帖者</button>
            <a class="secondary-button" href="${postUrl(contactPost.id)}">查看最新帖子</a>
          </div>
        </div>
      </section>
      <nav class="seller-tabs" aria-label="发帖者帖子分类">
        ${sellerProfileTab(sellerId, "all", currentFilter, typeCounts.all)}
        ${sellerProfileTab(sellerId, "rent", currentFilter, typeCounts.rent)}
        ${sellerProfileTab(sellerId, "used", currentFilter, typeCounts.used)}
        ${sellerProfileTab(sellerId, "wanted", currentFilter, typeCounts.wanted)}
      </nav>
      <section class="seller-posts">
        ${filteredPosts.length ? filteredPosts.map((item) => listingCard(item, { compact: true, favorite: true })).join("") : emptyBlock(`暂无${sellerFilterLabel(currentFilter)}帖子`)}
      </section>
      ${bottomNav("category")}
    </section>
  `;
}

function renderPublish() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("发布")}
      <div class="publish-grid">
        <a class="publish-card" href="#post-rent">
          <span class="category-icon">房</span>
          <span><b>发布房源</b><p>出租单间、主卧、整租或合租。</p></span>
          <span>›</span>
        </a>
        <a class="publish-card" href="#post-wanted">
          <span class="category-icon">求</span>
          <span><b>发布求租需求</b><p>说明预算、位置、入住时间和偏好。</p></span>
          <span>›</span>
        </a>
        <a class="publish-card" href="#post-used">
          <span class="category-icon">物</span>
          <span><b>发布二手物品</b><p>家具、数码、服饰和生活用品。</p></span>
          <span>›</span>
        </a>
      </div>
      ${bottomNav("publish")}
    </section>
  `;
}

function renderUsedForm(source = {}) {
  const values = formValues(source);
  app.innerHTML = formShell({
    kind: "used",
    title: values.id ? "编辑二手物品" : "发布二手物品",
    intro: "适合家具、数码、服饰、母婴、运动用品等本地转让。",
    imageTitle: "物品照片",
    imageHelper: "从手机或电脑选择照片；手机上可直接拍照。没有照片也可以发布。",
    fields: `
      ${inputField("title", "标题", "例如：IKEA 书桌 / MacBook Pro 9成新", false, values.title)}
      <div class="field-grid two">
        ${inputField("price", "价格", "$", false, values.price)}
        ${inputField("area", "所在地区", "例如：Rockville, MD", false, values.area)}
      </div>
      ${inputField("tags", "标签", "例如：可小刀, 自取, 家具", false, values.tags)}
    `,
    category: "二手物品",
    chips: ["家具", "数码", "服饰", "母婴", "运动", "其他"],
    description: "补充尺寸、购买时间、取货方式...",
    note: "发布后会保存在本地版本里，可以在我的发布中查看。",
    submit: values.id ? "保存修改" : "发布二手物品"
  }, values);
}

function renderRentForm(source = {}) {
  const values = formValues(source);
  app.innerHTML = formShell({
    kind: "rent",
    title: values.id ? "编辑房源" : "发布房源",
    intro: "把租金、房型、入住时间和联系方式讲清楚，看房沟通会顺很多。",
    imageTitle: "房源照片",
    imageHelper: "从手机或电脑选择照片；手机上可直接拍照。没有照片也可以发布。",
    fields: `
      ${inputField("title", "标题", "例如：Rockville 单间出租，近地铁", false, values.title)}
      <div class="field-grid two">
        ${inputField("price", "月租", "$ / 月", false, values.price)}
        ${inputField("area", "所在地区", "例如：Rockville, MD", false, values.area)}
      </div>
      <div class="field-grid two">
        ${selectField("roomType", "房源类型", ["单间", "主卧", "整租", "合租"], values.roomType)}
        ${selectField("moveIn", "入住时间", ["可立即入住", "一周内", "下个月"], values.moveIn)}
      </div>
      ${inputField("tags", "条件标签", "例如：独立卫浴, 包水电, 近地铁", false, values.tags)}
    `,
    category: "租房",
    chips: ["独立卫浴", "包水电", "可做饭", "有车位", "近地铁", "可养宠物"],
    description: "介绍房间大小、室友情况、交通、家具、看房时间...",
    note: "发布后会保存在本地版本里，可以在我的发布中查看。",
    submit: values.id ? "保存修改" : "发布房源"
  }, values);
}

function renderWantedForm(source = {}) {
  const values = formValues(source);
  app.innerHTML = formShell({
    kind: "wanted",
    title: values.id ? "编辑求租需求" : "发布求租需求",
    intro: "告诉房东你想找什么位置、预算和入住时间，让合适房源主动找到你。",
    imageTitle: "需求封面",
    imageHelper: "可选照片；也可以不加图，直接说明位置、预算和偏好。",
    fields: `
      ${inputField("title", "需求标题", "例如：求租 Rockville 附近单间，8月入住", false, values.title)}
      <div class="field-grid two">
        ${inputField("price", "预算上限", "$ / 月", false, values.price)}
        ${inputField("area", "目标地区", "例如：Bethesda / Rockville", false, values.area)}
      </div>
      <div class="field-grid two">
        ${selectField("moveIn", "入住时间", ["可立即入住", "8月入住", "9月入住"], values.moveIn)}
        ${selectField("roomType", "求租类型", ["单间", "主卧", "整租", "合租"], values.roomType)}
      </div>
      ${inputField("tags", "需求标签", "例如：近地铁, 独立卫浴, 长租", false, values.tags)}
    `,
    category: "租房 > 求租需求",
    chips: ["近地铁", "独立卫浴", "女生优先", "无宠物", "长租", "可合租"],
    description: "描述你的预算、期望位置、室友偏好、作息和必须条件...",
    note: "求租需求发布后，其他用户可以通过站内消息联系你。",
    submit: values.id ? "保存修改" : "发布求租需求"
  }, values);
}

function formShell(config, values = {}) {
  const previewImages = listingImages(values);
  const formId = `listing-form-${config.kind}`;
  const headerAction = values.id ? "保存" : "发布";
  return `
    <section class="page-screen form-page">
      ${pageHeader(config.title, { submitFormId: formId, actionLabel: headerAction })}
      <p class="form-intro">${config.intro}</p>
      <form id="${formId}" data-listing-form="${config.kind}" data-editing-id="${values.id || ""}" data-draft-id="${values.draftId || ""}">
        <section class="form-card">
          <h2>${config.imageTitle}</h2>
          <div class="photo-strip multi">
            <label class="upload-tile cover ${previewImages.length ? "has-preview" : ""}">
              <input class="visually-hidden" type="file" name="photo" accept="image/*" multiple data-photo-input />
              <input type="hidden" name="imageDataUrls" value="${escapeHtml(JSON.stringify(previewImages))}" data-photo-data />
              <input type="hidden" name="imageDataUrl" value="${escapeHtml(previewImages[0] || "")}" data-photo-first />
              <span data-photo-placeholder>${previewImages.length ? `已选 ${previewImages.length} 张` : "+ 选择照片"}</span>
            </label>
            <div class="photo-preview-grid" data-photo-preview-grid>
              ${imagePreviewTemplate(previewImages)}
            </div>
          </div>
        </section>
        <section class="form-card">
          <h2>基本信息</h2>
          <div class="field-grid">${config.fields}</div>
        </section>
        <section class="form-card">
          <h2>分类与条件</h2>
          <a class="select-like" href="#publish">${config.category}　›</a>
          <div class="chip-cloud" style="margin-top: 10px;">
            ${config.chips.map((chip, index) => `<button type="button" class="chip ${selectedChip(values, chip, index) ? "active" : ""}" data-chip="${chip}">${chip}</button>`).join("")}
          </div>
        </section>
        <section class="form-card">
          <h2>描述</h2>
          <div class="field"><textarea name="desc" placeholder="${config.description}">${escapeHtml(values.desc || "")}</textarea></div>
        </section>
        <section class="form-card">
          <h2>联系方式</h2>
          <div class="contact-options">
            <button type="button" class="active">站内消息</button><button type="button">电话</button><button type="button">微信</button>
          </div>
          ${inputField("contact", "联系方式", "可填电话、微信或邮箱；不填默认站内消息", false, values.contact || "")}
          <div class="mini-note">${config.note}</div>
        </section>
        <div class="sticky-submit">
          <button class="secondary-button" type="button" data-save-draft="${config.kind}">存草稿</button>
          <button class="primary-button" type="submit" data-publish-submit>${config.submit}</button>
        </div>
      </form>
    </section>
  `;
}

function renderProfile() {
  const menus = [
    ["我的发布", "me-posts"],
    ["草稿", "drafts"],
    ["我的收藏", "favorites"],
    ["浏览历史", "history"],
    ...(isAdmin() ? [["管理员审核", "admin-review/pending"], ["举报管理", "admin-reports"], ["反馈管理", "admin-feedback"]] : []),
    ["意见反馈", "feedback"],
    ["帮助中心", "help"],
    ["设置", "settings"]
  ];

  app.innerHTML = `
    <section class="page-screen me-screen">
      ${pageHeader("我的")}
      <section class="me-profile-card">
        <label class="avatar profile-avatar-button" aria-label="上传头像">
          ${avatarContent(state.user.name, state.user.avatarUrl, state.user.avatar)}
          <input class="visually-hidden" type="file" accept="image/*" data-avatar-input />
        </label>
        <div>
          <a class="profile-name-link" href="#settings-profile">${escapeHtml(state.user.name || "Saminest 用户")}</a>
          <span>${escapeHtml(state.user.subtitle || "Saminest")}</span>
        </div>
      </section>
      <section class="me-menu">
        ${menus.map(([label, routeName]) => `<a href="#${routeName}"><b>${label}</b><span>›</span></a>`).join("")}
      </section>
      ${bottomNav("me")}
    </section>
  `;
}

function renderMessages() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("消息")}
      <section class="message-list">
        ${state.conversations.length ? state.conversations.map(conversationItem).join("") : emptyBlock("还没有消息")}
      </section>
      ${bottomNav("messages")}
    </section>
  `;
}

function renderConversation(id) {
  const conversation = state.conversations.find((item) => item.id === id) || state.conversations[0];
  if (!conversation) return renderMessages();
  markConversationRead(conversation.id);
  const messageHtml = conversation.messages.map((message, index) => {
    const isObject = typeof message === "object" && message !== null;
    const text = isObject ? message.content : message;
    const mine = isObject ? message.senderId === currentUserId() : index % 2 === 0;
    return `<div class="chat-bubble ${mine ? "mine" : "other"}">${escapeHtml(text)}</div>`;
  }).join("");

  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader(conversation.name)}
      <section class="chat-panel">
        ${messageHtml}
      </section>
      <form class="chat-compose" data-message-form="${conversation.id}">
        <input name="message" placeholder="输入消息..." required />
        <button type="submit">发送</button>
      </form>
    </section>
  `;
}

function messageCreatedAt(message, fallback = Date.now()) {
  if (typeof message === "object" && message !== null) {
    return new Date(message.createdAt || message.created_at || fallback).getTime();
  }
  return fallback;
}

function isMessageFromMe(message, index = 0) {
  if (typeof message === "object" && message !== null) {
    const selfIds = [currentUserId(), state.session?.account, state.session?.email].filter(Boolean);
    return selfIds.includes(message.senderId) || selfIds.includes(message.sender_id);
  }
  return index % 2 === 0;
}

function conversationUnreadCount(conversation) {
  if (!isLoggedIn() || !conversation) return 0;
  const lastReadAt = Number(state.messageReads?.[conversation.id] || 0);
  return (conversation.messages || []).filter((message, index) => {
    return !isMessageFromMe(message, index) && messageCreatedAt(message) > lastReadAt;
  }).length;
}

function unreadMessageCount() {
  return state.conversations.reduce((count, conversation) => count + conversationUnreadCount(conversation), 0);
}

function markConversationRead(id) {
  if (!id) return;
  state.messageReads ||= {};
  state.messageReads[id] = Date.now();
  saveState();
}

function renderSavedList(title, entries, emptyText) {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader(title)}
      <div class="listing-list">
        ${entries.length ? entries.map(listingCard).join("") : emptyBlock(emptyText)}
      </div>
      ${bottomNav(title === "我的收藏" ? "favorites" : "home")}
    </section>
  `;
}

function renderMyPosts() {
  const posts = myListings();
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("我的发布")}
      <div class="manage-list">
        ${
          posts.length
            ? posts.map((item) => manageListingCard(item)).join("")
            : emptyBlock("你发布的信息会显示在这里。")
        }
      </div>
      ${bottomNav("me")}
    </section>
  `;
}

function renderDrafts() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("草稿")}
      <section class="subpage-card">
        ${
          state.drafts.length
            ? `<div class="manage-list">${state.drafts.map((draft) => manageDraftCard(draft)).join("")}</div>`
            : emptyBlock("保存的草稿会显示在这里")
        }
      </section>
      ${bottomNav("me")}
    </section>
  `;
}

function renderFeedback() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("意见反馈")}
      <form class="subpage-card" data-feedback-form>
        <p>告诉我们哪里不好用，或者你希望增加什么功能。</p>
        <textarea class="feedback-box" name="message" placeholder="例如：希望增加地图找房、帖子置顶、微信提醒..." required></textarea>
        <button class="primary-button" type="submit">提交反馈</button>
      </form>
    </section>
  `;
}

function renderAdminFeedback() {
  const entries = [...(state.feedback || [])].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  app.innerHTML = `
    <section class="page-screen admin-screen">
      ${pageHeader("反馈管理")}
      <div class="admin-list">
        ${entries.length ? entries.map(feedbackCard).join("") : emptyBlock("暂时还没有用户反馈")}
      </div>
      ${bottomNav("me")}
    </section>
  `;
}

function renderAdminReports() {
  const entries = [...(state.reports || [])].sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  app.innerHTML = `
    <section class="page-screen admin-screen">
      ${pageHeader("举报管理")}
      <div class="admin-list">
        ${entries.length ? entries.map(reportCard).join("") : emptyBlock("暂时还没有用户举报")}
      </div>
      ${bottomNav("me")}
    </section>
  `;
}

function feedbackCard(item) {
  return `
    <article class="feedback-card">
      <div>
        <b>${escapeHtml(item.email || item.account || "用户")}</b>
        <span>${escapeHtml(item.time || "刚刚")}</span>
      </div>
      <p>${escapeHtml(item.message || "")}</p>
    </article>
  `;
}

function renderHelp() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("帮助中心")}
      <section class="subpage-card">
        <div class="subpage-list">
          <a href="#post-rent">如何发布房源？<span>›</span></a>
          <a href="#post-wanted">如何发布求租需求？<span>›</span></a>
          <a href="#messages">如何联系对方？<span>›</span></a>
        </div>
      </section>
    </section>
  `;
}

function renderLegalDocument(englishTitle, chineseTitle, content) {
  document.title = `${chineseTitle} | Saminest`;
  app.innerHTML = `
    <section class="page-screen legal-screen">
      <header class="legal-header">
        <button class="plain-back" type="button" data-back aria-label="返回">‹</button>
        <div>
          <span>${englishTitle}</span>
          <h1>${chineseTitle}</h1>
        </div>
        <a href="#home">首页</a>
      </header>
      <article class="legal-document">
        <p class="legal-updated"><strong>Last Updated / 最后更新：</strong>2026-07-09</p>
        ${content}
      </article>
    </section>
  `;
}

function renderTerms() {
  renderLegalDocument("Terms of Service", "用户服务协议", `
    <div class="legal-intro">
      <p>欢迎使用 <strong>Saminest</strong>（以下简称“本平台”、“Saminest”、“我们”）。</p>
      <p>本协议适用于所有访问、浏览、注册、发布信息或使用本平台服务的用户。</p>
      <p>在使用本平台之前，请您仔细阅读本协议。当您访问、注册账号或使用本平台时，即表示您已经阅读、理解并同意接受本协议全部内容。</p>
    </div>

    <section><h2>一、平台介绍</h2>
      <p>Saminest 是一个在线信息发布平台，目前主要提供：</p>
      <ul><li>房屋出租（Rental Listings）</li><li>求租信息（Housing Wanted）</li><li>二手交易（Marketplace）</li></ul>
      <p>平台仅提供信息发布、浏览及交流服务。</p>
      <p>Saminest <strong>不是房东、卖家、中介、经纪人、支付机构或物流服务提供者</strong>。平台不会参与任何用户之间的实际交易。</p>
    </section>

    <section><h2>二、用户资格</h2>
      <p>使用本平台即表示您承诺：</p>
      <ol><li>您具有合法使用本平台的资格；</li><li>您提供的信息真实、准确、完整；</li><li>您不会冒充他人；</li><li>您不会利用平台从事违法活动；</li><li>您将妥善保管账号及密码。</li></ol>
      <p>用户应对自己账号内发生的一切行为承担责任。</p>
    </section>

    <section><h2>三、账号注册</h2>
      <p>注册账号时，用户可能需要提供：</p>
      <ul><li>邮箱</li><li>用户昵称</li><li>登录信息</li></ul>
      <p>用户不得：</p>
      <ul><li>冒充他人</li><li>使用虚假身份</li><li>恶意注册多个账号</li><li>使用机器人批量注册</li></ul>
      <p>平台有权拒绝任何异常注册申请。</p>
    </section>

    <section><h2>四、平台服务</h2>
      <h3>房屋出租</h3><p>用户可以发布 Apartment、Condo、House、Townhouse、Room、Studio 等出租信息。</p>
      <h3>求租</h3><p>用户可以发布求租需求、合租需求、找室友等信息。</p>
      <h3>二手交易</h3><p>用户可以发布家具、电器、数码产品、汽车用品、学习用品、生活用品，以及法律允许交易的其他物品。</p>
      <p>平台未来可能增加新的功能。平台有权调整、暂停或终止部分服务，而无需提前通知。</p>
    </section>

    <section><h2>五、信息发布规范</h2>
      <p>所有用户发布的信息必须真实、合法、准确，并且不侵犯他人权益。</p>
      <h3>虚假内容</h3><ul><li>虚假房源</li><li>虚假价格</li><li>虚假图片</li><li>虚假联系方式</li><li>虚假身份</li></ul>
      <h3>欺诈行为</h3><ul><li>收取定金后失联</li><li>冒充房东</li><li>冒充买家</li><li>冒充平台工作人员</li><li>网络诈骗</li></ul>
      <h3>非法内容</h3><ul><li>色情内容</li><li>赌博信息</li><li>毒品</li><li>武器交易</li><li>非法服务</li><li>洗钱</li><li>金融诈骗</li></ul>
      <h3>垃圾内容</h3><ul><li>重复发帖</li><li>恶意广告</li><li>自动发帖</li><li>机器人发帖</li><li>批量刷帖</li></ul>
      <h3>侵权内容</h3><ul><li>他人图片</li><li>他人文字</li><li>商标</li><li>版权内容</li><li>个人隐私</li></ul>
      <p>未经授权不得发布。</p>
    </section>

    <section><h2>六、内容审核</h2>
      <p>平台有权审核帖子、修改分类、删除内容、下架帖子、屏蔽图片、限制账号功能或永久封禁账号。平台无需提前通知用户。</p>
    </section>

    <section><h2>七、交易风险</h2>
      <p>平台仅提供信息展示。所有交易均由用户自行决定，包括但不限于看房、签合同、面交、邮寄、转账及付款。</p>
      <p>平台不会担保房源真实性、商品真实性、房东身份、买家身份、商品质量或合同履行。请用户自行判断交易风险。</p>
    </section>

    <section><h2>八、安全提示</h2>
      <p>为了保护您的财产安全，我们建议：</p>
      <ul><li>实地看房</li><li>当面交易</li><li>核实身份</li><li>使用安全支付方式</li><li>不向陌生人提前支付定金</li></ul>
      <p>如果发现诈骗，请立即停止交易，并及时向有关部门举报。</p>
    </section>

    <section><h2>九、用户内容</h2>
      <p>用户发布的内容，包括图片、标题、描述和评论，其知识产权归用户所有。</p>
      <p>用户授予平台一项全球范围内、非独占、免版税的许可，用于展示、存储、复制、推广和运营平台服务。</p>
      <p>如果用户删除内容，该授权将在合理时间内终止，但法律要求保留或系统备份中的内容除外。</p>
    </section>

    <section><h2>十、知识产权</h2>
      <p>Saminest 网站中的 Logo、页面设计、UI、程序代码、数据库、图标和文本（用户发布内容除外）均属于平台所有。未经许可不得复制、转载或商业使用。</p>
    </section>

    <section><h2>十一、账号暂停与终止</h2>
      <p>如用户违反本协议，平台有权删除帖子、限制发帖、暂停账号、永久封禁账号或删除账号，无需提前通知。</p>
    </section>

    <section><h2>十二、免责声明</h2>
      <p>在法律允许范围内，平台不承担以下责任：</p>
      <ul><li>用户被骗</li><li>房屋纠纷</li><li>商品质量问题</li><li>合同纠纷</li><li>支付纠纷</li><li>用户之间的任何争议</li><li>第三方行为造成的损失</li><li>网络中断</li><li>数据丢失</li><li>不可抗力</li></ul>
      <p>用户使用平台的风险由用户自行承担。</p>
    </section>

    <section><h2>十三、第三方服务</h2>
      <p>平台可能使用第三方服务，包括但不限于 Supabase（数据库及身份验证）、Vercel（网站托管）、Cloudflare（网络安全与加速）、Google Analytics（如启用）及 Microsoft Clarity（如启用）。</p>
      <p>第三方服务受其各自条款和隐私政策约束。</p>
    </section>

    <section><h2>十四、协议修改</h2>
      <p>平台有权根据业务发展或法律法规要求修改本协议。修改后的协议将在网站公布。继续使用平台即表示您接受最新版本。</p>
    </section>

    <section><h2>十五、适用法律</h2>
      <p>本协议受适用法律管辖。如因本协议产生争议，双方应首先友好协商解决；协商不成的，可依法向有管辖权的法院提起诉讼。</p>
    </section>

    <section><h2>十六、联系我们</h2>
      <p>如果您对本协议有任何疑问，可通过网站内的 <a href="#feedback">意见反馈（Feedback）</a> 页面与我们联系。</p>
      <p>感谢您使用 Saminest。我们致力于打造一个真实、安全、友好的租房、求租及二手交易社区。</p>
    </section>
  `);
}

function renderPrivacy() {
  renderLegalDocument("Privacy Policy", "隐私政策", `
    <div class="legal-intro">
      <p>欢迎使用 <strong>Saminest</strong>（以下简称“本平台”、“我们”）。</p>
      <p>我们尊重您的隐私，并致力于保护您的个人信息安全。</p>
      <p>本隐私政策说明我们如何收集、使用、存储、共享及保护您的个人信息。当您访问或使用本平台时，即表示您已阅读并同意本隐私政策。</p>
    </div>

    <section><h2>一、我们收集的信息</h2>
      <h3>1. 您主动提供的信息</h3>
      <p>包括但不限于：</p>
      <ul><li>邮箱地址</li><li>用户昵称</li><li>头像（如适用）</li><li>发布的房源信息</li><li>发布的求租信息</li><li>发布的二手商品信息</li><li>上传的图片</li><li>联系方式（如您主动填写）</li><li>意见反馈内容</li></ul>
      <h3>2. 自动收集的信息</h3>
      <p>为了保障平台安全及改善用户体验，我们可能自动收集：</p>
      <ul><li>IP 地址</li><li>浏览器类型</li><li>操作系统</li><li>设备信息</li><li>屏幕尺寸</li><li>访问时间</li><li>页面浏览记录</li><li>点击记录</li><li>来源页面</li><li>Cookie</li><li>Session 信息</li></ul>
      <h3>3. 第三方登录（如未来支持）</h3>
      <p>若未来支持 Google、Apple 等登录方式，我们可能获取用户名称、邮箱和用户头像，仅限完成登录及账号管理所必需的信息。</p>
    </section>

    <section><h2>二、信息的使用目的</h2>
      <p>我们可能将您的信息用于：</p>
      <ul><li>创建及管理账号</li><li>登录验证</li><li>发布房源</li><li>发布求租</li><li>发布二手商品</li><li>展示用户内容</li><li>提供平台功能</li><li>发送必要通知</li><li>防止垃圾信息</li><li>防止诈骗</li><li>风险控制</li><li>统计访问数据</li><li>优化网站性能</li><li>改善用户体验</li><li>回应用户反馈</li></ul>
      <p><strong>我们不会将您的个人信息出售给任何第三方。</strong></p>
    </section>

    <section><h2>三、Cookie</h2>
      <p>为了提供更好的服务，本平台可能使用 Cookie。Cookie 可用于保持登录状态、保存用户偏好、提高访问速度、防止重复登录、网站统计分析及提升用户体验。</p>
      <p>您可以通过浏览器关闭 Cookie。关闭 Cookie 后，部分功能可能无法正常使用。</p>
    </section>

    <section><h2>四、信息共享</h2>
      <p>除以下情况外，我们不会出售、出租或公开您的个人信息：</p>
      <h3>获得您的授权</h3><p>您明确同意共享。</p>
      <h3>法律要求</h3><p>根据法律法规、法院命令或政府机关要求，依法提供必要信息。</p>
      <h3>平台安全</h3><p>为了防止诈骗、防止违法行为、保护用户权益及维护平台安全，平台可能披露必要信息。</p>
      <h3>第三方服务</h3><p>平台可能使用第三方服务提供商协助运营，例如 Supabase（数据库及身份验证）、Vercel（网站托管）、Cloudflare（CDN 与安全）、Google Analytics（访问统计，如启用）和 Microsoft Clarity（用户行为分析，如启用）。第三方可能根据其自身隐私政策处理必要的数据。</p>
    </section>

    <section><h2>五、数据存储</h2>
      <p>您的数据可能存储于第三方云服务器。平台会采取合理措施保护数据安全，包括 HTTPS 加密传输、权限控制、身份验证、数据备份和安全监控。</p>
      <p>尽管如此，没有任何互联网系统能够保证绝对安全。</p>
    </section>

    <section><h2>六、数据保留</h2>
      <p>我们将在实现本政策所述目的所必需的期限内保留您的信息。</p>
      <p>在法律法规要求、解决纠纷、防止欺诈、配合调查或履行法律义务的情况下，我们可能保留部分信息。</p>
    </section>

    <section><h2>七、用户权利</h2>
      <p>您有权查看自己的资料、修改资料、修改发布内容、删除发布内容、删除账号（如平台提供），以及请求删除依法无需保留的个人信息。</p>
      <p>平台将在合理期限内处理您的请求。</p>
    </section>

    <section><h2>八、儿童隐私</h2>
      <p>Saminest 不面向 <strong>13 岁以下儿童</strong>提供服务。</p>
      <p>如果我们发现儿童未经监护人同意提供个人信息，我们将在核实后尽快删除相关数据。</p>
    </section>

    <section><h2>九、安全措施</h2>
      <p>为了保护您的数据，我们采取包括但不限于 HTTPS 加密、身份认证、权限控制、安全更新、风险监测和数据备份等措施。</p>
      <p>请您妥善保管自己的账号和密码。如发现账号异常，请及时修改密码。</p>
    </section>

    <section><h2>十、第三方链接</h2>
      <p>平台可能包含房东网站、外部资源或第三方服务等链接。点击第三方链接后，相关网站的隐私政策将适用于您。</p>
      <p>Saminest 不对第三方网站负责。</p>
    </section>

    <section><h2>十一、国际数据传输</h2>
      <p>由于互联网服务具有全球性质，您的信息可能会在不同国家或地区进行处理和存储。我们将采取合理措施确保您的信息获得适当保护。</p>
    </section>

    <section><h2>十二、政策更新</h2>
      <p>我们可能根据法律法规变化、平台业务发展或产品更新修改本隐私政策。更新后的版本将在本页面公布。</p>
      <p>继续使用平台即表示您同意最新版本。</p>
    </section>

    <section><h2>十三、联系我们</h2>
      <p>如果您对本隐私政策有任何疑问、建议或请求，可通过网站内的 <a href="#feedback">意见反馈（Feedback）</a> 页面联系我们。</p>
      <p>感谢您对 Saminest 的信任。我们将持续努力保护您的个人信息安全，并为您提供安全、可靠的租房、求租和二手交易平台。</p>
    </section>
  `);
}

function renderSettings() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("设置")}
      <section class="subpage-card">
        <div class="subpage-list">
          <a href="#settings-profile">账号资料<span>${state.user.name}</span></a>
          <a href="#messages">消息通知<span>已开启</span></a>
          <a href="#terms">用户服务协议<span>查看</span></a>
          <a href="#privacy">隐私政策<span>查看</span></a>
          <a href="#home">清除演示数据<span data-reset>重置</span></a>
        </div>
        <button class="logout-button" type="button" data-logout>退出登录</button>
      </section>
    </section>
  `;
}

function renderProfileSettings() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("账号资料")}
      <form class="subpage-card profile-settings-form" data-profile-form>
        <div class="profile-editor-head">
          <label class="avatar profile-avatar-button" aria-label="上传头像">
            ${avatarContent(state.user.name, state.user.avatarUrl, state.user.avatar)}
            <input class="visually-hidden" type="file" accept="image/*" data-avatar-input />
          </label>
          <div>
            <strong>${escapeHtml(state.user.name || "Saminest 用户")}</strong>
            <span>${escapeHtml(state.session?.email || state.session?.account || "已登录账号")}</span>
          </div>
        </div>
        <div class="field-grid">
          ${inputField("name", "用户昵称", "例如 Rockville 小陈", true, state.user.name || "")}
          ${inputField("subtitle", "个人说明", "例如 DMV 华人租房二手", false, state.user.subtitle || "")}
        </div>
        <button class="primary-button" type="submit">保存资料</button>
      </form>
    </section>
  `;
}

function renderNoAccess() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("无权限")}
      <section class="subpage-card">
        <p>这个页面只有管理员可以查看。</p>
        <a class="primary-button" href="#me">返回我的</a>
      </section>
    </section>
  `;
}

function renderUnavailable(message = "这条内容还在审核中、已被拒绝，或你没有权限查看。") {
  resetSeoMeta();
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("不可查看")}
      <section class="subpage-card">
        <p>${escapeHtml(message)}</p>
        <a class="primary-button" href="#home">返回首页</a>
      </section>
    </section>
  `;
}

function renderAdminReview(status = "pending") {
  const currentStatus = ["pending", "active", "rejected", "expired"].includes(status) ? status : "pending";
  const entries = adminListings().filter((item) => listingStatus(item) === currentStatus);
  app.innerHTML = `
    <section class="page-screen admin-screen">
      ${pageHeader("管理员审核")}
      <div class="admin-tabs">
        ${adminTab("pending", "待审核", currentStatus)}
        ${adminTab("active", "已通过", currentStatus)}
        ${adminTab("rejected", "已拒绝", currentStatus)}
        ${adminTab("expired", "已下架", currentStatus)}
      </div>
      <section class="admin-summary">
        <span>Pending ${statusCount("pending")}</span>
        <span>Approved ${statusCount("active")}</span>
        <span>Rejected ${statusCount("rejected")}</span>
        <span>Expired ${statusCount("expired")}</span>
      </section>
      ${
        entries.length
          ? `<section class="admin-bulk-bar">
              <label><input type="checkbox" data-admin-select-all /> 全选当前页</label>
              <div>
                <button class="primary-button" type="button" data-bulk-review="active">批量通过</button>
                <button class="secondary-button" type="button" data-bulk-review="rejected">批量拒绝</button>
                <button class="danger-button" type="button" data-bulk-review="ban">批量封禁</button>
              </div>
            </section>`
          : ""
      }
      <div class="admin-list">
        ${entries.length ? entries.map(adminReviewCard).join("") : emptyBlock("这里暂时没有内容")}
      </div>
      ${bottomNav("me")}
    </section>
  `;
}

function adminTab(status, label, currentStatus) {
  return `<a class="${status === currentStatus ? "active" : ""}" href="#admin-review/${status}">${label}</a>`;
}

function statusCount(status) {
  return state.listings.filter((item) => listingStatus(item) === status).length;
}

function renderAuthPage(title = "登录后继续", returnTo = "#home", mode = "login") {
  document.body.dataset.page = "auth";
  const safeReturnTo = returnTo || "#home";
  if (mode === "register-code") mode = "register";
  const copy = {
    login: {
      title: title === "登录后继续" ? "欢迎回来" : title,
      desc: "使用邮箱和密码登录后，即可发布信息、收藏帖子、发送消息和管理账号。"
    },
    register: {
      title: "创建账号",
      desc: "填写邮箱和密码后，我们会发送确认邮件，完成验证后即可发布和联系。"
    },
    forgot: {
      title: "找回密码",
      desc: "输入注册邮箱后，我们会发送验证邮件。点击邮件里的链接后即可设置新密码。"
    },
    reset: {
      title: "设置新密码",
      desc: "请设置一个新的密码，建议至少 6 位并包含数字和字母。"
    }
  };

  const authShell = (content, helpLink = true) => `
    <section class="page-screen auth-screen auth-v2-screen">
      <header class="auth-topbar auth-v2-topbar">
        <button class="plain-back" type="button" data-back aria-label="返回">‹</button>
        ${helpLink ? `<a href="#help">帮助</a>` : `<span></span>`}
      </header>
      <section class="auth-card auth-v2-card" aria-label="账号页面">
      <a class="auth-brand-v2" href="#home" aria-label="Saminest 首页">
        <span>Saminest</span>
        </a>
        ${content}
      </section>
    </section>
  `;

  const titleBlock = (currentMode) => `
    <div class="auth-title-block">
      <h1>${escapeHtml(copy[currentMode]?.title || "欢迎回来")}</h1>
        <p>${escapeHtml(copy[currentMode]?.desc || "登录后继续使用 Saminest。")}</p>
    </div>
  `;

  const passwordInput = (name, label, placeholder, autocomplete = "new-password") => `
    <label class="auth-input">
      <span>${label}</span>
      <div><em>锁</em><input name="${name}" type="password" autocomplete="${autocomplete}" minlength="6" placeholder="${placeholder}" required /><button type="button" data-toggle-password>显示</button></div>
    </label>
  `;

  if (mode === "register") {
    app.innerHTML = authShell(`
      ${titleBlock("register")}
      <form class="auth-v2-form" data-auth-form data-auth-action="register">
        <input type="hidden" name="returnTo" value="${escapeHtml(safeReturnTo)}" />
        <label class="auth-input"><span>邮箱</span><div><em>@</em><input name="email" type="email" autocomplete="email" placeholder="请输入常用邮箱" required /></div></label>
        <label class="auth-input"><span>昵称</span><div><em>人</em><input name="name" autocomplete="name" maxlength="28" placeholder="例如 Rockville 小陈" /></div></label>
        ${passwordInput("password", "密码", "至少 6 位密码")}
        ${passwordInput("confirmPassword", "确认密码", "再次输入密码")}
        <label class="auth-agreement auth-v2-agreement"><input type="checkbox" name="agreement" required /><span>我已阅读并同意<a href="#terms">《用户服务协议》</a>和<a href="#privacy">《隐私政策》</a></span></label>
        <button class="primary-button auth-v2-submit" type="submit">创建账号</button>
        <p class="auth-switch">已有账号？<button type="button" data-auth-screen="login">去登录</button></p>
      </form>
    `);
    return;
  }

  if (mode === "forgot") {
    app.innerHTML = authShell(`
      ${titleBlock("forgot")}
      <form class="auth-v2-form" data-auth-form data-auth-action="forgot">
        <input type="hidden" name="returnTo" value="${escapeHtml(safeReturnTo)}" />
        <label class="auth-input"><span>邮箱</span><div><em>@</em><input name="email" type="email" autocomplete="email" placeholder="请输入注册邮箱" required /></div></label>
        <button class="primary-button auth-v2-submit" type="submit">发送验证邮件</button>
        <p class="auth-switch">想起来了？<button type="button" data-auth-screen="login">返回登录</button></p>
      </form>
    `);
    return;
  }

  if (mode === "reset") {
    app.innerHTML = authShell(`
      ${titleBlock("reset")}
      <form class="auth-v2-form" data-auth-form data-auth-action="reset">
        <input type="hidden" name="returnTo" value="${escapeHtml(safeReturnTo)}" />
        ${passwordInput("password", "新密码", "请输入新密码")}
        ${passwordInput("confirmPassword", "确认新密码", "再次输入新密码")}
        <button class="primary-button auth-v2-submit" type="submit">确认重置</button>
      </form>
    `);
    return;
  }

  if (mode === "success") {
    app.innerHTML = authShell(`
      <div class="auth-success-card">
        <span class="auth-success-icon">✓</span>
        <h1>密码修改成功</h1>
        <p>请使用新的密码重新登录。</p>
        <button class="primary-button auth-v2-submit" type="button" data-auth-screen="login">返回登录</button>
      </div>
    `, false);
    return;
  }

  app.innerHTML = authShell(`
    ${titleBlock("login")}
    <form class="auth-v2-form" data-auth-form data-auth-action="login">
      <input type="hidden" name="returnTo" value="${escapeHtml(safeReturnTo)}" />
      <label class="auth-input"><span>邮箱</span><div><em>@</em><input name="email" type="email" autocomplete="username" placeholder="请输入邮箱" required /></div></label>
      <label class="auth-input"><span>密码</span><div><em>锁</em><input name="password" type="password" autocomplete="current-password" placeholder="请输入密码" required /><button type="button" data-toggle-password>显示</button></div></label>
      <div class="auth-row-between"><label><input type="checkbox" name="remember" /> 记住我</label><button type="button" data-auth-screen="forgot">忘记密码？</button></div>
      <button class="primary-button auth-v2-submit" type="submit">登录</button>
      <div class="auth-divider"><span>或</span></div>
      <button class="secondary-button auth-v2-secondary" type="button" data-auth-screen="register">创建新账号</button>
    </form>
  `);
}

function showAuthError(form, message) {
  form.querySelector("[data-auth-error]")?.remove();
  form.insertAdjacentHTML("afterbegin", `<div class="auth-error" data-auth-error>${escapeHtml(message)}</div>`);
}

function hasSupabaseAuth() {
  return Boolean(supabaseClient?.auth);
}

function authRedirectUrl(mode = "reset") {
  if (mode === "reset") return `${window.location.origin}${window.location.pathname}?auth=reset`;
  return `${window.location.origin}${window.location.pathname}#auth/${mode}`;
}

function emailRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}#auth/login`;
}

function isSupabaseEmailVerified(user) {
  return Boolean(user?.email_confirmed_at || user?.confirmed_at);
}

function isPasswordRecoveryHash() {
  const hash = window.location.hash || "";
  const text = `${hash}&${window.location.search || ""}`;
  return /(^|[&#?])type=recovery(&|$)/.test(text)
    || /(^|[&#?])auth=reset(&|$)/.test(text)
    || hash.startsWith("#auth/reset");
}

function recoveryParams() {
  const hash = (window.location.hash || "").replace(/^#/, "");
  const search = (window.location.search || "").replace(/^\?/, "");
  const hashQueryIndex = hash.indexOf("?");
  const hashQuery = hashQueryIndex >= 0 ? hash.slice(hashQueryIndex + 1) : "";
  const hashRouteParams = hash.replace(/^auth\/reset[?&]?/, "");
  const raw = [search, hash, hashQuery, hashRouteParams].filter(Boolean).join("&");
  return new URLSearchParams(raw);
}
async function ensureRecoverySession() {
  if (!cloudReady()) return false;

  try {
    // 1. 先检查是否已经有有效 session
    const {
      data: sessionData,
      error: sessionError
    } = await supabaseClient.auth.getSession();

    if (!sessionError && sessionData?.session?.user) {
      return true;
    }

    const url = new URL(window.location.href);

    // 2. 支持 PKCE code
    const code = url.searchParams.get("code");

    if (code) {
      const {
        data,
        error
      } = await supabaseClient.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Recovery code exchange failed:", error);
      } else if (data?.session?.user) {
        // 清除地址栏里的 code，防止重复交换
        url.searchParams.delete("code");
        window.history.replaceState(
          {},
          document.title,
          `${url.pathname}${url.search}${url.hash}`
        );

        return true;
      }
    }

    // 3. 兼容旧版 hash token 链接
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const {
        data,
        error
      } = await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        console.error("Recovery token session failed:", error);
      } else if (data?.session?.user) {
        return true;
      }
    }

    // 4. 再等待一次 Supabase 自动解析链接
    await new Promise((resolve) => setTimeout(resolve, 500));

    const {
      data: retryData
    } = await supabaseClient.auth.getSession();

    return Boolean(retryData?.session?.user);
  } catch (error) {
    console.error("ensureRecoverySession failed:", error);
    return false;
  }
}

function normalizeAuthEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function localAccountForEmail(email) {
  return state.accounts?.[normalizeAuthEmail(email)] || null;
}

function saveLocalAccount(email, account) {
  const normalizedEmail = normalizeAuthEmail(email);
  state.accounts ||= {};
  state.accounts[normalizedEmail] = { ...account, email: normalizedEmail };
  saveState();
  return state.accounts[normalizedEmail];
}

function authErrorMessage(error) {
  const message = String(error?.message || "");
  if (!message) return "账号功能暂时不可用，请稍后再试。";
  if (/auth session missing/i.test(message)) return "请先输入注册邮箱，再设置新密码。";
  if (/invalid login credentials/i.test(message)) return "邮箱或密码不正确，请重新输入。";
  if (/email not confirmed/i.test(message)) return "邮箱还没有验证，请先打开系统发送的确认邮件。";
  if (/already registered|already exists|user already/i.test(message)) return "这个邮箱已经注册，请直接登录。";
  if (/token|otp|code/i.test(message)) return "账号状态已过期，请重新操作一次。";
  if (/password/i.test(message) && /six|6|weak|short/i.test(message)) return "密码至少需要 6 位。";
  return message;
}

function setAuthLoading(form, loading, text = "处理中...") {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    delete button.dataset.originalText;
  }
}

function renderAuthNotice(title, desc, returnTo = "#home", actionLabel = "返回登录", actionMode = "login") {
  document.body.dataset.page = "auth";
  app.innerHTML = `
    <section class="page-screen auth-screen auth-v2-screen">
      <header class="auth-topbar auth-v2-topbar">
        <button class="plain-back" type="button" data-back aria-label="返回">‹</button>
        <span></span>
      </header>
      <section class="auth-card auth-v2-card" aria-label="账号页面">
    <a class="auth-brand-v2" href="#home" aria-label="Saminest 首页">
      <span>Saminest</span>
        </a>
        <div class="auth-success-card">
          <span class="auth-success-icon">✓</span>
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(desc)}</p>
          <form data-auth-form data-auth-action="notice">
            <input type="hidden" name="returnTo" value="${escapeHtml(returnTo)}" />
            <button class="primary-button auth-v2-submit" type="button" data-auth-screen="${escapeHtml(actionMode)}">${escapeHtml(actionLabel)}</button>
          </form>
        </div>
      </section>
    </section>
  `;
}

async function ensureSupabaseProfile(user, displayName = "") {
  if (!cloudReady() || !user) return null;
  const email = normalizeAuthEmail(user.email);
  const role = email === ADMIN_EMAIL ? "admin" : "user";
  const fallbackName = displayName || user.user_metadata?.display_name || user.user_metadata?.name || email.split("@")[0] || "Saminest 用户";
  const payload = {
    id: user.id,
    email,
    display_name: fallbackName,
    role
  };
  const { data, error } = await supabaseClient
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();
  if (error) {
    console.warn("Failed to upsert profile", error);
    return payload;
  }
  return data || payload;
}

async function completeSupabaseAuth(user, returnTo = "#home", displayName = "") {
  if (!user) return;
  if (!isSupabaseEmailVerified(user)) {
    await supabaseClient.auth.signOut();
    state.session = { loggedIn: false };
    saveState();
    renderAuthNotice(
      "请先验证邮箱",
      "请点击系统发送的确认链接后再登录。发件邮箱由 Supabase SMTP 设置控制。",
      returnTo
    );
    return;
  }
  const email = normalizeAuthEmail(user.email);
  const profile = await ensureSupabaseProfile(user, displayName);
  const userName = profile?.display_name || displayName || user.user_metadata?.display_name || user.user_metadata?.name || (email ? email.split("@")[0] : "Saminest 用户");
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || "";
  completeAuth(email || user.id, {
    name: userName,
    email,
    role: profile?.role || (email === ADMIN_EMAIL ? "admin" : "user"),
    provider: "supabase",
    userId: user.id,
    avatarUrl
  }, returnTo);
  await refreshCloudData();
  route();
}

async function syncSupabaseSession() {
  if (!hasSupabaseAuth()) return false;

  if (isPasswordRecoveryHash()) {
    const recoveryReady = await ensureRecoverySession();

    document.body.dataset.recoveryReady =
      recoveryReady ? "true" : "false";

    return recoveryReady;
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.warn("Failed to read Supabase session", error);
    return false;
  }

  if (data?.session?.user) {
    const currentHash = location.hash || "#home";

    await completeSupabaseAuth(
      data.session.user,
      currentHash.startsWith("#auth") ? "#home" : currentHash
    );

    return true;
  }

  if (state.session?.provider === "supabase") {
    state.session = { loggedIn: false };
    saveState();
  }

  return false;
}
function completeAuth(account, savedAccount, returnTo) {
  const userName = savedAccount?.name || `用户${String(account).slice(-4)}` || "Saminest 用户";
  const role = savedAccount?.role || (String(account).toLowerCase().includes("admin") ? "admin" : "user");
  state.session = {
    loggedIn: true,
    account,
    email: savedAccount?.email || account,
    role,
    provider: savedAccount?.provider || "local",
    userId: savedAccount?.userId || ""
  };
  state.user = {
    name: userName,
    subtitle: savedAccount?.subtitle || "Saminest",
    avatar: (userName || account || "D").slice(0, 1).toUpperCase(),
    avatarUrl: savedAccount?.avatarUrl || ""
  };
  saveState();
  location.hash = returnTo || "#home";
  route();
}

function avatarContent(name = "华", imageUrl = "", fallback = "") {
  const initial = String(fallback || name || "华").trim().slice(0, 1).toUpperCase() || "华";
  return imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(name || "用户头像")}" />`
    : `<span>${escapeHtml(initial)}</span>`;
}

function listingMetricSeed(item, salt = 0) {
  return String(item?.id || item?.title || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), salt);
}

function listingFavoriteCount(item) {
  const persisted = Number(item?.favoriteCount || item?.likes || 0);
  const localFavorite = state.favorites.includes(item.id) ? 1 : 0;
  return Math.max(persisted, localFavorite);
}

function formatMetric(value) {
  const count = Number(value || 0);
  return count >= 1000 ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k` : String(count);
}

function ownerAvatarFor(item) {
  return isOwner(item) ? state.user.avatarUrl : item.ownerAvatar || "";
}

function syncCurrentUserListingsProfile(updates = {}) {
  const userId = currentUserId();
  if (!userId) return;
  state.listings = state.listings.map((item) => {
    if (item.ownerAccount !== userId) return item;
    return {
      ...item,
      owner: updates.name || item.owner,
      ownerAvatar: updates.avatarUrl ?? item.ownerAvatar
    };
  });
}

function mobileHeader() {
  return `
    <header class="home-header">
      <a class="home-logo" href="#home"><b>Saminest</b></a>
    </header>
  `;
}

function pageHeader(title, options = {}) {
  const action = options.submitFormId
    ? `<button class="page-header-action" type="submit" form="${escapeHtml(options.submitFormId)}" data-publish-submit>${escapeHtml(options.actionLabel || "发布")}</button>`
    : `<a href="#publish">发布</a>`;
  return `
    <header class="page-header">
      <button class="plain-back" type="button" data-back>‹</button>
      <h1>${title}</h1>
      ${action}
    </header>
  `;
}

function bottomNav(active) {
  const messageCount = unreadMessageCount();
  return `
    <nav class="home-bottom-nav" aria-label="底部导航">
      <a class="${active === "home" ? "active" : ""}" href="#home"><span>⌂</span>首页</a>
      <a class="${active === "favorites" ? "active" : ""}" href="#favorites"><span>♡</span>收藏</a>
      <a class="home-publish ${active === "publish" ? "active" : ""}" href="#publish"><span>＋</span>发布</a>
      <a class="${active === "messages" ? "active" : ""}" href="#messages"><span>信</span>消息${messageCount ? `<em>${messageCount}</em>` : ""}</a>
      <a class="${active === "me" ? "active" : ""}" href="#me"><span>○</span>我的</a>
    </nav>
  `;
}

function MasonryCard(item, options = {}) {
  return listingCard(item, { ...options, masonry: true });
}

function HousingListCard(item) {
  const favored = state.favorites.includes(item.id);
  const images = listingImages(item);
  const imageCount = images.length || item.photoCount || 0;
  const coverImage = images[0] || item.image || fallbackImages[item.type] || fallbackImages.used;
  return `
    <article class="housing-list-card" data-open-listing="${item.id}">
      <span class="housing-media">
        <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(item.title)}" loading="eager" decoding="async" onerror="this.onerror=()=>this.closest('.housing-media').classList.add('is-empty'); this.src='${escapeHtml(fallbackImages[item.type] || fallbackImages.used)}';" />
        <span class="photo-count">${imageCount ? `图 ${imageCount}` : typeLabel(item.type)}</span>
      </span>
      <span class="housing-info">
        <span class="housing-title">${escapeHtml(item.title)}</span>
        <span class="housing-price">${escapeHtml(item.price)}</span>
        <span class="housing-location">${escapeHtml(item.area)}</span>
        <span class="housing-facts">
          <span>${escapeHtml(housingRoomType(item))}</span>
          <span>${escapeHtml(housingSize(item))}</span>
          <span>${escapeHtml(housingMoveIn(item))}</span>
        </span>
        <span class="housing-bottom">
          <span>${escapeHtml(displayListingTime(item))}</span>
          <span class="listing-stats housing-favorite-stat">
            <button class="card-favorite-button ${favored ? "active" : ""}" type="button" data-favorite="${item.id}" aria-label="${favored ? "取消收藏" : "收藏"}">${favored ? "♥" : "♡"}</button>
            <span>${formatMetric(listingFavoriteCount(item))}</span>
          </span>
        </span>
      </span>
    </article>
  `;
}

function housingRoomType(item) {
  return item.roomType || (item.detailTags || item.tags || []).find((tag) => /单间|主卧|整租|合租|卧室|房/.test(tag)) || "房型详询";
}

function housingSize(item) {
  return item.size || item.areaSize || (item.detailTags || item.tags || []).find((tag) => /sqft|尺|面积|平/.test(tag)) || "面积详询";
}

function housingMoveIn(item) {
  return item.moveIn || (item.detailTags || item.tags || []).find((tag) => /入住|立即|一周|下个月|月/.test(tag)) || "入住时间详询";
}

function listingCard(item, options = {}) {
  const favored = state.favorites.includes(item.id);
  const tags = (item.detailTags?.length ? item.detailTags : item.tags || []).slice(0, 2);
  const status = listingStatus(item);
  const showStatus = Boolean(options.status);
  const images = listingImages(item);
  const imageCount = images.length || item.photoCount || 0;
  const coverImage = images[0] || item.image || fallbackImages[item.type] || fallbackImages.used;
  const ownerName = item.owner || "发布者";
  const cardClasses = ["listing-card", options.compact ? "compact" : "", options.masonry ? "masonry-card" : ""].filter(Boolean).join(" ");
  return `
    <article class="${cardClasses}" data-open-listing="${item.id}">
      <span class="listing-media">
        <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(item.title)}" loading="eager" decoding="async" onerror="this.onerror=()=>this.closest('.listing-media').classList.add('is-empty'); this.src='${escapeHtml(fallbackImages[item.type] || fallbackImages.used)}';" />
        <span class="photo-count">${imageCount ? `图 ${imageCount}` : typeLabel(item.type)}</span>
      </span>
      <span class="listing-content">
        <span class="listing-title">${escapeHtml(item.title)}</span>
        <span class="listing-meta-line">
          <span class="listing-type">${typeLabel(item.type)}</span>
          <span>${escapeHtml(categoryPrimaryMeta(item))}</span>
        </span>
        <span class="listing-price-row">
          <span class="price">${escapeHtml(categoryPrimaryPrice(item))}</span>
          <span class="listing-time">${escapeHtml(displayListingTime(item))}</span>
        </span>
        <span class="meta listing-tags">
          ${showStatus ? `<span class="status-badge ${status}">${statusLabel(status)}</span>` : ""}
          ${tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
        </span>
        <span class="listing-author-row">
          <span class="listing-author">
            <span class="listing-author-avatar">${avatarContent(ownerName, ownerAvatarFor(item))}</span>
            <span class="listing-author-name">${escapeHtml(ownerName)}</span>
          </span>
          <span class="listing-stats">
            ${options.favorite ? `<button class="card-favorite-button ${favored ? "active" : ""}" type="button" data-favorite="${item.id}" aria-label="${favored ? "取消收藏" : "收藏"}">${favored ? "♥" : "♡"}</button>` : `<span class="card-favorite-icon">♡</span>`}
            <span>${formatMetric(listingFavoriteCount(item))}</span>
          </span>
        </span>
      </span>
    </article>
  `;
}

function manageListingCard(item) {
  return `
    <article class="manage-card">
      ${listingCard(item, { compact: true, status: true })}
      <div class="manage-actions">
        <a class="secondary-button" href="${postUrl(item.id)}">查看</a>
        <button class="secondary-button" type="button" data-edit-listing="${item.id}">编辑</button>
        ${listingStatus(item) !== "expired" ? `<button class="secondary-button" type="button" data-expire-listing="${item.id}">下架</button>` : ""}
        <button class="danger-button" type="button" data-delete-listing="${item.id}" data-delete-origin="me">删除</button>
      </div>
    </article>
  `;
}

function manageDraftCard(draft) {
  const values = formValues(draft);
  return `
    <article class="manage-card">
      <div class="draft-summary">
        <b>${escapeHtml(values.title || "未命名草稿")}</b>
        <span>${typeLabel(draft.type)} · ${escapeHtml(values.area || "未填写地区")}</span>
      </div>
      <div class="manage-actions">
        <button class="primary-button" type="button" data-edit-draft="${draft.id}">继续编辑</button>
        <button class="danger-button" type="button" data-delete-draft="${draft.id}">删除</button>
      </div>
    </article>
  `;
}

function adminReviewCard(item) {
  const images = listingImages(item);
  const coverImage = images[0] || item.image || fallbackImages[item.type] || fallbackImages.used;
  return `
    <article class="admin-card">
      <label class="admin-select">
        <input type="checkbox" data-admin-select value="${item.id}" />
        <span>选择</span>
      </label>
      <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(item.title)}" />
      <div class="admin-card-body">
        <div class="admin-card-head">
          <b>${escapeHtml(item.title)}</b>
          <span class="status-badge ${listingStatus(item)}">${statusLabel(listingStatus(item))}</span>
        </div>
        <strong>${escapeHtml(item.price)}</strong>
        <dl class="admin-fields">
          <div><dt>地址</dt><dd>${escapeHtml(item.area)}</dd></div>
          <div><dt>发布时间</dt><dd>${escapeHtml(item.time || "刚刚")}</dd></div>
          <div><dt>发布用户</dt><dd>${escapeHtml(item.owner || "发布者")}</dd></div>
          <div><dt>联系方式</dt><dd>${escapeHtml(item.contact || "站内消息")}</dd></div>
          <div><dt>举报</dt><dd>${reportCount(item.id)} 次</dd></div>
        </dl>
      </div>
      <div class="admin-actions">
        <button class="primary-button" type="button" data-review-status="${item.id}:active">通过</button>
        <button class="secondary-button" type="button" data-review-status="${item.id}:rejected">拒绝</button>
        <button class="danger-button" type="button" data-ban-user="${item.id}">封禁用户</button>
        <a class="secondary-button" href="${postUrl(item.id)}">查看详情</a>
      </div>
    </article>
  `;
}

function reportCard(report) {
  const item = findListing(report.listingId);
  return `
    <article class="admin-card report-card">
      <div class="admin-card-body">
        <div class="admin-card-head">
          <b>${escapeHtml(item?.title || "帖子已删除")}</b>
          <span class="status-badge pending">举报</span>
        </div>
        <dl class="admin-fields">
          <div><dt>举报原因</dt><dd>${escapeHtml(report.reason || "未填写原因")}</dd></div>
          <div><dt>举报用户</dt><dd>${escapeHtml(report.account || "用户")}</dd></div>
          <div><dt>提交时间</dt><dd>${escapeHtml(report.time || "刚刚")}</dd></div>
        </dl>
      </div>
      <div class="admin-actions">
        ${item ? `<a class="secondary-button" href="${postUrl(item.id)}">查看帖子</a>` : ""}
      </div>
    </article>
  `;
}

function conversationItem(item) {
  const unreadCount = conversationUnreadCount(item);
  return `
    <a class="message-item ${unreadCount ? "has-unread" : ""}" href="#conversation/${item.id}">
      <span class="message-avatar">${item.avatar}</span>
      <span class="message-body">
        <b>${item.name}</b>
        <small>${item.lastMessage}</small>
      </span>
      <span class="message-side">
        <time>${item.time}</time>
        ${unreadCount ? `<em>${unreadCount}</em>` : ""}
      </span>
    </a>
  `;
}

function inputField(name, label, placeholder, required = false, value = "") {
  return `<div class="field"><label>${label}</label><input name="${name}" placeholder="${placeholder}" value="${escapeHtml(value || "")}" ${required ? "required" : ""} /></div>`;
}

function selectField(name, label, options, value = "") {
  return `<div class="field"><label>${label}</label><select name="${name}"><option value="">可选</option>${options.map((item) => `<option ${item === value ? "selected" : ""}>${item}</option>`).join("")}</select></div>`;
}

function formValues(source = {}) {
  const data = source.data || source;
  const tagText = Array.isArray(data.tags) ? data.tags.join(", ") : data.tags || "";
  const images = listingImages(data);
  return {
    id: data.id || "",
    draftId: source.data ? source.id : "",
    title: data.title || "",
    price: data.price || "",
    area: data.area || "",
    tags: tagText,
    roomType: data.roomType || "",
    moveIn: data.moveIn || "",
    contact: data.contact || "",
    desc: data.desc || "",
    image: data.image || images[0] || "",
    images,
    imageDataUrls: images,
    imageDataUrl: images[0] || data.imageDataUrl || (String(data.image || "").startsWith("data:") ? data.image : "")
  };
}

function selectedChip(values, chip, index) {
  const tags = normalizeList(values.tags);
  return tags.length ? tags.includes(chip) : false;
}

function emptyBlock(text) {
  return `<div class="empty-card">${text}</div>`;
}

function countType(type) {
  return publicListings().filter((item) => item.type === type).length;
}

function categoryName(type) {
  return categories.find((item) => item.key === type)?.name || "全部信息";
}

function typeLabel(type) {
  return { rent: "房源", wanted: "求租", used: "二手" }[type] || "帖子";
}

function categoryPrimaryMeta(item) {
  if (item.type === "wanted") return `目标 ${item.area || "地区不限"} · ${housingMoveIn(item)}`;
  if (item.type === "used") return `${usedCondition(item)} · ${item.area || "本地交易"}`;
  return item.area || "DMV";
}

function categoryPrimaryPrice(item) {
  if (item.type === "wanted") return item.price || "预算面议";
  return item.price || "价格面议";
}

function usedCondition(item) {
  return item.condition || (item.detailTags || item.tags || []).find((tag) => /新|成色|自取|可小刀|闲置/.test(tag)) || "成色详询";
}

function favoriteListings() {
  return state.favorites.map(findListing).filter(Boolean);
}

function historyListings() {
  return state.history.map(findListing).filter(Boolean);
}

function myListings() {
  return sortListings(state.listings.filter(isOwner));
}

function rememberHistory(id) {
  state.history = [id, ...state.history.filter((item) => item !== id)].slice(0, 20);
  saveState();
}

async function toggleFavorite(id) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后收藏帖子", postUrl(id));
    return;
  }
  if (cloudReady() && currentUserId()) {
    const isFavorite = state.favorites.includes(id);
    const result = isFavorite
      ? await supabaseClient.from("favorites").delete().eq("user_id", currentUserId()).eq("listing_id", id)
      : await supabaseClient.from("favorites").insert({ user_id: currentUserId(), listing_id: id });
    if (result.error) {
      window.alert(`收藏失败：${authErrorMessage(result.error)}`);
      return;
    }
    await loadFavoritesFromSupabase();
    renderFavoriteContext(id);
    return;
  }
  state.favorites = state.favorites.includes(id)
    ? state.favorites.filter((item) => item !== id)
    : [id, ...state.favorites];
  saveState();
  renderFavoriteContext(id);
}

function renderFavoriteContext(id) {
  if (/^#\/?(post|listing)\//.test(location.hash || "")) {
    renderPostDetail(id);
    return;
  }
  route();
}

async function createConversation(listingId) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后联系发布者", postUrl(listingId));
    return;
  }
  const listing = findListing(listingId);
  if (!listing) return renderUnavailable();
  if (cloudReady() && currentUserId()) {
    if (!listing.ownerAccount || listing.ownerAccount === currentUserId()) {
      window.alert("这是你自己的帖子，不需要联系自己。");
      return;
    }
    const payload = {
      listing_id: listingId,
      buyer_id: currentUserId(),
      seller_id: listing.ownerAccount
    };
    let { data: conversation, error } = await supabaseClient
      .from("conversations")
      .select("*")
      .eq("listing_id", listingId)
      .eq("buyer_id", currentUserId())
      .eq("seller_id", listing.ownerAccount)
      .maybeSingle();
    if (error) {
      window.alert("消息表还没有准备好，请先运行我生成的 supabase-messaging.sql。");
      return;
    }
    if (!conversation) {
      const created = await supabaseClient.from("conversations").insert(payload).select().single();
      if (created.error) {
        window.alert(`创建会话失败：${authErrorMessage(created.error)}`);
        return;
      }
      conversation = created.data;
      await supabaseClient.from("messages").insert({
        conversation_id: conversation.id,
        sender_id: currentUserId(),
        content: `你好，我想了解「${listing.title}」。`
      });
    }
    await loadConversationsFromSupabase();
    location.hash = `#conversation/${conversation.id}`;
    route();
    return;
  }
  let conversation = state.conversations.find((item) => item.listingId === listingId);
  if (!conversation) {
    conversation = {
      id: `conv-${listingId}`,
      listingId,
      name: listing.owner || "发布者",
      avatar: (listing.owner || "发").slice(0, 1).toUpperCase(),
      lastMessage: `你好，我想了解「${listing.title}」。`,
      time: "刚刚",
      messages: [`你好，我想了解「${listing.title}」。`]
    };
    state.conversations = [conversation, ...state.conversations];
    saveState();
  }
  location.hash = `#conversation/${conversation.id}`;
}

function listingSubmitButtons(form) {
  return [...document.querySelectorAll("[data-publish-submit]")]
    .filter((button) => button.form === form);
}

function setListingSubmitting(form, loading) {
  form.dataset.submitting = loading ? "true" : "false";
  form.setAttribute("aria-busy", loading ? "true" : "false");
  listingSubmitButtons(form).forEach((button) => {
    if (loading) button.dataset.idleLabel = button.textContent;
    button.disabled = loading;
    button.textContent = loading ? "发布中..." : (button.dataset.idleLabel || button.textContent);
  });
}

function validateListingForm(form) {
  const titleInput = form.elements.title;
  if (titleInput) {
    titleInput.setCustomValidity(titleInput.value.trim() ? "" : "请先填写帖子标题");
  }
  if (form.checkValidity()) return true;
  form.reportValidity();
  const invalidField = form.querySelector(":invalid");
  try {
    invalidField?.focus({ preventScroll: true });
  } catch {
    invalidField?.focus();
  }
  invalidField?.scrollIntoView({ block: "center", inline: "nearest" });
  return false;
}

function showAppNotice(message, tone = "success") {
  return window.SaminestModules.toast.showAppNotice(message, tone);
}

async function submitListing(form, type) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后发布信息", "#publish");
    return;
  }
  if (currentAccountIsBanned()) {
    renderAuthPage("账号已被封禁，不能继续发布。", "#home");
    return;
  }
  if (state.session?.provider === "supabase" && cloudConfigured() && !cloudReady()) {
    showAppNotice(cloudLoadingMessage("发布"), "error");
    return false;
  }
  const editingId = form.dataset.editingId;
  const draftId = form.dataset.draftId;
  const data = Object.fromEntries(new FormData(form).entries());
  const selectedChips = [...form.querySelectorAll(".chip.active")].map((chip) => chip.dataset.chip).filter(Boolean);
  const manualTags = normalizeList(data.tags);
  const structuredTags = type === "rent" ? [data.roomType, data.moveIn] : [data.moveIn];
  const tags = [...new Set([...(manualTags.length ? manualTags : selectedChips), ...structuredTags].filter(Boolean))];
  const detailTags = tags.length ? tags : [typeLabel(type)];
  const existing = editingId ? state.listings.find((item) => item.id === editingId) : null;
  const selectedImages = normalizeImages(data.imageDataUrls);
  const existingImages = existing ? listingImages(existing) : [];
  const images = selectedImages.length ? selectedImages : existingImages;
  const image = images[0] || fallbackImages[type];

  const listing = {
    id: existing?.id || `${type}-${Date.now()}`,
    type,
    title: cleanOr(data.title, defaultTitle(type)),
    price: cleanOr(data.price, defaultPrice(type)),
    area: cleanOr(data.area, "本地地区"),
    time: existing?.time || "刚刚",
    tags,
    detailTags,
    photoCount: images.length,
    image,
    images,
    imageDataUrls: images,
    imageDataUrl: images[0] || "",
    desc: cleanOr(data.desc, "暂无详细描述。"),
    roomType: cleanOr(data.roomType, ""),
    moveIn: cleanOr(data.moveIn, ""),
    contact: cleanOr(data.contact, "站内消息"),
    owner: state.user.name,
    ownerAccount: state.session.userId || state.session.account || "",
    mine: true,
    status: existing?.status || (isAdmin() ? "active" : "pending"),
    createdAt: existing?.createdAt || Date.now()
  };

  if (cloudReady() && currentUserId()) {
    let cloudImages = images;
    let savedListing = null;

    if (existing?.id) {
      cloudImages = await prepareCloudListingImages(existing.id, images);
      if (images.length && !cloudImages.length) {
        window.alert("图片上传失败，帖子没有更新。请确认 Supabase Storage 的 listing-images bucket 和权限已配置。");
        return;
      }
      const payload = uiListingToDb({ ...listing, image: cloudImages[0] || "", images: cloudImages, imageDataUrls: cloudImages });
      const { data: updatedListing, error } = await supabaseClient
        .from("listings")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) {
        window.alert(`发布失败：${authErrorMessage(error)}`);
        return;
      }
      savedListing = updatedListing;
    } else {
      const payload = uiListingToDb({ ...listing, image: "", images: [], imageDataUrls: [] });
      const { data: insertedListing, error } = await supabaseClient.from("listings").insert(payload).select().single();
      if (error) {
        window.alert(`发布失败：${authErrorMessage(error)}`);
        return;
      }
      savedListing = insertedListing;
      cloudImages = await prepareCloudListingImages(savedListing.id, images);
      if (images.length && !cloudImages.length) {
        await supabaseClient.from("listings").delete().eq("id", savedListing.id);
        window.alert("图片上传失败，帖子没有发布。请确认 Supabase Storage 的 listing-images bucket 和权限已配置。");
        return;
      }
      if (cloudImages.length) {
        const imagePayload = uiListingToDb({ ...listing, image: cloudImages[0], images: cloudImages, imageDataUrls: cloudImages });
        const { error: imageUpdateError } = await supabaseClient
          .from("listings")
          .update({ image_url: imagePayload.image_url })
          .eq("id", savedListing.id);
        if (imageUpdateError) {
          await supabaseClient.from("listings").delete().eq("id", savedListing.id);
          window.alert(`图片保存失败：${authErrorMessage(imageUpdateError)}`);
          return;
        }
      }
    }
    const savedImages = await saveListingImagesToSupabase(savedListing.id, cloudImages);
    if (cloudImages.length && !savedImages) {
      window.alert("图片已上传，但图片记录保存失败。请检查 listing_images 表权限。");
      return;
    }
    if (draftId) {
      state.drafts = state.drafts.filter((draft) => draft.id !== draftId);
    }
    await loadListingsFromSupabase();
    showAppNotice(existing ? "修改已保存" : "发布成功，帖子已提交");
    location.hash = postUrl(savedListing.id);
    route();
    return true;
  }

  state.listings = existing
    ? state.listings.map((item) => (item.id === editingId ? listing : item))
    : [listing, ...state.listings];
  if (draftId) {
    state.drafts = state.drafts.filter((draft) => draft.id !== draftId);
  }
  saveState();
  showAppNotice(existing ? "修改已保存" : "发布成功，帖子已提交");
  location.hash = postUrl(listing.id);
  return true;
}

function saveDraft(form, type) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后保存草稿", "#publish");
    return;
  }
  const data = Object.fromEntries(new FormData(form).entries());
  const draftId = form.dataset.draftId;
  const editingId = form.dataset.editingId;
  const existingListing = editingId ? state.listings.find((item) => item.id === editingId) : null;
  const selectedImages = normalizeImages(data.imageDataUrls);
  const existingImages = existingListing ? listingImages(existingListing) : [];
  const images = selectedImages.length ? selectedImages : existingImages;
  const draft = {
    id: draftId || `draft-${Date.now()}`,
    type,
    listingId: editingId || "",
    title: cleanOr(data.title, "未命名草稿"),
    data: {
      ...data,
      id: editingId || "",
      image: images[0] || "",
      images,
      imageDataUrls: images,
      imageDataUrl: images[0] || "",
      tags: data.tags || ""
    }
  };
  delete draft.data.photo;
  state.drafts = [draft, ...state.drafts.filter((item) => item.id !== draft.id)];
  saveState();
  location.hash = "#drafts";
}

function cleanOr(value, fallback) {
  const cleaned = String(value || "").trim();
  return cleaned || fallback;
}

function defaultTitle(type) {
  return {
    rent: "未填写标题的房源",
    wanted: "未填写标题的求租需求",
    used: "未填写标题的二手物品"
  }[type] || "未填写标题的帖子";
}

function defaultPrice(type) {
  return type === "wanted" ? "预算面议" : "价格面议";
}

function editListing(id) {
  const listing = state.listings.find((item) => item.id === id && (isOwner(item) || isAdmin()));
  if (!listing) return;
  renderFormForType(listing.type, listing);
}

function renderAfterListingDelete(listing, origin = "") {
  if (origin === "admin" || location.hash.startsWith("#admin-review")) {
    renderAdminReview(listingStatus(listing));
    return;
  }
  renderMyPosts();
}

async function deleteListing(id, origin = "") {
  const listing = state.listings.find((item) => item.id === id && (isOwner(item) || isAdmin()));
  if (!listing || !window.confirm("确定删除这条发布吗？")) return;
  if (cloudReady() && currentUserId()) {
    const { error } = await supabaseClient.from("listings").delete().eq("id", id);
    if (error) {
      window.alert(`删除失败：${authErrorMessage(error)}`);
      return;
    }
    await loadListingsFromSupabase();
    renderAfterListingDelete(listing, origin);
    return;
  }
  state.listings = state.listings.filter((item) => item.id !== id);
  state.favorites = state.favorites.filter((item) => item !== id);
  state.history = state.history.filter((item) => item !== id);
  state.conversations = state.conversations.filter((item) => item.listingId !== id);
  saveState();
  renderAfterListingDelete(listing, origin);
}

async function expireListing(id) {
  const listing = state.listings.find((item) => item.id === id && (isOwner(item) || isAdmin()));
  if (!listing || !window.confirm("确定下架这条发布吗？下架后首页不会再展示。")) return;
  if (cloudReady() && currentUserId()) {
    const query = supabaseClient
      .from("listings")
      .update({ status: mapStatusToDb("expired"), updated_at: new Date().toISOString() })
      .eq("id", id);
    const { error } = isAdmin() ? await query : await query.eq("user_id", currentUserId());
    if (error) {
      window.alert(`下架失败：${authErrorMessage(error)}`);
      return;
    }
    await loadListingsFromSupabase();
    renderMyPosts();
    return;
  }
  state.listings = state.listings.map((item) => (item.id === id ? { ...item, status: "expired" } : item));
  saveState();
  renderMyPosts();
}

async function updateListingStatus(id, status) {
  await updateListingStatuses([id], status);
}

async function updateListingStatuses(ids, status) {
  if (!isAdmin()) return;
  const selectedIds = [...new Set(ids.filter(Boolean))];
  if (!selectedIds.length) return;
  if (cloudReady()) {
    const { error } = await supabaseClient
      .from("listings")
      .update({ status: mapStatusToDb(status), updated_at: new Date().toISOString() })
      .in("id", selectedIds);
    if (error) {
      window.alert(`审核失败：${authErrorMessage(error)}`);
      return;
    }
    await loadListingsFromSupabase();
    renderAdminReview(status);
    return;
  }
  state.listings = state.listings.map((item) => (selectedIds.includes(item.id) ? { ...item, status } : item));
  saveState();
  renderAdminReview(status);
}

async function banListingOwners(ids) {
  if (!isAdmin()) return;
  const selectedListings = ids.map((id) => state.listings.find((item) => item.id === id)).filter(Boolean);
  const ownerAccounts = [...new Set(selectedListings.map((item) => item.ownerAccount).filter(Boolean))];
  if (!ownerAccounts.length) return;
  const label = ownerAccounts.length === 1 ? selectedListings[0].owner || ownerAccounts[0] : `${ownerAccounts.length} 个用户`;
  if (!window.confirm(`确定封禁 ${label} 吗？封禁后这些用户的帖子会被拒绝。`)) return;
  if (cloudReady()) {
    const bans = ownerAccounts.map((userId) => ({
      user_id: userId,
      banned_by: currentUserId(),
      reason: "管理员封禁"
    }));
    await supabaseClient.from("banned_users").upsert(bans, { onConflict: "user_id" });
    const { error } = await supabaseClient
      .from("listings")
      .update({ status: mapStatusToDb("rejected"), updated_at: new Date().toISOString() })
      .in("user_id", ownerAccounts);
    if (error) {
      window.alert(`封禁失败：${authErrorMessage(error)}`);
      return;
    }
    await loadBannedUsersFromSupabase();
    await loadListingsFromSupabase();
    renderAdminReview("rejected");
    return;
  }
  state.bannedUsers = [...new Set([...ownerAccounts, ...state.bannedUsers])];
  state.listings = state.listings.map((item) => (ownerAccounts.includes(item.ownerAccount) ? { ...item, status: "rejected" } : item));
  saveState();
  renderAdminReview("rejected");
}

async function banListingOwner(id) {
  await banListingOwners([id]);
}

function selectedAdminIds() {
  return [...document.querySelectorAll("[data-admin-select]:checked")].map((input) => input.value).filter(Boolean);
}

async function bulkReviewListings(action) {
  const ids = selectedAdminIds();
  if (!ids.length) {
    window.alert("请先勾选要处理的帖子。");
    return;
  }
  if (action === "ban") {
    await banListingOwners(ids);
    return;
  }
  const label = action === "active" ? "通过" : "拒绝";
  if (!window.confirm(`确定批量${label}已选择的 ${ids.length} 条帖子吗？`)) return;
  await updateListingStatuses(ids, action);
}

async function reportListing(id) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后举报帖子", postUrl(id));
    return;
  }
  const listing = findListing(id);
  if (!listing || isOwner(listing) || isAdmin()) return;
  const reason = window.prompt(`请填写举报原因：${listing.title}`, "");
  if (!reason || !reason.trim()) return;
  if (cloudReady() && currentUserId()) {
    const { error } = await supabaseClient.from("reports").insert({
      listing_id: id,
      reporter_id: currentUserId(),
      reason: reason.trim().slice(0, 500)
    });
    if (error) {
      window.alert(`举报失败：${authErrorMessage(error)}`);
      return;
    }
    window.alert("已收到举报，管理员会在后台查看。");
    return;
  }
  const alreadyReported = state.reports.some((report) => report.listingId === id && report.account === state.session.account);
  if (!alreadyReported) {
    state.reports = [{
      id: `report-${Date.now()}`,
      listingId: id,
      account: state.session.account,
      reason: reason.trim().slice(0, 500),
      time: "刚刚",
      createdAt: Date.now()
    }, ...state.reports];
    saveState();
  }
  window.alert(alreadyReported ? "你已经举报过这条帖子。" : "已收到举报，管理员会在后台查看。");
}

function reportCount(id) {
  return state.reports.filter((report) => report.listingId === id).length;
}

async function submitFeedback(form) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后提交意见反馈", "#feedback");
    return;
  }
  const message = String(new FormData(form).get("message") || "").trim();
  if (!message) return;
  const feedback = {
    id: `feedback-${Date.now()}`,
    account: state.session.userId || state.session.account || "",
    email: state.session.email || state.session.account || "",
    message,
    status: "new",
    time: "刚刚",
    createdAt: Date.now()
  };
  if (cloudReady() && currentUserId()) {
    const { error } = await supabaseClient.from("feedback").insert({
      user_id: currentUserId(),
      email: feedback.email,
      message,
      status: "new"
    });
    if (error) {
      window.alert(`提交失败：${authErrorMessage(error)}`);
      return;
    }
  } else {
    state.feedback = [feedback, ...(state.feedback || [])];
    saveState();
  }
  window.alert("反馈已提交，管理员会在后台查看。");
  location.hash = "#me";
  route();
}

function editDraft(id) {
  const draft = state.drafts.find((item) => item.id === id);
  if (!draft) return;
  renderFormForType(draft.type, draft);
}

function deleteDraft(id) {
  if (!window.confirm("确定删除这个草稿吗？")) return;
  state.drafts = state.drafts.filter((draft) => draft.id !== id);
  saveState();
  renderDrafts();
}

function renderFormForType(type, source = {}) {
  if (type === "rent") return renderRentForm(source);
  if (type === "wanted") return renderWantedForm(source);
  return renderUsedForm(source);
}

function normalizeList(value = "") {
  return value
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function sendMessage(form, conversationId) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后发送消息", "#messages");
    return;
  }
  const input = form.elements.message;
  const text = input.value.trim();
  if (!text) return;
  if (cloudReady() && currentUserId()) {
    const { error } = await supabaseClient.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId(),
      content: text
    });
    if (error) {
      window.alert(`发送失败：${authErrorMessage(error)}`);
      return;
    }
    await supabaseClient
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    input.value = "";
    await loadConversationsFromSupabase();
    renderConversation(conversationId);
    return;
  }
  const conversation = state.conversations.find((item) => item.id === conversationId);
  conversation.messages.push({
    senderId: currentUserId() || state.session?.account || "me",
    content: text,
    createdAt: new Date().toISOString()
  });
  conversation.lastMessage = text;
  conversation.time = "刚刚";
  saveState();
  renderConversation(conversationId);
}

async function saveProfileSettings(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const name = String(data.name || "").trim();
  const subtitle = String(data.subtitle || "").trim() || "Saminest";
  if (!name) {
    window.alert("请填写用户昵称。");
    return;
  }

  if (cloudReady() && currentUserId()) {
    const { error: authError } = await supabaseClient.auth.updateUser({
      data: { display_name: name, name, avatar_url: state.user.avatarUrl || "" }
    });
    if (authError) {
      window.alert(`资料保存失败：${authErrorMessage(authError)}`);
      return;
    }
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({ display_name: name })
      .eq("id", currentUserId());
    if (profileError) {
      window.alert(`昵称保存失败：${authErrorMessage(profileError)}`);
      return;
    }
  }

  const accountKey = normalizeAuthEmail(state.session?.email || state.session?.account || "");
  if (accountKey && state.accounts?.[accountKey]) {
    state.accounts[accountKey] = { ...state.accounts[accountKey], name, subtitle };
  }
  state.user = {
    ...state.user,
    name,
    subtitle,
    avatar: state.user.avatarUrl ? state.user.avatar : name.slice(0, 1).toUpperCase()
  };
  syncCurrentUserListingsProfile({ name, avatarUrl: state.user.avatarUrl || "" });
  saveState();
  window.alert("账号资料已保存。");
  renderSettings();
}

async function updateProfileAvatar(input) {
  const file = input.files?.[0];
  if (!file) return;
  if (!String(file.type || "").startsWith("image/")) {
    window.alert("请选择图片文件作为头像。");
    return;
  }
  try {
    const avatarSource = await readFileAsDataUrl(file);
    const avatarUrl = await resizeImageDataUrl(avatarSource, 240, 0.78);
    if (cloudReady() && currentUserId()) {
      const { error: authError } = await supabaseClient.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });
      if (authError) {
        window.alert(`头像保存失败：${authErrorMessage(authError)}`);
        return;
      }
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", currentUserId());
      if (profileError) {
        window.alert("头像已更新到当前账号，但资料表还缺少 avatar_url 字段。请先运行 supabase-profile-avatar-url.sql 后再保存头像。");
        return;
      }
    }
    state.user = {
      ...state.user,
      avatarUrl,
      avatar: String(state.user.name || "华").slice(0, 1).toUpperCase()
    };
    syncCurrentUserListingsProfile({ avatarUrl });
    saveState();
    if ((location.hash || "").startsWith("#settings-profile")) renderProfileSettings();
    else renderProfile();
  } catch (error) {
    console.warn("Failed to update avatar", error);
    window.alert("头像读取失败，请换一张图片再试。");
  }
}

function escapeHtml(value) {
  return window.SaminestModules.dom.escapeHtml(value);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

function resizeImageDataUrl(dataUrl, maxSize = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      if (scale >= 1 && dataUrl.length < 900000) {
        resolve(dataUrl);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function photoFileToDataUrl(file) {
  const dataUrl = await readFileAsDataUrl(file);
  if (!String(file.type || "").startsWith("image/")) return dataUrl;
  return resizeImageDataUrl(dataUrl);
}

document.addEventListener("input", (event) => {
  if (event.target.closest?.("[data-listing-form]") && event.target.name === "title") {
    event.target.setCustomValidity("");
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const form = event.target.closest?.("[data-listing-form]");
  if (!form || event.target.matches("textarea") || event.target.closest("[data-publish-submit]")) return;
  event.preventDefault();
});

document.addEventListener("submit", async (event) => {
  const authForm = event.target.closest("[data-auth-form]");
  if (authForm) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(authForm).entries());
    const action = authForm.dataset.authAction || "login";
    const returnTo = data.returnTo || "#home";

    if (cloudConfigured() && !cloudReady() && ["login", "register", "forgot", "reset"].includes(action)) {
      showAuthError(authForm, cloudLoadingMessage("登录"));
      return;
    }

    if (action === "login") {
      const email = normalizeAuthEmail(data.email);
      const password = String(data.password || "");
      if (!email) {
        showAuthError(authForm, "请输入邮箱。");
        return;
      }
      if (!password) {
        showAuthError(authForm, "请输入密码。");
        return;
      }
      if (cloudReady()) {
        setAuthLoading(authForm, true, "正在登录...");
        const { data: authData, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        setAuthLoading(authForm, false);
        if (error) {
          showAuthError(authForm, authErrorMessage(error));
          return;
        }
        await completeSupabaseAuth(authData.user, returnTo);
        return;
      }
      const account = localAccountForEmail(email);
      if (!account || account.password !== password) {
        showAuthError(authForm, "邮箱或密码不正确，请重新输入。");
        return;
      }
      completeAuth(email, account, returnTo);
      return;
    }

    if (action === "register") {
      const email = normalizeAuthEmail(data.email);
      const password = String(data.password || "");
      const name = String(data.name || "").trim();
      if (!email) {
        showAuthError(authForm, "请输入邮箱。");
        return;
      }
      if (password.length < 6) {
        showAuthError(authForm, "密码至少需要 6 位。");
        return;
      }
      if (password !== String(data.confirmPassword || "")) {
        showAuthError(authForm, "两次输入的密码不一致。");
        return;
      }
      if (!data.agreement) {
        showAuthError(authForm, "请先同意用户服务协议和隐私条款。");
        return;
      }
      if (cloudReady()) {
        setAuthLoading(authForm, true, "正在创建...");
        const { data: authData, error } = await supabaseClient.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name || email.split("@")[0] },
            emailRedirectTo: emailRedirectUrl()
          }
        });
        setAuthLoading(authForm, false);
        if (error) {
          showAuthError(authForm, authErrorMessage(error));
          return;
        }
        if (authData.session?.user && isSupabaseEmailVerified(authData.session.user)) {
          await completeSupabaseAuth(authData.session?.user || authData.user, returnTo, name);
          return;
        }
        renderAuthNotice(
          "请验证邮箱",
            "请点击系统发送的确认链接后再回来登录。发件邮箱由 Supabase SMTP 设置控制。",
          returnTo
        );
        return;
      }
      if (localAccountForEmail(email)) {
        showAuthError(authForm, "这个邮箱已经注册，请直接登录。");
        return;
      }
      const savedAccount = saveLocalAccount(email, {
        name: name || email.split("@")[0],
        password,
        role: email.includes("admin") ? "admin" : "user"
      });
      delete state.pendingRegister;
      delete state.pendingResetEmail;
      saveState();
      completeAuth(email, savedAccount, returnTo);
      return;
    }

    if (action === "register-code") {
      renderAuthPage("创建账号", returnTo, "register");
      return;
    }

    if (action === "forgot") {
      const email = normalizeAuthEmail(data.email);
      if (!email) {
        showAuthError(authForm, "请输入注册邮箱。");
        return;
      }
      if (cloudReady()) {
        setAuthLoading(authForm, true, "正在发送...");
        const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirectUrl("reset")
        });
        setAuthLoading(authForm, false);
        if (error) {
          showAuthError(authForm, authErrorMessage(error));
          return;
        }
        renderAuthNotice(
          "请验证邮箱",
          "我们已发送密码重置邮件。请打开邮箱里的链接，验证完成后会进入更改密码页面。",
          returnTo,
          "返回登录",
          "login"
        );
        return;
      }
      if (!localAccountForEmail(email)) {
        showAuthError(authForm, "这个邮箱还没有注册，请先创建账号。");
        return;
      }
      state.pendingResetEmail = email;
      state.pendingResetReturnTo = returnTo;
      saveState();
      renderAuthPage("设置新密码", returnTo, "reset");
      return;
    }

    if (action === "reset") {
      const password = String(data.password || "");
      const email = state.pendingResetEmail;
      if (password.length < 6) {
        showAuthError(authForm, "新密码至少需要 6 位。");
        return;
      }
      if (password !== String(data.confirmPassword || "")) {
        showAuthError(authForm, "两次输入的新密码不一致。");
        return;
      }
      if (cloudReady()) {
        setAuthLoading(authForm, true, "正在修改...");
       const hasRecoverySession = await ensureRecoverySession();

if (!hasRecoverySession) {
  setAuthLoading(authForm, false);

  showAuthError(
    authForm,
    "重置链接无效或已经过期，请重新发送一封重置邮件，并使用 Safari 打开最新链接。"
  );

  return;
}
        const { error } = await supabaseClient.auth.updateUser({ password });
        setAuthLoading(authForm, false);
        if (error) {
          showAuthError(authForm, authErrorMessage(error));
          return;
        }
        await supabaseClient.auth.signOut();
        state.session = { loggedIn: false };
        saveState();
        renderAuthPage("修改成功", returnTo, "success");
        return;
      }
      if (isPasswordRecoveryHash()) {
        showAuthError(authForm, "重置链接已打开，但云端登录配置没有加载成功。请刷新页面后再试。");
        return;
      }
      const account = localAccountForEmail(email);
      if (!email || !account) {
        showAuthError(authForm, "请先输入注册邮箱，再设置新密码。");
        return;
      }
      saveLocalAccount(email, { ...account, password });
      delete state.pendingResetEmail;
      delete state.pendingResetReturnTo;
      state.session = { loggedIn: false };
      saveState();
      renderAuthPage("修改成功", returnTo, "success");
      return;
    }
  }

  const searchForm = event.target.closest("[data-search-form]");
  if (searchForm) {
    event.preventDefault();
    const formData = new FormData(searchForm);
    const query = formData.get("q") || "";
    const type = formData.get("type") || "all";
    renderCategory(String(type), String(query), currentRentFilters());
    return;
  }

  const profileForm = event.target.closest("[data-profile-form]");
  if (profileForm) {
    event.preventDefault();
    await saveProfileSettings(profileForm);
    return;
  }

  const listingForm = event.target.closest("[data-listing-form]");
  if (listingForm) {
    event.preventDefault();
    if (listingForm.dataset.submitting === "true" || !validateListingForm(listingForm)) return;
    setListingSubmitting(listingForm, true);
    try {
      await submitListing(listingForm, listingForm.dataset.listingForm);
    } catch (error) {
      console.error("Failed to publish listing", error);
      showAppNotice(`发布失败：${authErrorMessage(error)}`, "error");
    } finally {
      if (listingForm.isConnected) setListingSubmitting(listingForm, false);
    }
    return;
  }

  const feedbackForm = event.target.closest("[data-feedback-form]");
  if (feedbackForm) {
    event.preventDefault();
    await submitFeedback(feedbackForm);
    return;
  }

  const messageForm = event.target.closest("[data-message-form]");
  if (messageForm) {
    event.preventDefault();
    await sendMessage(messageForm, messageForm.dataset.messageForm);
  }
});

document.addEventListener("click", async (event) => {
  const removePhotoButton = event.target.closest("[data-remove-photo]");
  if (removePhotoButton) {
    event.preventDefault();
    event.stopPropagation();
    const form = removePhotoButton.closest("form");
    const dataInput = form?.querySelector("[data-photo-data]");
    const firstInput = form?.querySelector("[data-photo-first]");
    const previewGrid = form?.querySelector("[data-photo-preview-grid]");
    const placeholder = form?.querySelector("[data-photo-placeholder]");
    const tile = form?.querySelector(".upload-tile");
    if (!dataInput || !firstInput || !previewGrid || !placeholder || !tile) return;

    const images = normalizeImages(dataInput.value);
    const index = Number(removePhotoButton.dataset.removePhoto);
    if (!Number.isInteger(index) || index < 0 || index >= images.length) return;
    images.splice(index, 1);
    dataInput.value = JSON.stringify(images);
    firstInput.value = images[0] || "";
    previewGrid.innerHTML = imagePreviewTemplate(images);
    placeholder.textContent = images.length ? `已选 ${images.length} 张` : "+ 选择照片";
    tile.classList.toggle("has-preview", images.length > 0);
    return;
  }

  const authScreenButton = event.target.closest("[data-auth-screen]");
  if (authScreenButton) {
    const form = authScreenButton.closest("form");
    const returnTo = form?.elements?.returnTo?.value || "#home";
    renderAuthPage("欢迎回来", returnTo, authScreenButton.dataset.authScreen);
    return;
  }

  const togglePassword = event.target.closest("[data-toggle-password]");
  if (togglePassword) {
    const input = togglePassword.parentElement.querySelector("input");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    togglePassword.textContent = show ? "隐藏" : "显示";
    return;
  }

  const authMode = event.target.closest("[data-auth-mode]");
  if (authMode) {
    return;
  }

  const backButton = event.target.closest("[data-back]");
  if (backButton) {
    history.length > 1 ? history.back() : (location.hash = "#home");
    return;
  }

  const galleryAction = event.target.closest("[data-gallery-action]");
  if (galleryAction) {
    const gallery = galleryAction.closest("[data-detail-gallery]");
    moveDetailGallery(gallery, galleryAction.dataset.galleryAction === "next" ? 1 : -1);
    return;
  }

  const galleryDot = event.target.closest("[data-gallery-dot]");
  if (galleryDot) {
    updateDetailGallery(galleryDot.closest("[data-detail-gallery]"), Number(galleryDot.dataset.galleryDot));
    return;
  }

  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    await toggleFavorite(favorite.dataset.favorite);
    return;
  }

  const openListing = event.target.closest("[data-open-listing]");
  if (openListing) {
    location.hash = postUrl(openListing.dataset.openListing);
    return;
  }

  const contact = event.target.closest("[data-contact]");
  if (contact) {
    await createConversation(contact.dataset.contact);
    return;
  }

  const draft = event.target.closest("[data-save-draft]");
  if (draft) {
    const form = draft.closest("form");
    saveDraft(form, draft.dataset.saveDraft);
    return;
  }

  const editListingButton = event.target.closest("[data-edit-listing]");
  if (editListingButton) {
    editListing(editListingButton.dataset.editListing);
    return;
  }

  const deleteListingButton = event.target.closest("[data-delete-listing]");
  if (deleteListingButton) {
    await deleteListing(deleteListingButton.dataset.deleteListing, deleteListingButton.dataset.deleteOrigin);
    return;
  }

  const expireListingButton = event.target.closest("[data-expire-listing]");
  if (expireListingButton) {
    await expireListing(expireListingButton.dataset.expireListing);
    return;
  }

  const editDraftButton = event.target.closest("[data-edit-draft]");
  if (editDraftButton) {
    editDraft(editDraftButton.dataset.editDraft);
    return;
  }

  const deleteDraftButton = event.target.closest("[data-delete-draft]");
  if (deleteDraftButton) {
    deleteDraft(deleteDraftButton.dataset.deleteDraft);
    return;
  }

  const reviewButton = event.target.closest("[data-review-status]");
  if (reviewButton) {
    const [id, status] = reviewButton.dataset.reviewStatus.split(":");
    await updateListingStatus(id, status);
    return;
  }

  const bulkReviewButton = event.target.closest("[data-bulk-review]");
  if (bulkReviewButton) {
    await bulkReviewListings(bulkReviewButton.dataset.bulkReview);
    return;
  }

  const selectAll = event.target.closest("[data-admin-select-all]");
  if (selectAll) {
    document.querySelectorAll("[data-admin-select]").forEach((input) => {
      input.checked = selectAll.checked;
    });
    return;
  }

  const banButton = event.target.closest("[data-ban-user]");
  if (banButton) {
    await banListingOwner(banButton.dataset.banUser);
    return;
  }

  const reportButton = event.target.closest("[data-report-listing]");
  if (reportButton) {
    await reportListing(reportButton.dataset.reportListing);
    return;
  }

  const reset = event.target.closest("[data-reset]");
  if (reset) {
    localStorage.removeItem(STORAGE_KEY);
    state = loadState();
    ensureStateDefaults();
    location.hash = "#home";
    route();
    return;
  }

  const logout = event.target.closest("[data-logout]");
  if (logout) {
    if (hasSupabaseAuth()) {
      await supabaseClient.auth.signOut();
    }
    state.session = { loggedIn: false };
    saveState();
    location.hash = "#home";
    route();
    return;
  }

  const chip = event.target.closest("[data-chip]");
  if (chip) {
    chip.classList.toggle("active");
  }
});

document.addEventListener("change", async (event) => {
  const rentFilter = event.target.closest("[data-rent-filters] select");
  if (rentFilter) {
    const searchForm = document.querySelector("[data-search-form]");
    const formData = searchForm ? new FormData(searchForm) : new FormData();
    renderCategory("rent", String(formData.get("q") || ""), currentRentFilters());
    return;
  }

  const avatarInput = event.target.closest("[data-avatar-input]");
  if (avatarInput) {
    await updateProfileAvatar(avatarInput);
    return;
  }

  const input = event.target.closest("[data-photo-input]");
  if (!input || !input.files?.[0]) return;

  const files = [...input.files];
  const tile = input.closest(".upload-tile");
  const form = input.closest("form");
  const dataInput = form.querySelector("[data-photo-data]");
  const firstInput = form.querySelector("[data-photo-first]");
  const previewGrid = form.querySelector("[data-photo-preview-grid]");
  const placeholder = form.querySelector("[data-photo-placeholder]");
  placeholder.textContent = "处理中...";
  try {
    const images = await Promise.all(files.map(photoFileToDataUrl));
    dataInput.value = JSON.stringify(images);
    firstInput.value = images[0] || "";
    previewGrid.innerHTML = imagePreviewTemplate(images);
    placeholder.textContent = images.length ? `已选 ${images.length} 张` : "+ 选择照片";
    tile.classList.add("has-preview");
  } catch (error) {
    console.warn("Failed to read photo", error);
    placeholder.textContent = "选择照片";
    window.alert("图片读取失败，请换一张照片再试。");
  }
});

document.addEventListener("touchstart", (event) => {
  const gallery = event.target.closest("[data-detail-gallery]");
  if (!gallery || event.touches.length !== 1) return;
  gallery.dataset.touchStartX = String(event.touches[0].clientX);
}, { passive: true });

document.addEventListener("touchend", (event) => {
  const gallery = event.target.closest("[data-detail-gallery]");
  if (!gallery || !gallery.dataset.touchStartX) return;
  const startX = Number(gallery.dataset.touchStartX);
  delete gallery.dataset.touchStartX;
  const endX = event.changedTouches[0]?.clientX || startX;
  const distance = endX - startX;
  if (Math.abs(distance) < 42) return;
  moveDetailGallery(gallery, distance < 0 ? 1 : -1);
}, { passive: true });

let supabaseAuthListenerBound = false;

function bindSupabaseAuthListener() {
  if (!hasSupabaseAuth() || supabaseAuthListenerBound) return;
  supabaseAuthListenerBound = true;
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      renderAuthPage("设置新密码", "#home", "reset");
      return;
    }
    if (isPasswordRecoveryHash()) {
      renderAuthPage("设置新密码", "#home", "reset");
      return;
    }
    if (event === "SIGNED_IN" && session?.user && !isLoggedIn()) {
      await completeSupabaseAuth(session.user, "#home");
    }
    if (event === "SIGNED_OUT" && state.session?.provider === "supabase") {
      state.session = { loggedIn: false };
      saveState();
      if (!location.hash.startsWith("#auth")) route();
    }
  });
}

bindSupabaseAuthListener();

function installMobileViewportSizing() {
  const root = document.documentElement;
  const viewport = window.visualViewport;
  let stableHeight = Math.round(viewport?.height || window.innerHeight || 0);
  let authScrollBeforeKeyboard = 0;
  let keyboardWasOpen = false;
  let focusTimer = 0;

  const isEditable = (element) => Boolean(element?.matches?.("input, textarea, select, [contenteditable='true']"));
  const updateViewport = () => {
    const activeElement = document.activeElement;
    const editing = isEditable(activeElement);
    const currentHeight = Math.round(viewport?.height || window.innerHeight || stableHeight);

    if (!editing || currentHeight >= stableHeight * 0.82) {
      stableHeight = Math.max(currentHeight, stableHeight || currentHeight);
    }

    const keyboardInset = editing ? Math.max(0, stableHeight - currentHeight) : 0;
    const keyboardOpen = keyboardInset > 120;
    root.style.setProperty("--app-height", `${stableHeight}px`);
    root.style.setProperty("--visual-viewport-height", `${currentHeight}px`);
    root.style.setProperty("--keyboard-inset", `${keyboardInset}px`);
    document.body.classList.toggle("keyboard-open", keyboardOpen);

    if (keyboardOpen && !keyboardWasOpen && document.body.dataset.page === "auth") {
      authScrollBeforeKeyboard = app.scrollTop;
    }
    if (keyboardOpen && editing) {
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        activeElement.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      }, 40);
    }
    if (!keyboardOpen && keyboardWasOpen && document.body.dataset.page === "auth") {
      app.scrollTo({ top: authScrollBeforeKeyboard, left: 0, behavior: "auto" });
    }
    keyboardWasOpen = keyboardOpen;
  };

  updateViewport();
  viewport?.addEventListener("resize", updateViewport);
  viewport?.addEventListener("scroll", updateViewport);
  window.addEventListener("resize", updateViewport);
  document.addEventListener("focusin", () => window.setTimeout(updateViewport, 60));
  document.addEventListener("focusout", () => window.setTimeout(updateViewport, 180));
  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => {
      stableHeight = Math.round(viewport?.height || window.innerHeight || stableHeight);
      updateViewport();
    }, 260);
  });
}

function installMobileViewportGuard() {
  const gesture = {
    startX: 0,
    startY: 0,
    verticalScroller: app,
    horizontalScroller: null
  };

  const isMobileViewport = () => window.matchMedia("(max-width: 759px)").matches;
  const isScrollable = (element, axis) => {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    const overflow = axis === "x" ? style.overflowX : style.overflowY;
    const hasOverflow = axis === "x"
      ? element.scrollWidth > element.clientWidth + 1
      : element.scrollHeight > element.clientHeight + 1;
    return /(auto|scroll)/.test(overflow) && hasOverflow;
  };
  const findScroller = (target, axis) => {
    let element = target instanceof Element ? target : null;
    while (element && element !== document.body) {
      if (isScrollable(element, axis)) return element;
      element = element.parentElement;
    }
    return axis === "y" ? app : null;
  };
  const canScrollVertically = (element, fingerDeltaY) => {
    if (!isScrollable(element, "y")) return false;
    if (fingerDeltaY > 0) return element.scrollTop > 0;
    if (fingerDeltaY < 0) return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
    return true;
  };

  document.addEventListener("touchstart", (event) => {
    if (!isMobileViewport() || event.touches.length !== 1) return;
    const touch = event.touches[0];
    gesture.startX = touch.clientX;
    gesture.startY = touch.clientY;
    gesture.verticalScroller = findScroller(event.target, "y");
    gesture.horizontalScroller = findScroller(event.target, "x");
  }, { passive: true });

  document.addEventListener("touchmove", (event) => {
    if (!isMobileViewport() || event.touches.length !== 1 || !event.cancelable) return;
    const touch = event.touches[0];
    const deltaX = touch.clientX - gesture.startX;
    const deltaY = touch.clientY - gesture.startY;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (!gesture.horizontalScroller) event.preventDefault();
      return;
    }

    if (Math.abs(deltaY) < 2) return;
    const innerCanScroll = canScrollVertically(gesture.verticalScroller, deltaY);
    const appCanScroll = gesture.verticalScroller !== app && canScrollVertically(app, deltaY);
    if (!innerCanScroll && !appCanScroll) event.preventDefault();
  }, { passive: false });
}

let cloudHydrationPromise = null;

function hydrateCloudData() {
  if (!cloudReady()) return Promise.resolve(false);
  if (cloudHydrationPromise) return cloudHydrationPromise;

  cloudHydrationPromise = (async () => {
    try {
      await syncSupabaseSession();

      if (!isPasswordRecoveryHash()) {
        await refreshCloudData();
      }

      return true;
    } catch (error) {
      console.warn(
        "Cloud startup failed; continuing with cached data",
        error
      );

      return false;
    } finally {
      route();
      cloudHydrationPromise = null;
    }
  })();

  return cloudHydrationPromise;
}

window.addEventListener("saminest:supabase-ready", () => {
  supabaseLoadFailed = false;
  initializeSupabaseClient();
  bindSupabaseAuthListener();
  void hydrateCloudData();
});

window.addEventListener("saminest:supabase-error", () => {
  supabaseLoadFailed = true;
  const authForm = document.querySelector("[data-auth-form]");
  if (authForm) showAuthError(authForm, cloudLoadingMessage("登录"));
});

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", () => {
  installMobileViewportSizing();
  installMobileViewportGuard();
  route();
  void hydrateCloudData();
});
/* =========================================
   iOS Safari 登录页键盘稳定处理
========================================= */

(function setupStableMobileKeyboard() {
  const viewport = window.visualViewport;

  function isFormField(element) {
    return (
      element instanceof HTMLElement &&
      element.matches("input, textarea, select")
    );
  }

  function updateVisibleViewport() {
    const visibleHeight = viewport
      ? Math.round(viewport.height)
      : window.innerHeight;

    document.documentElement.style.setProperty(
      "--visible-height",
      `${visibleHeight}px`
    );

    const keyboardHeight = window.innerHeight - visibleHeight;
    const keyboardOpen = keyboardHeight > 120;

    document.body.classList.toggle("keyboard-open", keyboardOpen);

    /*
     * 防止 Safari 在键盘关闭后留下错误的横向位置。
     * 不强制修改纵向位置，避免影响用户输入。
     */
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }

  function keepFocusedFieldVisible(event) {
    if (!isFormField(event.target)) return;

    window.setTimeout(() => {
      event.target.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth"
      });
    }, 300);
  }

  function restoreAfterKeyboardClose(event) {
    if (!isFormField(event.target)) return;

    window.setTimeout(() => {
      updateVisibleViewport();

      document.documentElement.scrollLeft = 0;
      document.body.scrollLeft = 0;
    }, 350);
  }

  updateVisibleViewport();

  window.addEventListener("resize", updateVisibleViewport, {
    passive: true
  });

  window.addEventListener("orientationchange", () => {
    window.setTimeout(updateVisibleViewport, 300);
  });

  document.addEventListener("focusin", keepFocusedFieldVisible);
  document.addEventListener("focusout", restoreAfterKeyboardClose);

  if (viewport) {
    viewport.addEventListener("resize", updateVisibleViewport, {
      passive: true
    });

    viewport.addEventListener("scroll", updateVisibleViewport, {
      passive: true
    });
  }
})();




