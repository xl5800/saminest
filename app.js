const STORAGE_KEY = "saminestLocalV1";
const ADMIN_EMAIL = "xlw0980@gmail.com";

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
const supabaseClient =
  window.supabase && supabaseConfig.url && supabaseConfig.anonKey
    ? window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey)
    : null;
let state = loadState();
ensureStateDefaults();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cloudReady() {
  return Boolean(supabaseClient?.auth);
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
  return `${Math.floor(hours / 24)}天前`;
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
  const explicitImages = [...normalizeImages(item.images), ...normalizeImages(item.imageDataUrls)];
  if (explicitImages.length) return [...new Set(explicitImages)];
  const image = item.image || "";
  const isFallback = Object.values(fallbackImages).includes(image);
  return image && (!isFallback || item.photoCount) ? [image] : [];
}

function isDataUrl(value) {
  return String(value || "").startsWith("data:");
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

function imagePreviewTemplate(images = []) {
  return images.map((src, index) => `<img src="${escapeHtml(src)}" alt="已选图片 ${index + 1}" />`).join("");
}

function dbListingToUi(row, profileMap = {}, imageMap = {}) {
  const type = mapTypeFromDb(row);
  const tags = String(row.nearby || row.category || "")
    .split(/[,，、]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const ownerProfile = profileMap[row.user_id] || {};
  const ownerName = ownerProfile.display_name || ownerProfile.email || "发布者";
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
    category: listing.type === "wanted" ? "wanted" : listing.tags?.[0] || typeLabel(listing.type),
    move_in: normalizeDateValue(listing.moveIn),
    nearby: Array.isArray(listing.tags) ? listing.tags.join(", ") : "",
    image_url: images.length > 1 ? JSON.stringify(images) : images[0] || listing.image || null,
    contact: listing.contact || "站内消息"
  };
}

async function fetchProfilesMap(userIds = []) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (!cloudReady() || !ids.length) return {};
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("id,email,display_name,role")
    .in("id", ids);
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

function route() {
  if (isPasswordRecoveryHash()) {
    return renderAuthPage("设置新密码", "#home", "reset");
  }

  const hash = location.hash.replace("#", "") || "home";
  const [page, id] = hash.split("/");
  document.body.dataset.page = page;

  if (page === "auth") {
    return renderAuthPage("欢迎回来", "#home", id || "login");
  }

  if (requiresAuth(page) && !isLoggedIn()) {
    return renderAuthPage(authTitle(page), `#${hash}`, "login");
  }
  if ((page === "admin-review" || page === "admin-feedback" || page === "admin-reports") && !isAdmin()) {
    return renderNoAccess();
  }

  if (page === "home") return renderHome();
  if (page === "category") return renderCategory(id || "all");
  if (page === "listing") return renderDetail(id);
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
    <section class="home-screen">
      ${mobileHeader()}

      <form class="home-search" data-search-form>
        <span class="search-symbol">⌕</span>
        <input name="q" placeholder="搜租房、求租、二手物品..." />
      </form>

      <div class="home-chips" aria-label="分类筛选">
        <a class="home-chip active" href="#category/all">全部</a>
        <a class="home-chip" href="#category/rent">租房</a>
        <a class="home-chip" href="#category/wanted">求租</a>
        <a class="home-chip" href="#category/used">二手</a>
      </div>

      <div class="home-feed">
        ${listings.length ? listings.map((item) => listingCard(item, { favorite: true })).join("") : emptyBlock("暂时还没有帖子")}
      </div>

      ${bottomNav("home")}
    </section>
  `;
}

function renderCategory(type, query = "") {
  const lowerQuery = query.trim().toLowerCase();
  const shown = publicListings().filter((item) => {
    const matchesType = type === "all" || item.type === type;
    const text = `${item.title} ${item.area} ${item.price} ${item.desc}`.toLowerCase();
    return matchesType && (!lowerQuery || text.includes(lowerQuery));
  });

  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader(type === "all" ? "全部信息" : categoryName(type))}
      <form class="home-search inner-search" data-search-form>
        <span class="search-symbol">⌕</span>
        <input name="q" value="${escapeHtml(query)}" placeholder="搜索关键词或地区" />
      </form>
      <div class="filters">
        <a class="chip ${type === "all" ? "active" : ""}" href="#category/all">全部</a>
        ${categories.map((c) => `<a class="chip ${type === c.key ? "active" : ""}" href="#category/${c.key}">${c.name}</a>`).join("")}
      </div>
      <div class="listing-list">
        ${shown.length ? shown.map(listingCard).join("") : emptyBlock("没有找到相关帖子")}
      </div>
      ${bottomNav("category")}
    </section>
  `;
}

function renderDetail(id) {
  const item = findListing(id);
  if (!item) return renderUnavailable();
  rememberHistory(item.id);
  const favored = state.favorites.includes(item.id);
  const canReport = !isOwner(item) && !isAdmin();
  const detailImages = listingImages(item);
  const galleryImages = detailImages.length ? detailImages : [item.image];

  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("详情")}
      <div class="detail-layout">
        <div class="detail-gallery">
          ${galleryImages.map((src, index) => `<img class="detail-photo ${index ? "secondary" : ""}" src="${escapeHtml(src)}" alt="${escapeHtml(item.title)} 图片 ${index + 1}" />`).join("")}
          ${galleryImages.length > 1 ? `<span class="detail-gallery-count">共 ${galleryImages.length} 张图片</span>` : ""}
        </div>
        <article class="detail-panel">
          <div class="detail-title-row">
            <h1>${item.title}</h1>
            <button class="favorite-button ${favored ? "active" : ""}" type="button" data-favorite="${item.id}">
              ${favored ? "已收藏" : "♡ 收藏"}
            </button>
          </div>
          <div class="price">${item.price}</div>
          <div class="meta">
            ${(isOwner(item) || isAdmin()) ? `<span class="status-badge ${listingStatus(item)}">${statusLabel(listingStatus(item))}</span>` : ""}
            <span>${item.area}</span>
            <span>${item.time}</span>
            ${item.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
          </div>
          <p class="body-copy">${item.desc}</p>
          <div class="mini-note">建议先站内沟通，确认身份和细节后再交换私人联系方式。</div>
          <div class="detail-actions">
            <a class="secondary-button" href="#category/all">继续浏览</a>
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
  return `
    <section class="page-screen form-page">
      ${pageHeader(config.title)}
      <p class="form-intro">${config.intro}</p>
      <form data-listing-form="${config.kind}" data-editing-id="${values.id || ""}" data-draft-id="${values.draftId || ""}">
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
          <button class="primary-button" type="submit">${config.submit}</button>
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
        <div class="avatar">${state.user.avatar}</div>
        <div>
          <strong>${state.user.name}</strong>
          <span>${state.user.subtitle}</span>
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
      ${bottomNav(title === "我的收藏" ? "me" : "category")}
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

function renderSettings() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("设置")}
      <section class="subpage-card">
        <div class="subpage-list">
          <a href="#settings-profile">账号资料<span>${state.user.name}</span></a>
          <a href="#messages">消息通知<span>已开启</span></a>
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
          <div class="avatar">${escapeHtml(state.user.avatar || "华")}</div>
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

function renderUnavailable() {
  app.innerHTML = `
    <section class="page-screen">
      ${pageHeader("不可查看")}
      <section class="subpage-card">
        <p>这条内容还在审核中、已被拒绝，或你没有权限查看。</p>
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
        <label class="auth-agreement auth-v2-agreement"><input type="checkbox" name="agreement" required /><span>我已阅读并同意<a href="#terms">《用户服务协议》</a>和<a href="#privacy">《隐私条款》</a></span></label>
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
  if (!hasSupabaseAuth() || !isPasswordRecoveryHash()) return false;
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) return true;
  const params = recoveryParams();
  const code = params.get("code");
  if (code && typeof supabaseClient.auth.exchangeCodeForSession === "function") {
    const result = await supabaseClient.auth.exchangeCodeForSession(code);
    if (result.data?.session && !result.error) return true;
  }
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) return false;
  const result = await supabaseClient.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  return Boolean(result.data?.session && !result.error);
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
  completeAuth(email || user.id, {
    name: userName,
    email,
    role: profile?.role || (email === ADMIN_EMAIL ? "admin" : "user"),
    provider: "supabase",
    userId: user.id
  }, returnTo);
  await refreshCloudData();
  route();
}

async function syncSupabaseSession() {
  if (!hasSupabaseAuth()) return;
  if (isPasswordRecoveryHash()) {
    await ensureRecoverySession();
    renderAuthPage("设置新密码", "#home", "reset");
    return;
  }
  const { data } = await supabaseClient.auth.getSession();
  if (data?.session?.user) {
    const currentHash = location.hash || "#home";
    await completeSupabaseAuth(data.session.user, currentHash.startsWith("#auth") ? "#home" : currentHash);
    return;
  }
  if (state.session?.provider === "supabase") {
    state.session = { loggedIn: false };
    saveState();
  }
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
    avatar: (userName || account || "D").slice(0, 1).toUpperCase()
  };
  saveState();
  location.hash = returnTo || "#home";
  route();
}

function mobileHeader() {
  return `
    <header class="home-header">
      <a class="home-logo" href="#home"><b>Saminest</b></a>
    </header>
  `;
}

function pageHeader(title) {
  return `
    <header class="page-header">
      <button class="plain-back" type="button" data-back>‹</button>
      <h1>${title}</h1>
      <a href="#publish">发布</a>
    </header>
  `;
}

function bottomNav(active) {
  const messageCount = unreadMessageCount();
  return `
    <nav class="home-bottom-nav" aria-label="底部导航">
      <a class="${active === "home" ? "active" : ""}" href="#home"><span>⌂</span>首页</a>
      <a class="${active === "category" ? "active" : ""}" href="#category/all"><span>▦</span>分类</a>
      <a class="home-publish ${active === "publish" ? "active" : ""}" href="#publish"><span>＋</span>发布</a>
      <a class="${active === "messages" ? "active" : ""}" href="#messages"><span>信</span>消息${messageCount ? `<em>${messageCount}</em>` : ""}</a>
      <a class="${active === "me" ? "active" : ""}" href="#me"><span>○</span>我的</a>
    </nav>
  `;
}

function listingCard(item, options = {}) {
  const favored = state.favorites.includes(item.id);
  const tags = (item.detailTags?.length ? item.detailTags : item.tags || []).slice(0, 3);
  const status = listingStatus(item);
  const showStatus = Boolean(options.status);
  const images = listingImages(item);
  const imageCount = images.length || item.photoCount || 0;
  const coverImage = images[0] || item.image || fallbackImages[item.type] || fallbackImages.used;
  return `
    <article class="listing-card ${options.compact ? "compact" : ""}" data-open-listing="${item.id}">
      <span class="listing-media">
        <img src="${escapeHtml(coverImage)}" alt="${escapeHtml(item.title)}" />
        <span class="photo-count">${imageCount ? `图 ${imageCount}` : typeLabel(item.type)}</span>
      </span>
      <span class="listing-content">
        <span class="listing-row">
          <span class="listing-title">${escapeHtml(item.title)}</span>
          <span class="listing-time">${item.time}</span>
        </span>
        <span class="price">${item.price}</span>
        <span class="listing-area">位置 ${escapeHtml(item.area)}</span>
        <span class="meta">
          ${showStatus ? `<span class="status-badge ${status}">${statusLabel(status)}</span>` : ""}
          ${tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
        </span>
      </span>
      ${options.favorite ? `
        <button class="heart ${favored ? "active" : ""}" type="button" data-favorite="${item.id}" aria-label="${favored ? "取消收藏" : "收藏"}">
          ${favored ? "♥" : "♡"}
        </button>
      ` : ""}
    </article>
  `;
}

function manageListingCard(item) {
  return `
    <article class="manage-card">
      ${listingCard(item, { compact: true, status: true })}
      <div class="manage-actions">
        <a class="secondary-button" href="#listing/${item.id}">查看</a>
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
        <a class="secondary-button" href="#listing/${item.id}">查看详情</a>
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
        ${item ? `<a class="secondary-button" href="#listing/${item.id}">查看帖子</a>` : ""}
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
    renderAuthPage("登录后收藏帖子", `#listing/${id}`);
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
  if ((location.hash || "").startsWith("#listing/")) {
    renderDetail(id);
    return;
  }
  route();
}

async function createConversation(listingId) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后联系发布者", `#listing/${listingId}`);
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

async function submitListing(form, type) {
  if (!isLoggedIn()) {
    renderAuthPage("登录后发布信息", "#publish");
    return;
  }
  if (currentAccountIsBanned()) {
    renderAuthPage("账号已被封禁，不能继续发布。", "#home");
    return;
  }
  const editingId = form.dataset.editingId;
  const draftId = form.dataset.draftId;
  const data = Object.fromEntries(new FormData(form).entries());
  const selectedChips = [...form.querySelectorAll(".chip.active")].map((chip) => chip.dataset.chip).filter(Boolean);
  const tags = normalizeList(data.tags).length ? normalizeList(data.tags) : selectedChips;
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
    location.hash = `#listing/${savedListing.id}`;
    route();
    return;
  }

  state.listings = existing
    ? state.listings.map((item) => (item.id === editingId ? listing : item))
    : [listing, ...state.listings];
  if (draftId) {
    state.drafts = state.drafts.filter((draft) => draft.id !== draftId);
  }
  saveState();
  location.hash = `#listing/${listing.id}`;
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
    renderAuthPage("登录后举报帖子", `#listing/${id}`);
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
      data: { display_name: name, name }
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
    avatar: name.slice(0, 1).toUpperCase()
  };
  saveState();
  window.alert("账号资料已保存。");
  renderSettings();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]
  );
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

document.addEventListener("submit", async (event) => {
  const authForm = event.target.closest("[data-auth-form]");
  if (authForm) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(authForm).entries());
    const action = authForm.dataset.authAction || "login";
    const returnTo = data.returnTo || "#home";

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
        if (!hasRecoverySession && !isLoggedIn()) {
          setAuthLoading(authForm, false);
          showAuthError(authForm, "请先打开邮箱里的重置链接，再设置新密码。");
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
    const query = new FormData(searchForm).get("q") || "";
    renderCategory("all", String(query));
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
    await submitListing(listingForm, listingForm.dataset.listingForm);
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

  const favorite = event.target.closest("[data-favorite]");
  if (favorite) {
    await toggleFavorite(favorite.dataset.favorite);
    return;
  }

  const openListing = event.target.closest("[data-open-listing]");
  if (openListing) {
    location.hash = `#listing/${openListing.dataset.openListing}`;
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

if (hasSupabaseAuth()) {
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

window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", async () => {
  await syncSupabaseSession();
  await refreshCloudData();
  route();
});

