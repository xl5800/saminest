const STORAGE_KEY = "dmv-huaren-market-fallback-listings";
const FAVORITES_KEY = "dmv-huaren-market-favorites";
const DRAFTS_KEY = "dmv-huaren-market-drafts";
const HISTORY_KEY = "dmv-huaren-market-history";

const areaCoordinates = {
  Rockville: { lat: 39.083997, lng: -77.152758 },
  Gaithersburg: { lat: 39.14344, lng: -77.20137 },
  Germantown: { lat: 39.173162, lng: -77.27165 },
  Bethesda: { lat: 38.984652, lng: -77.094711 },
  "Silver Spring": { lat: 38.990666, lng: -77.026088 },
  "College Park": { lat: 38.989697, lng: -76.937759 },
  UMD: { lat: 38.986918, lng: -76.942555 },
  Arlington: { lat: 38.88162, lng: -77.090981 },
  Alexandria: { lat: 38.804836, lng: -77.046921 },
  Annandale: { lat: 38.83039, lng: -77.19637 },
  Ashburn: { lat: 39.043757, lng: -77.487442 },
  Chantilly: { lat: 38.894279, lng: -77.431099 },
  Fairfax: { lat: 38.846223, lng: -77.306374 },
  Tysons: { lat: 38.918722, lng: -77.231093 },
  "Falls Church": { lat: 38.882334, lng: -77.171091 },
  Herndon: { lat: 38.969555, lng: -77.386097 },
  Laurel: { lat: 39.099276, lng: -76.848306 },
  Leesburg: { lat: 39.115662, lng: -77.563601 },
  McLean: { lat: 38.933868, lng: -77.17726 },
  Potomac: { lat: 39.018166, lng: -77.208591 },
  Reston: { lat: 38.958631, lng: -77.357003 },
  Vienna: { lat: 38.901222, lng: -77.26526 },
  Woodbridge: { lat: 38.658172, lng: -77.249704 },
  "Washington DC": { lat: 38.907192, lng: -77.036871 },
  "20850": { lat: 39.0891, lng: -77.1835 },
  "20852": { lat: 39.0533, lng: -77.1205 },
  "20742": { lat: 38.9869, lng: -76.9426 },
  "22201": { lat: 38.8847, lng: -77.0947 },
  "22030": { lat: 38.8462, lng: -77.3064 },
};

const areas = [
  "全部地区",
  ...Object.keys(areaCoordinates).filter((key) => !/^\d/.test(key) && key !== "UMD"),
  "其他/自定义",
];

const fallbackImages = {
  rental:
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80",
  secondhand:
    "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1200&q=80",
};

const rentalCategories = ["Studio", "1B1B", "2B2B", "单间", "主卧", "Basement", "整租", "合租", "找室友"];
const secondhandCategories = ["家具", "家电", "电子产品", "车辆", "母婴", "书籍", "生活用品", "搬家清仓", "其他"];

const seedListings = [
  rentalSeed(
    "Rockville 主卧转租，近红线 Twinbrook",
    "Rockville",
    1180,
    "主卧 / 独卫",
    "Twinbrook Metro、H Mart、Rockville Pike",
    "Twinbrook Metro, Rockville, MD",
    39.062402,
    -77.120775,
    "微信 dmv_rent_001",
    "主卧带独立卫生间，步行可到红线地铁和超市。室友安静，适合 NIH、Bethesda 或 DC 通勤。家具齐全，可拎包入住。",
    1,
    "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
    "2026-07-01"
  ),
  rentalSeed(
    "College Park 2B2B 次卧，UMD 步行圈",
    "College Park",
    980,
    "2B2B 次卧",
    "UMD、绿线 Metro、Whole Foods",
    "University of Maryland, College Park, MD",
    38.986918,
    -76.942555,
    "邮箱 housing@dmvlocal.test",
    "适合 UMD 学生或访问学者。小区安全，有健身房和停车位。租期可到明年 7 月，家具可商量。",
    2,
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
    "2026-08-15"
  ),
  rentalSeed(
    "Tysons 1B1B 整租，适合上班族",
    "Tysons",
    2050,
    "1B1B 整租",
    "Tysons Corner、Silver Line、Capital One",
    "Tysons Corner Center, Tysons, VA",
    38.918873,
    -77.220607,
    "电话 571-000-1688",
    "高层公寓，通勤方便，楼下餐厅和商场多。可续租，适合在 Tysons、Reston、Arlington 工作的人。",
    6,
    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
    "2026-07-10"
  ),
  secondhandSeed(
    "搬家出 IKEA Queen 床架和床垫",
    "Fairfax",
    180,
    "家具",
    "Fairfax / GMU",
    "微信 fairfax_move",
    "Queen size 床架和床垫一起出，使用一年多，干净无宠无烟。自取优先，周末可看。",
    0,
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
  ),
  secondhandSeed(
    "Arlington 出书桌、办公椅、显示器",
    "Arlington",
    120,
    "搬家清仓",
    "Rosslyn / Clarendon",
    "短信 202-000-1688",
    "打包优先，适合刚搬家或学生。桌子稳，办公椅可升降，显示器 24 寸。",
    4,
    "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=80"
  ),
];

const els = {
  areaFilter: document.querySelector("#areaFilter"),
  customAreaFilter: document.querySelector("#customAreaFilter"),
  postArea: document.querySelector("[name='area']"),
  searchInput: document.querySelector("#searchInput"),
  maxPriceInput: document.querySelector("#maxPriceInput"),
  locationInput: document.querySelector("#locationInput"),
  radiusFilter: document.querySelector("#radiusFilter"),
  useLocationButton: document.querySelector("#useLocationButton"),
  locationStatus: document.querySelector("#locationStatus"),
  rentalList: document.querySelector("#rentalList"),
  secondhandList: document.querySelector("#secondhandList"),
  postForm: document.querySelector("#postForm"),
  categorySelect: document.querySelector("#categorySelect"),
  imageFileInput: document.querySelector("#imageFileInput"),
  imagePreviewGrid: document.querySelector("#imagePreviewGrid"),
  postPreview: document.querySelector("#postPreview"),
  saveDraftButton: document.querySelector("#saveDraftButton"),
  postTypeDialog: document.querySelector("#postTypeDialog"),
  closePostTypeDialog: document.querySelector("#closePostTypeDialog"),
  loginButton: document.querySelector("#loginButton"),
  loginDialog: document.querySelector("#loginDialog"),
  closeLoginDialog: document.querySelector("#closeLoginDialog"),
  loginForm: document.querySelector("#loginForm"),
  registerButton: document.querySelector("#registerButton"),
  forgotPasswordButton: document.querySelector("#forgotPasswordButton"),
  accountStatus: document.querySelector("#accountStatus"),
  accountList: document.querySelector("#accountList"),
  favoriteList: document.querySelector("#favoriteList"),
  messageList: document.querySelector("#messageList"),
  profileName: document.querySelector("#profileName"),
  myPostList: document.querySelector("#myPostList"),
  draftList: document.querySelector("#draftList"),
  historyList: document.querySelector("#historyList"),
  logoutButton: document.querySelector("#logoutButton"),
  typeSelect: document.querySelector("#typeSelect"),
  adminList: document.querySelector("#adminList"),
  pendingCount: document.querySelector("#pendingCount"),
  detailDialog: document.querySelector("#detailDialog"),
  detailContent: document.querySelector("#detailContent"),
  closeDialog: document.querySelector("#closeDialog"),
  seedButton: document.querySelector("#seedButton"),
  statRental: document.querySelector("#statRental"),
  statSecondhand: document.querySelector("#statSecondhand"),
  statFresh: document.querySelector("#statFresh"),
};

let db = null;
let onlineMode = false;
let currentUser = null;
let currentProfile = null;
let userLocation = null;
let listings = [];
let selectedImageFiles = [];
let favoriteIds = [];
let draftListings = [];
let historyIds = [];
let editingListingId = null;

init();

async function init() {
  setupSupabase();
  renderAreaOptions();
  updatePostTypeFields();
  renderImagePreviews();
  bindEvents();
  updateLocationFromInput();
  await loadCurrentUser();
  await loadListings();
  loadLocalState();
  render();
  navigateTo(getRouteFromHash());
}

function setupSupabase() {
  const config = window.DMV_SUPABASE_CONFIG;
  if (!window.supabase || !config?.url || !config?.anonKey) return;
  db = window.supabase.createClient(config.url, config.anonKey);
  onlineMode = true;
}

function bindEvents() {
  els.searchInput.addEventListener("input", render);
  els.areaFilter.addEventListener("change", render);
  els.customAreaFilter.addEventListener("input", render);
  els.maxPriceInput.addEventListener("input", render);
  els.radiusFilter.addEventListener("change", render);
  els.locationInput.addEventListener("input", () => {
    updateLocationFromInput();
    render();
  });

  els.closeDialog.addEventListener("click", () => els.detailDialog.close());
  els.closeLoginDialog.addEventListener("click", () => els.loginDialog.close());
  els.loginButton.addEventListener("click", handleLoginButton);
  els.useLocationButton.addEventListener("click", useBrowserLocation);
  els.seedButton.addEventListener("click", resetFallbackData);
  els.registerButton.addEventListener("click", handleRegisterClick);
  els.forgotPasswordButton.addEventListener("click", handleForgotPasswordClick);
  els.typeSelect.addEventListener("change", updatePostTypeFields);
  els.postForm.addEventListener("input", updatePostPreview);
  els.imageFileInput.addEventListener("change", handleImageSelection);
  els.saveDraftButton.addEventListener("click", saveDraftFromForm);
  els.closePostTypeDialog.addEventListener("click", () => els.postTypeDialog.close());
  els.logoutButton.addEventListener("click", handleLoginButton);

  window.addEventListener("hashchange", () => navigateTo(getRouteFromHash()));

  document.querySelectorAll("[data-open-post]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openPostTypeDialog();
    });
  });

  document.querySelectorAll("[data-post-type-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      startPost(button.dataset.postTypeChoice);
    });
  });

  document.querySelectorAll("[data-post-type]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (link.closest(".category-section")) return;
      event.preventDefault();
      startPost(link.dataset.postType);
      els.typeSelect.value = link.dataset.postType;
      updatePostTypeFields();
    });
  });

  els.loginForm.addEventListener("submit", handleLoginSubmit);
  els.postForm.addEventListener("submit", handlePostSubmit);

  els.detailContent.addEventListener("click", (event) => {
    const map = event.target.closest("[data-map-id]");
    if (map) {
      const chooser = document.querySelector(`[data-map-chooser="${map.dataset.mapId}"]`);
      chooser?.classList.toggle("is-open");
      return;
    }

    const copyButton = event.target.closest("[data-copy-contact]");
    if (copyButton) {
      navigator.clipboard?.writeText(copyButton.dataset.copyContact);
      copyButton.textContent = "已复制";
      return;
    }

    const favoriteButton = event.target.closest("[data-favorite]");
    if (favoriteButton) {
      toggleFavorite(favoriteButton.dataset.favorite);
    }
  });
}

function getRouteFromHash() {
  return (location.hash || "#home").replace("#", "") || "home";
}

function navigateTo(route) {
  if (route === "post") {
    openPostTypeDialog();
    route = "home";
  }

  const homeIds = ["home", "search", "rentals", "secondhand"];
  const sectionMap = {
    home: homeIds,
    rentals: homeIds,
    secondhand: homeIds,
    favorites: ["favorites"],
    messages: ["messages"],
    account: ["account"],
    "my-posts": ["my-posts"],
    drafts: ["drafts"],
    history: ["history"],
    settings: ["settings"],
    "post-form": ["post"],
  };
  const visible = sectionMap[route] || homeIds;

  document.querySelectorAll("main > section").forEach((section) => {
    section.hidden = !visible.includes(section.id);
  });
  document.body.dataset.page = visible[0] === "home" ? "home" : route;

  document.querySelectorAll(".mobile-nav a, .desktop-nav a").forEach((link) => {
    const linkRoute = link.getAttribute("href")?.replace("#", "");
    link.classList.toggle("is-active", linkRoute === route || (route === "post-form" && linkRoute === "post"));
  });

  if (route === "rentals") document.querySelector("#rentals")?.scrollIntoView({ block: "start" });
  if (route === "secondhand") document.querySelector("#secondhand")?.scrollIntoView({ block: "start" });
}

function openPostTypeDialog() {
  if (!els.postTypeDialog.open) els.postTypeDialog.showModal();
}

function startPost(type, draft = null) {
  editingListingId = draft?.id || null;
  els.typeSelect.value = type;
  updatePostTypeFields();
  if (draft) fillPostForm(draft);
  else {
    els.postForm.reset();
    els.typeSelect.value = type;
    selectedImageFiles = [];
    renderImagePreviews();
    updatePostTypeFields();
  }
  if (els.postTypeDialog.open) els.postTypeDialog.close();
  location.hash = "#post-form";
  navigateTo("post-form");
}

function renderAreaOptions() {
  els.areaFilter.innerHTML = areas.map((area) => `<option value="${area}">${area}</option>`).join("");
  els.postArea.innerHTML = areas
    .filter((area) => area !== "全部地区")
    .map((area) => `<option value="${area}">${area}</option>`)
    .join("");
}

function updatePostTypeFields() {
  const type = els.typeSelect.value;
  const categories = type === "rental" ? rentalCategories : secondhandCategories;
  els.categorySelect.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  document.querySelectorAll(".rental-only").forEach((field) => {
    field.hidden = type !== "rental";
  });
  document.querySelectorAll(".secondhand-only").forEach((field) => {
    field.hidden = type !== "secondhand";
  });

  const titleInput = els.postForm.elements.title;
  const priceInput = els.postForm.elements.price;
  const descriptionInput = els.postForm.elements.description;
  if (type === "rental") {
    titleInput.placeholder = "例如 Rockville 主卧转租，近红线地铁";
    priceInput.placeholder = "月租，例如 1200";
    descriptionInput.placeholder = "写清楚交通、室友、家具、看房方式和租期要求。";
  } else {
    titleInput.placeholder = "例如 搬家出 IKEA 书桌和办公椅";
    priceInput.placeholder = "售价，例如 80";
    descriptionInput.placeholder = "写清楚尺寸、新旧程度、取货方式、是否可议价。";
  }

  updatePostPreview();
}

function handleImageSelection() {
  const incoming = Array.from(els.imageFileInput.files || []);
  selectedImageFiles = [...selectedImageFiles, ...incoming].slice(0, 6);
  if (incoming.length && selectedImageFiles.length === 6) {
    alert("最多上传 6 张图片，第一张会作为封面。");
  }
  els.imageFileInput.value = "";
  renderImagePreviews();
  updatePostPreview();
}

function renderImagePreviews() {
  if (!selectedImageFiles.length) {
    els.imagePreviewGrid.innerHTML = `<div class="image-preview-empty">已选图片会显示在这里，第一张作为封面。</div>`;
    return;
  }

  els.imagePreviewGrid.innerHTML = selectedImageFiles
    .map(
      (file, index) => `
        <div class="image-preview-item">
          <img src="${URL.createObjectURL(file)}" alt="上传预览 ${index + 1}" />
          <span>${index === 0 ? "封面" : `图 ${index + 1}`}</span>
          <button type="button" data-remove-image="${index}">删除</button>
        </div>
      `
    )
    .join("");

  els.imagePreviewGrid.querySelectorAll("[data-remove-image]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedImageFiles.splice(Number(button.dataset.removeImage), 1);
      renderImagePreviews();
      updatePostPreview();
    });
  });
}

function updatePostPreview() {
  const data = new FormData(els.postForm);
  const type = data.get("type");
  const title = data.get("title")?.trim() || "标题预览";
  const price = Number(data.get("price")) || 0;
  const area = data.get("customArea")?.trim() || data.get("area") || "地区";
  const category = data.get("category") || "分类";
  const extra =
    type === "rental"
      ? [
          data.get("moveIn") ? `入住 ${data.get("moveIn")}` : "",
          data.get("furnished") ? "带家具" : "",
          data.get("parking") ? "有停车" : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : [
          data.get("condition"),
          data.get("deliveryAvailable") ? "可送货" : "",
          data.get("negotiable") ? "可议价" : "",
        ]
          .filter(Boolean)
          .join(" · ");

  els.postPreview.innerHTML = `
    <strong>发布预览</strong>
    <span>${type === "rental" ? "租房" : "二手"} · ${escapeHtml(area)} · ${escapeHtml(category)}</span>
    <span>${escapeHtml(title)} ${price ? `· $${price.toLocaleString()}` : ""}</span>
    ${extra ? `<span>${escapeHtml(extra)}</span>` : ""}
    <span>${selectedImageFiles.length} 张图片</span>
  `;
}

function fillPostForm(item) {
  els.postForm.elements.type.value = item.type || "rental";
  els.postForm.elements.area.value = areas.includes(item.area) ? item.area : "其他/自定义";
  els.postForm.elements.customArea.value = areas.includes(item.area) ? "" : item.area || "";
  els.postForm.elements.title.value = item.title || "";
  els.postForm.elements.price.value = item.price || "";
  updatePostTypeFields();
  if (Array.from(els.categorySelect.options).some((option) => option.value === item.category)) {
    els.postForm.elements.category.value = item.category;
  }
  els.postForm.elements.nearby.value = item.type === "rental" ? item.nearby || "" : "";
  els.postForm.elements.address.value = item.type === "rental" ? item.address || "" : "";
  els.postForm.elements.pickupLocation.value =
    item.type === "secondhand" ? item.nearby || item.address || "" : "";
  els.postForm.elements.moveIn.value = item.moveIn || "";
  els.postForm.elements.condition.value = item.condition || extractCondition(item) || "";
  els.postForm.elements.image.value = item.image || "";
  els.postForm.elements.contact.value = item.contact || "";
  els.postForm.elements.description.value = stripGeneratedDescription(item.description || "");
  updatePostPreview();
}

function stripGeneratedDescription(description) {
  return String(description).replace(/^【[^】]+】[^\n]*\n\n/, "");
}

async function loadCurrentUser() {
  if (!onlineMode) return;
  const { data } = await db.auth.getUser();
  currentUser = data.user || null;
  await loadProfile();
}

async function loadProfile() {
  currentProfile = null;
  if (!onlineMode || !currentUser) return;
  const { data } = await db
    .from("profiles")
    .select("email, display_name, role")
    .eq("id", currentUser.id)
    .maybeSingle();
  currentProfile = data || null;
}

async function loadListings() {
  if (!onlineMode) {
    listings = normalizeListings(loadFallbackListings());
    return;
  }

  const { data, error } = await db
    .from("listings")
    .select("*")
    .or(buildReadableListingFilter())
    .order("updated_at", { ascending: false });

  if (error) {
    showLoadError(error.message);
    listings = [];
    return;
  }

  listings = normalizeListings((data || []).map(fromDbListing));
  await attachListingImages();
}

async function attachListingImages() {
  if (!onlineMode || !listings.length) return;
  const ids = listings.map((item) => item.id);
  const { data, error } = await db
    .from("listing_images")
    .select("listing_id, image_url, sort_order")
    .in("listing_id", ids)
    .order("sort_order", { ascending: true });
  if (error) return;

  const grouped = new Map();
  for (const image of data || []) {
    if (!grouped.has(image.listing_id)) grouped.set(image.listing_id, []);
    grouped.get(image.listing_id).push(image.image_url);
  }

  listings = listings.map((item) => {
    const images = grouped.get(item.id) || (item.image ? [item.image] : []);
    return { ...item, images, image: images[0] || item.image };
  });
}

function buildReadableListingFilter() {
  if (!currentUser) return "status.eq.approved";
  return `status.eq.approved,user_id.eq.${currentUser.id}`;
}

function render() {
  const approved = filterListings(listings.filter((item) => item.status === "approved"));
  renderCards(els.rentalList, approved.filter((item) => item.type === "rental"));
  renderCards(els.secondhandList, approved.filter((item) => item.type === "secondhand"));
  renderFavorites();
  renderMessages(approved);
  renderAdmin();
  renderAccount();
  renderMyPosts();
  renderDrafts();
  renderHistory();
  renderUser();
  renderStats();
}

function loadLocalState() {
  favoriteIds = readStoredArray(FAVORITES_KEY);
  draftListings = readStoredArray(DRAFTS_KEY);
  historyIds = readStoredArray(HISTORY_KEY);
}

function readStoredArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function saveLocalState() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(draftListings));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(historyIds));
}

function filterListings(items) {
  const keyword = els.searchInput.value.trim().toLowerCase();
  const area = els.areaFilter.value;
  const customArea = els.customAreaFilter.value.trim().toLowerCase();
  const maxPrice = Number(els.maxPriceInput.value);
  const radius = Number(els.radiusFilter.value);

  return items.filter((item) => {
    const matchesKeyword =
      !keyword ||
      [item.title, item.description, item.category, item.area, item.nearby, item.address]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    const searchableArea = [item.area, item.address, item.nearby].join(" ").toLowerCase();
    const matchesArea = area === "全部地区" || area === "其他/自定义" || item.area === area;
    const matchesCustomArea = !customArea || searchableArea.includes(customArea);
    const matchesPrice = !maxPrice || item.price <= maxPrice;
    const matchesDistance =
      item.type !== "rental" ||
      !radius ||
      !userLocation ||
      distanceMiles(userLocation, item) <= radius;
    return matchesKeyword && matchesArea && matchesCustomArea && matchesPrice && matchesDistance;
  });
}

function renderCards(target, items) {
  if (!items.length) {
    target.innerHTML = `<div class="empty">暂时没有符合条件的信息。可以换个筛选，或者先发布第一条。</div>`;
    return;
  }

  target.innerHTML = items.map(cardTemplate).join("");
  target.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => showDetail(button.dataset.detail));
  });
  target.querySelectorAll("[data-report]").forEach((button) => {
    button.addEventListener("click", () => reportListing(button.dataset.report));
  });
}

function renderFavorites() {
  const savedItems = favoriteIds
    .map((id) => listings.find((item) => item.id === id && item.status === "approved"))
    .filter(Boolean);
  if (!savedItems.length) {
    els.favoriteList.innerHTML = `
      <div class="empty">
        你还没有收藏任何内容。看到喜欢的房源或物品，可以点收藏保存到这里。
        <a class="primary-btn inline-action" href="#home">去首页看看</a>
      </div>
    `;
    return;
  }

  els.favoriteList.innerHTML = savedItems.map(savedItemTemplate).join("");
  els.favoriteList.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => showDetail(button.dataset.detail));
  });
  els.favoriteList.querySelectorAll("[data-unfavorite]").forEach((button) => {
    button.addEventListener("click", () => toggleFavorite(button.dataset.unfavorite));
  });
}

function savedItemTemplate(item) {
  const isSaved = favoriteIds.includes(item.id);
  return `
    <article class="saved-item">
      <div class="saved-thumb">${imageTemplate(item)}</div>
      <div>
        <div class="saved-title">
          <strong>${escapeHtml(item.title)}</strong>
          <button class="heart-btn ${isSaved ? "is-saved" : ""}" type="button" data-unfavorite="${item.id}" aria-label="${isSaved ? "取消收藏" : "收藏"}">${isSaved ? "♥" : "♡"}</button>
        </div>
        <p>$${Number(item.price).toLocaleString()} · ${escapeHtml(item.area)} · ${timeAgo(item.updatedAt)}</p>
        <small>${item.type === "rental" ? "租房" : "二手"}</small>
        <div class="saved-actions">
          <button type="button" data-detail="${item.id}">查看详情</button>
          <a href="#messages">联系对方</a>
        </div>
      </div>
    </article>
  `;
}

function renderMessages(approved) {
  const rental = approved.find((item) => item.type === "rental");
  const secondhand = approved.find((item) => item.type === "secondhand");
  const rows = [
    rental
      ? {
          image: rental.image || fallbackImages.rental,
          title: rental.title,
          body: "你好，请问什么时候方便看房？",
          time: "2分钟前",
          tag: "租房",
        }
      : null,
    secondhand
      ? {
          image: secondhand.image || fallbackImages.secondhand,
          title: secondhand.title,
          body: "物品还在吗？我想约时间取。",
          time: "今天 3:20 PM",
          tag: "二手",
        }
      : null,
    {
      image: "",
      title: "系统通知",
      body: "发布内容提交后会进入审核，通过后显示在列表中。",
      time: "今天",
      tag: "通知",
    },
  ].filter(Boolean);

  els.messageList.innerHTML = rows
    .map(
      (row) => `
        <article class="message-item">
          <div class="message-thumb">
            ${row.image ? `<img src="${escapeHtml(row.image)}" alt="" loading="lazy" />` : "通"}
          </div>
          <div>
            <strong>${escapeHtml(row.title)}</strong>
            <p>${escapeHtml(row.body)}</p>
            <small>${escapeHtml(row.tag)} · ${escapeHtml(row.time)}</small>
          </div>
          <span class="unread-dot"></span>
        </article>
      `
    )
    .join("");
}

function cardTemplate(item) {
  const label = item.type === "rental" ? "租房" : "二手";
  const distance = getDistanceLabel(item);
  return `
    <article class="listing-card">
      <div class="listing-image">
        ${imageTemplate(item)}
        <span class="status-badge">${label}</span>
        <span class="fresh-badge">${timeAgo(item.updatedAt)}</span>
      </div>
      <div class="listing-body">
        <div class="price">$${Number(item.price).toLocaleString()}</div>
        <h3>${escapeHtml(item.title)}</h3>
        <div class="meta">
          <span>${escapeHtml(item.area)}</span>
          <span>·</span>
          <span>${escapeHtml(item.category)}</span>
          ${cardExtraMeta(item)}
          ${distance ? `<span>·</span><span>${distance}</span>` : ""}
        </div>
        <p class="desc">${escapeHtml(item.description)}</p>
        <div class="card-actions">
          <button type="button" data-detail="${item.id}">查看详情</button>
          <button type="button" data-report="${item.id}">举报</button>
        </div>
      </div>
    </article>
  `;
}

function cardExtraMeta(item) {
  const meta =
    item.type === "rental"
      ? [item.moveIn ? `入住 ${item.moveIn}` : "", hasText(item.description, "带家具") ? "带家具" : ""]
      : [extractCondition(item), hasText(item.description, "可送货") ? "可送货" : ""];

  return meta
    .filter(Boolean)
    .map((value) => `<span>·</span><span>${escapeHtml(value)}</span>`)
    .join("");
}

function showDetail(id) {
  const item = listings.find((entry) => entry.id === id);
  if (!item) return;
  addHistory(id);
  const isSaved = favoriteIds.includes(id);
  const rentalExtra =
    item.type === "rental"
      ? `
        <p><strong>入住时间：</strong>${escapeHtml(item.moveIn || "可商议")}</p>
        <p><strong>房源位置：</strong>${escapeHtml(item.address || item.area)}</p>
        ${mapTemplate(item)}
      `
      : "";

  els.detailContent.innerHTML = `
    <div class="detail-inner">
      ${galleryTemplate(item)}
      <p class="eyebrow">${item.type === "rental" ? "租房/转租" : "二手/清仓"}</p>
      <h2>${escapeHtml(item.title)}</h2>
      <div class="price">$${Number(item.price).toLocaleString()}</div>
      <p><strong>地区：</strong>${escapeHtml(item.area)}</p>
      <p><strong>分类：</strong>${escapeHtml(item.category)}</p>
      ${rentalExtra}
      <p><strong>附近：</strong>${escapeHtml(item.nearby || "未填写")}</p>
      <p><strong>更新时间：</strong>${timeAgo(item.updatedAt)}</p>
      <button class="favorite-detail-btn ${isSaved ? "is-saved" : ""}" type="button" data-favorite="${item.id}">
        ${isSaved ? "已收藏 ♥" : "收藏 ♡"}
      </button>
      <div class="safety-note">交易提醒：不要提前转账押金或定金；租房请尽量实地/视频看房，二手交易建议当面验货。</div>
      <p>${escapeHtml(item.description)}</p>
      ${contactTemplate(item)}
    </div>
  `;
  if (!els.detailDialog.open) els.detailDialog.showModal();
}

function toggleFavorite(id) {
  favoriteIds = favoriteIds.includes(id)
    ? favoriteIds.filter((savedId) => savedId !== id)
    : [id, ...favoriteIds];
  saveLocalState();
  render();
  const item = listings.find((entry) => entry.id === id);
  if (item && els.detailDialog.open) showDetail(id);
}

function addHistory(id) {
  historyIds = [id, ...historyIds.filter((historyId) => historyId !== id)].slice(0, 30);
  saveLocalState();
}

function imageTemplate(item) {
  const image = item.image || fallbackImages[item.type];
  if (!image) {
    return `<div class="image-fallback">${item.type === "rental" ? "DMV 租房" : "DMV 二手"}</div>`;
  }
  return `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.title)}" loading="lazy" />`;
}

function galleryTemplate(item) {
  const images = item.images?.length ? item.images : [item.image || fallbackImages[item.type]];
  return `
    <div class="detail-gallery">
      ${images
        .slice(0, 6)
        .map((image, index) => `<img src="${escapeHtml(image)}" alt="${escapeHtml(item.title)} 图片 ${index + 1}" loading="lazy" />`)
        .join("")}
    </div>
  `;
}

function contactTemplate(item) {
  if (!currentUser) {
    return `
      <div class="contact-box locked-contact">
        登录后查看联系方式，减少骚扰和爬虫抓取。
        <button class="secondary-btn" type="button" onclick="document.querySelector('#loginDialog').showModal()">登录查看</button>
      </div>
    `;
  }

  return `
    <div class="contact-box">
      联系方式：${escapeHtml(item.contact)}
      <button class="secondary-btn copy-contact-btn" type="button" data-copy-contact="${escapeHtml(item.contact)}">复制联系方式</button>
      <small>发布者：${escapeHtml(item.userName || "平台用户")}</small>
      <small>邮箱已验证</small>
    </div>
  `;
}

function mapTemplate(item) {
  if (!item.lat || !item.lng) return "";
  const bbox = getBbox(item.lat, item.lng);
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${item.lat},${item.lng}`;
  const appleUrl = `https://maps.apple.com/?q=${encodeURIComponent(item.address || item.title)}&ll=${item.lat},${item.lng}`;
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`;

  return `
    <div class="map-block">
      <button class="map-preview" type="button" data-map-id="${item.id}" aria-label="打开地图选择">
        <iframe title="${escapeHtml(item.title)} 地图" src="${osmUrl}" loading="lazy"></iframe>
        <span class="map-pin">●</span>
        <span class="map-hint">点击地图选择 Apple Maps 或 Google Maps 打开</span>
      </button>
      <div class="map-chooser" data-map-chooser="${item.id}">
        <a target="_blank" rel="noopener" href="${appleUrl}">Apple Maps 打开</a>
        <a target="_blank" rel="noopener" href="${googleUrl}">Google Maps 打开</a>
      </div>
    </div>
  `;
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!onlineMode) {
    alert("当前没有连接 Supabase，暂时只能看本地演示。");
    return;
  }

  const data = new FormData(els.loginForm);
  const email = data.get("email").trim().toLowerCase();
  const password = data.get("password");

  const result = await db.auth.signInWithPassword({ email, password });

  if (result.error) {
    alert(`登录失败：${getAuthErrorHelp(result.error.message)}`);
    return;
  }

  currentUser = result.data.user;
  await loadProfile();
  await loadListings();
  els.loginDialog.close();
  els.loginForm.reset();
  render();

}

async function handleRegisterClick() {
  if (!onlineMode) {
    alert("当前没有连接 Supabase，暂时只能看本地演示。");
    return;
  }

  const data = new FormData(els.loginForm);
  const email = data.get("email").trim().toLowerCase();
  const password = data.get("password");
  const name = data.get("name").trim() || email.split("@")[0];

  if (!email || !password) {
    alert("注册需要填写邮箱和密码。");
    return;
  }

  const result = await db.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: name },
      emailRedirectTo: window.location.origin,
    },
  });

  if (result.error) {
    alert(`注册失败：${getAuthErrorHelp(result.error.message)}`);
    return;
  }

  if (!result.data.session) {
    alert("注册成功。请先去邮箱完成确认，然后再回来登录。");
    return;
  }

  currentUser = result.data.user;
  await loadProfile();
  await loadListings();
  els.loginDialog.close();
  els.loginForm.reset();
  render();
}

async function handleForgotPasswordClick() {
  if (!onlineMode) {
    alert("当前没有连接 Supabase，暂时只能看本地演示。");
    return;
  }

  const data = new FormData(els.loginForm);
  const email = data.get("email").trim().toLowerCase();
  if (!email) {
    alert("请先填写邮箱，再点击忘记密码。");
    return;
  }

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });

  if (error) {
    alert(`发送失败：${getAuthErrorHelp(error.message)}`);
    return;
  }

  alert("重置密码邮件已发送，请查看邮箱。");
}

async function handleLoginButton() {
  if (!currentUser) {
    els.loginDialog.showModal();
    return;
  }

  const shouldLogout = confirm(`当前登录：${currentUser.email}\n是否退出登录？`);
  if (!shouldLogout) return;
  if (onlineMode) await db.auth.signOut();
  currentUser = null;
  currentProfile = null;
  await loadListings();
  render();
}

async function handlePostSubmit(event) {
  event.preventDefault();
  if (onlineMode && !currentUser) {
    els.loginDialog.showModal();
    return;
  }

  const formData = new FormData(els.postForm);
  const listing = listingFromForm(formData);

  const existingListing = editingListingId
    ? listings.find((item) => item.id === editingListingId)
    : null;

  if (editingListingId && existingListing) {
    await updateOwnListing(editingListingId, listing);
    editingListingId = null;
    alert("已更新帖子。");
  } else if (onlineMode) {
    const { data, error } = await db.from("listings").insert(toDbListing(listing)).select("id").single();
    if (error) {
      alert(`发布失败：${error.message}`);
      return;
    }
    listing.id = data.id;
    if (editingListingId) {
      draftListings = draftListings.filter((item) => item.id !== editingListingId);
      saveLocalState();
    }

    const uploadedImages = await uploadListingImages(selectedImageFiles, listing.id);
    if (uploadedImages.length) {
      listing.image = uploadedImages[0];
      listing.images = uploadedImages;
      await saveListingImages(listing.id, uploadedImages);
      await db.from("listings").update({ image_url: uploadedImages[0] }).eq("id", listing.id);
    }

    alert("已提交，等待管理员审核。");
    await loadListings();
  } else {
    listing.status = "approved";
    if (editingListingId) {
      listing.id = editingListingId;
      draftListings = draftListings.filter((item) => item.id !== editingListingId);
    }
    listing.images = selectedImageFiles.map((file) => URL.createObjectURL(file));
    listings.unshift(listing);
    saveFallbackListings(listings);
    saveLocalState();
    alert("发布成功。");
  }

  els.postForm.reset();
  selectedImageFiles = [];
  editingListingId = null;
  renderImagePreviews();
  updatePostTypeFields();
  render();
  location.hash = "#my-posts";
  navigateTo("my-posts");
}

async function updateOwnListing(id, listing) {
  const existing = listings.find((item) => item.id === id);
  if (!existing) return;
  const next = {
    ...existing,
    ...listing,
    id,
    userId: existing.userId,
    status: existing.status === "draft" ? "approved" : existing.status,
    images: selectedImageFiles.length ? selectedImageFiles.map((file) => URL.createObjectURL(file)) : existing.images,
    image: listing.image || existing.image,
    updatedAt: new Date().toISOString(),
  };

  if (onlineMode && currentUser && existing.userId === currentUser.id) {
    const { error } = await db.from("listings").update(toDbListing(next)).eq("id", id).eq("user_id", currentUser.id);
    if (error) {
      alert(`更新失败：${error.message}`);
      return;
    }
    await loadListings();
  } else {
    listings = listings.map((item) => (item.id === id ? next : item));
    saveFallbackListings(listings);
  }
}

function saveDraftFromForm() {
  const data = new FormData(els.postForm);
  const draft = {
    ...listingFromForm(data),
    id: editingListingId || createId(),
    status: "draft",
    images: selectedImageFiles.map((file) => URL.createObjectURL(file)),
    image: data.get("image").trim(),
  };
  draftListings = [draft, ...draftListings.filter((item) => item.id !== draft.id)];
  saveLocalState();
  els.postForm.reset();
  selectedImageFiles = [];
  editingListingId = null;
  renderImagePreviews();
  updatePostTypeFields();
  render();
  location.hash = "#drafts";
  navigateTo("drafts");
}

async function uploadListingImages(files, listingId) {
  const uploaded = [];
  for (const file of files.slice(0, 6)) {
    const url = await uploadOneListingImage(file, listingId);
    if (url) uploaded.push(url);
  }
  return uploaded;
}

async function uploadOneListingImage(file, listingId) {
  if (!file || !file.size) return "";
  if (!file.type.startsWith("image/")) {
    alert("只能上传图片文件。");
    return "";
  }

  const maxSizeMb = 6;
  if (file.size > maxSizeMb * 1024 * 1024) {
    alert(`图片不能超过 ${maxSizeMb}MB。`);
    return "";
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExtension = extension.replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${currentUser.id}/${listingId}/${Date.now()}-${createId()}.${safeExtension}`;
  const { error } = await db.storage.from("listing-images").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    alert(`图片上传失败：${error.message}`);
    return "";
  }

  const { data } = db.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}

async function saveListingImages(listingId, imageUrls) {
  const rows = imageUrls.map((url, index) => ({
    listing_id: listingId,
    image_url: url,
    sort_order: index,
  }));
  const { error } = await db.from("listing_images").insert(rows);
  if (error) {
    alert(`图片记录保存失败：${error.message}`);
  }
}

function listingFromForm(data) {
  const selectedArea = data.get("area");
  const customArea = data.get("customArea").trim();
  const area = selectedArea === "其他/自定义" && customArea ? customArea : selectedArea;
  const parsedCoords = parseCoordinates(data.get("coordinates"));
  const areaCoord = areaCoordinates[area] || areaCoordinates["Washington DC"];
  const type = data.get("type");
  const baseDescription = data.get("description").trim();
  const enrichedDescription = buildEnrichedDescription(type, data, baseDescription);
  const fallbackTitle = baseDescription.slice(0, 24) || (type === "rental" ? "房屋出租" : "二手物品");
  const now = new Date().toISOString();
  return {
    id: createId(),
    userId: getActiveUserId(),
    type,
    status: "pending",
    title: data.get("title").trim() || fallbackTitle,
    area,
    price: Number(data.get("price")) || 0,
    category: data.get("category").trim(),
    moveIn: data.get("moveIn") || null,
    nearby: type === "rental" ? data.get("nearby").trim() : data.get("pickupLocation").trim(),
    address:
      type === "rental"
        ? data.get("address").trim() || area
        : data.get("pickupLocation").trim() || area,
    lat: parsedCoords?.lat ?? areaCoord.lat,
    lng: parsedCoords?.lng ?? areaCoord.lng,
    image: data.get("image").trim(),
    contact: data.get("contact").trim() || "未填写",
    description: enrichedDescription,
    condition: data.get("condition") || "",
    deliveryAvailable: Boolean(data.get("deliveryAvailable")),
    furnished: Boolean(data.get("furnished")),
    userName: currentProfile?.display_name || currentUser?.email || "演示用户",
    createdAt: now,
    updatedAt: now,
  };
}

function getActiveUserId() {
  return currentUser?.id || "demo-user";
}

function buildEnrichedDescription(type, data, baseDescription) {
  if (type === "rental") {
    const rows = [
      data.get("deposit") ? `押金：$${Number(data.get("deposit")).toLocaleString()}` : "",
      data.get("leaseTerm") ? `租期：${data.get("leaseTerm")}` : "",
      data.get("furnished") ? "带家具" : "",
      data.get("parking") ? "有停车" : "",
      data.get("petAllowed") ? "可养宠物" : "",
    ].filter(Boolean);
    return rows.length ? `【租房信息】${rows.join(" · ")}\n\n${baseDescription}` : baseDescription;
  }

  const rows = [
    data.get("condition") ? `新旧程度：${data.get("condition")}` : "",
    data.get("negotiable") ? "可议价" : "",
    data.get("deliveryAvailable") ? "可送货" : "",
    data.get("pickupLocation") ? `取货地点：${data.get("pickupLocation")}` : "",
  ].filter(Boolean);
  return rows.length ? `【二手信息】${rows.join(" · ")}\n\n${baseDescription}` : baseDescription;
}

async function reportListing(id) {
  if (!currentUser) {
    els.loginDialog.showModal();
    return;
  }

  if (!onlineMode) {
    alert("已收到举报。正式上线后会进入后台待处理列表。");
    return;
  }

  const { error } = await db.from("reports").insert({
    listing_id: id,
    reporter_id: currentUser.id,
    reason: "用户举报",
  });
  alert(error ? `举报失败：${error.message}` : "已收到举报。");
}

function renderAdmin() {
  if (!currentUser) {
    els.pendingCount.textContent = "需管理员登录";
    els.adminList.innerHTML = `<div class="empty">管理员登录后可以审核待发布内容。</div>`;
    return;
  }

  if (!isAdmin()) {
    els.pendingCount.textContent = "无管理员权限";
    els.adminList.innerHTML = `<div class="empty">当前账号不是管理员。请确认 profiles 表里 role 是否为 admin。</div>`;
    return;
  }

  const pending = listings.filter((item) => item.status === "pending");
  els.pendingCount.textContent = `${pending.length} 条待审核`;
  if (!pending.length) {
    els.adminList.innerHTML = `<div class="empty">目前没有待审核内容。</div>`;
    return;
  }

  els.adminList.innerHTML = pending
    .map(
      (item) => `
        <div class="admin-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="meta">
              <span>${item.type === "rental" ? "租房" : "二手"}</span>
              <span>·</span>
              <span>${escapeHtml(item.area)}</span>
              <span>·</span>
              <span>$${Number(item.price).toLocaleString()}</span>
            </div>
          </div>
          <div class="admin-actions">
            <button class="secondary-btn" type="button" data-detail="${item.id}">查看</button>
            <button class="approve-btn" type="button" data-approve="${item.id}">通过</button>
            <button class="reject-btn" type="button" data-reject="${item.id}">拒绝</button>
          </div>
        </div>
      `
    )
    .join("");

  els.adminList.querySelectorAll("[data-approve]").forEach((button) => {
    button.addEventListener("click", () => updateListingStatus(button.dataset.approve, "approved"));
  });
  els.adminList.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => showDetail(button.dataset.detail));
  });
  els.adminList.querySelectorAll("[data-reject]").forEach((button) => {
    button.addEventListener("click", () => updateListingStatus(button.dataset.reject, "rejected"));
  });
}

function renderAccount() {
  if (!currentUser) {
    els.accountStatus.textContent = "未登录";
    els.profileName.textContent = "Barry";
    els.accountList.innerHTML = `
      <div class="empty">
        登录后可以同步管理你的发布。演示模式下也可以先体验发布、草稿、收藏和浏览历史。
        <button class="primary-btn inline-action" type="button" onclick="document.querySelector('#loginDialog').showModal()">现在登录</button>
      </div>
    `;
    return;
  }

  els.accountStatus.textContent = currentUser.email;
  els.profileName.textContent = currentProfile?.display_name || currentUser.email.split("@")[0];
  els.accountList.innerHTML = `<div class="empty">从上方入口进入我的发布、草稿、收藏、浏览历史和设置。</div>`;
}

function renderMyPosts() {
  const mine = listings.filter((item) => item.userId === getActiveUserId());
  if (!mine.length) {
    els.myPostList.innerHTML = `<div class="empty">你还没有发布内容。可以先发布一条租房或二手信息。</div>`;
    return;
  }

  els.myPostList.innerHTML = mine
    .map(
      (item) => `
        <div class="admin-item">
          <div>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="meta">
              <span>${item.type === "rental" ? "租房" : "二手"}</span>
              <span>·</span>
              <span>${escapeHtml(item.area)}</span>
              <span>·</span>
              <span>$${Number(item.price).toLocaleString()}</span>
              <span>·</span>
              <span>${statusLabel(item.status)}</span>
            </div>
          </div>
          <div class="admin-actions">
            <button class="secondary-btn" type="button" data-detail="${item.id}">查看</button>
            <button class="approve-btn" type="button" data-edit="${item.id}">编辑</button>
            <button class="reject-btn" type="button" data-delete="${item.id}">删除</button>
          </div>
        </div>
      `
    )
    .join("");

  els.myPostList.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => showDetail(button.dataset.detail));
  });
  els.myPostList.querySelectorAll("[data-edit]").forEach((button) => {
    button.addEventListener("click", () => editListing(button.dataset.edit));
  });
  els.myPostList.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => deleteListing(button.dataset.delete));
  });
}

function renderDrafts() {
  if (!draftListings.length) {
    els.draftList.innerHTML = `<div class="empty">还没有草稿。发布信息时点“保存草稿”，会出现在这里。</div>`;
    return;
  }

  els.draftList.innerHTML = draftListings
    .map(
      (item) => `
        <div class="admin-item">
          <div>
            <strong>${escapeHtml(item.title || "未命名草稿")}</strong>
            <div class="meta">
              <span>${item.type === "rental" ? "租房" : "二手"}</span>
              <span>·</span>
              <span>${escapeHtml(item.area || "未填写地区")}</span>
              <span>·</span>
              <span>草稿</span>
            </div>
          </div>
          <div class="admin-actions">
            <button class="approve-btn" type="button" data-edit-draft="${item.id}">继续编辑</button>
            <button class="reject-btn" type="button" data-delete-draft="${item.id}">删除</button>
          </div>
        </div>
      `
    )
    .join("");

  els.draftList.querySelectorAll("[data-edit-draft]").forEach((button) => {
    button.addEventListener("click", () => {
      const draft = draftListings.find((item) => item.id === button.dataset.editDraft);
      if (draft) startPost(draft.type, draft);
    });
  });
  els.draftList.querySelectorAll("[data-delete-draft]").forEach((button) => {
    button.addEventListener("click", () => {
      draftListings = draftListings.filter((item) => item.id !== button.dataset.deleteDraft);
      saveLocalState();
      render();
    });
  });
}

function renderHistory() {
  const historyItems = historyIds
    .map((id) => listings.find((item) => item.id === id))
    .filter(Boolean);
  if (!historyItems.length) {
    els.historyList.innerHTML = `<div class="empty">还没有浏览历史。打开帖子详情后会自动记录到这里。</div>`;
    return;
  }
  els.historyList.innerHTML = historyItems.map(savedItemTemplate).join("");
  els.historyList.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => showDetail(button.dataset.detail));
  });
  els.historyList.querySelectorAll("[data-unfavorite]").forEach((button) => {
    button.addEventListener("click", () => toggleFavorite(button.dataset.unfavorite));
  });
}

function editListing(id) {
  const item = listings.find((entry) => entry.id === id);
  if (!item) return;
  startPost(item.type, item);
}

async function deleteListing(id) {
  if (!confirm("确定删除这条帖子吗？")) return;
  if (onlineMode && currentUser) {
    const { error } = await db.from("listings").delete().eq("id", id).eq("user_id", currentUser.id);
    if (error) {
      alert(`删除失败：${error.message}`);
      return;
    }
    await loadListings();
  } else {
    listings = listings.filter((item) => item.id !== id);
    favoriteIds = favoriteIds.filter((savedId) => savedId !== id);
    historyIds = historyIds.filter((historyId) => historyId !== id);
    saveFallbackListings(listings);
    saveLocalState();
  }
  render();
}

async function updateListingStatus(id, status) {
  if (onlineMode) {
    const { error } = await db.from("listings").update({ status }).eq("id", id);
    if (error) {
      alert(`更新失败：${error.message}`);
      return;
    }
    await loadListings();
  } else {
    const item = listings.find((entry) => entry.id === id);
    if (item) item.status = status;
    saveFallbackListings(listings);
  }
  render();
}

function renderUser() {
  if (!onlineMode) {
    els.loginButton.textContent = "演示模式";
    return;
  }
  els.loginButton.textContent = currentUser
    ? currentProfile?.display_name || currentUser.email.split("@")[0]
    : "登录";
  els.loginButton.classList.toggle("is-logged-in", Boolean(currentUser));
}

function renderStats() {
  const approved = listings.filter((item) => item.status === "approved");
  els.statRental.textContent = approved.filter((item) => item.type === "rental").length;
  els.statSecondhand.textContent = approved.filter((item) => item.type === "secondhand").length;
  els.statFresh.textContent = approved.filter((item) => daysSince(item.updatedAt) <= 7).length;
}

function isAdmin() {
  return currentProfile?.role === "admin";
}

function toDbListing(item) {
  return {
    user_id: item.userId,
    type: item.type,
    status: item.status,
    title: item.title,
    description: item.description,
    price: item.price,
    area: item.area,
    category: item.category,
    move_in: item.moveIn || null,
    nearby: item.nearby || null,
    address: item.address || null,
    lat: item.lat,
    lng: item.lng,
    image_url: item.image || null,
    contact: item.contact,
  };
}

function fromDbListing(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    title: row.title,
    description: row.description,
    price: Number(row.price),
    area: row.area,
    category: row.category,
    moveIn: row.move_in,
    nearby: row.nearby,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    image: row.image_url,
    contact: row.contact,
    userName: "平台用户",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function updateLocationFromInput() {
  const value = els.locationInput.value.trim();
  if (!value) {
    userLocation = null;
    els.locationStatus.textContent = "距离筛选仅用于租房。";
    return;
  }

  userLocation = resolveLocation(value);
  els.locationStatus.textContent = userLocation
    ? `已识别：${userLocation.label}`
    : "暂未识别该地点，可试试 Rockville、UMD、Tysons 或邮编。";
}

function useBrowserLocation() {
  if (!navigator.geolocation) {
    els.locationStatus.textContent = "当前浏览器不支持定位。";
    return;
  }

  els.locationStatus.textContent = "正在获取当前位置...";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      userLocation = {
        label: "当前位置",
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      els.locationInput.value = "当前位置";
      els.locationStatus.textContent = "已使用你的当前位置。";
      render();
    },
    () => {
      els.locationStatus.textContent = "无法获取当前位置，请手动输入地点。";
    }
  );
}

function resolveLocation(value) {
  if (value === "当前位置" && userLocation?.label === "当前位置") return userLocation;
  const normalized = value.toLowerCase();
  const match = Object.entries(areaCoordinates).find(([name]) => {
    const key = name.toLowerCase();
    return normalized.includes(key) || key.includes(normalized);
  });
  if (!match) return null;
  return { label: match[0], ...match[1] };
}

function getDistanceLabel(item) {
  if (item.type !== "rental" || !userLocation || !item.lat || !item.lng) return "";
  return `${distanceMiles(userLocation, item).toFixed(1)} mi`;
}

function distanceMiles(a, b) {
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(h));
}

function parseCoordinates(value) {
  const parts = String(value || "")
    .split(",")
    .map((part) => Number(part.trim()));
  if (parts.length !== 2 || parts.some((part) => Number.isNaN(part))) return null;
  return { lat: parts[0], lng: parts[1] };
}

function normalizeListings(items) {
  return items.map((item) => {
    const coord = areaCoordinates[item.area] || areaCoordinates["Washington DC"];
    return {
      ...item,
      address: item.address || item.nearby || item.area,
      lat: item.lat ?? coord.lat,
      lng: item.lng ?? coord.lng,
    };
  });
}

function loadFallbackListings() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedListings));
    return cloneListings(seedListings);
  }
  try {
    return JSON.parse(raw);
  } catch {
    return cloneListings(seedListings);
  }
}

function saveFallbackListings(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function resetFallbackData() {
  if (onlineMode) {
    alert("已连接线上数据库，示例重置只在离线演示模式使用。");
    return;
  }
  listings = cloneListings(seedListings);
  saveFallbackListings(listings);
  render();
}

function showLoadError(message) {
  els.rentalList.innerHTML = `<div class="empty">连接 Supabase 失败：${escapeHtml(message)}</div>`;
  els.secondhandList.innerHTML = `<div class="empty">请检查 API key、RLS 策略和网络。</div>`;
}

function getAuthErrorHelp(message) {
  if (message === "Failed to fetch") {
    return [
      "Failed to fetch",
      "",
      "这通常不是密码错误，而是浏览器连不上 Supabase Auth。",
      "请检查：",
      "1. Supabase Authentication -> URL Configuration 里加入 http://localhost:8088",
      "2. Redirect URLs 里加入 http://localhost:8088/**",
      "3. Authentication -> Sign In / Providers 里 Email 是否启用",
      "4. 浏览器能否打开 https://difazkplusfmojvfznzt.supabase.co/auth/v1/settings",
    ].join("\n");
  }
  return message;
}

function statusLabel(status) {
  return (
    {
      pending: "待审核",
      approved: "已发布",
      rejected: "未通过",
      expired: "已下架",
      draft: "草稿",
    }[status] || status
  );
}

function hasText(value, text) {
  return String(value || "").includes(text);
}

function extractCondition(item) {
  const match = String(item.description || "").match(/新旧程度：([^ ·\n]+)/);
  return item.condition || match?.[1] || "";
}

function getBbox(lat, lng) {
  const delta = 0.055;
  return [lng - delta, lat - delta, lng + delta, lat + delta].join(",");
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function rentalSeed(
  title,
  area,
  price,
  category,
  nearby,
  address,
  lat,
  lng,
  contact,
  description,
  days,
  image,
  moveIn
) {
  return {
    id: createId(),
    userId: "demo-user",
    type: "rental",
    status: "approved",
    title,
    area,
    price,
    category,
    moveIn,
    nearby,
    address,
    lat,
    lng,
    image,
    contact,
    description,
    userName: "平台示例用户",
    createdAt: daysAgo(days),
    updatedAt: daysAgo(days),
  };
}

function secondhandSeed(title, area, price, category, nearby, contact, description, days, image) {
  const coord = areaCoordinates[area] || areaCoordinates["Washington DC"];
  return {
    id: createId(),
    userId: "demo-user",
    type: "secondhand",
    status: "approved",
    title,
    area,
    price,
    category,
    moveIn: "",
    nearby,
    address: nearby,
    lat: coord.lat,
    lng: coord.lng,
    image,
    contact,
    description,
    userName: "平台示例用户",
    createdAt: daysAgo(days),
    updatedAt: daysAgo(days),
  };
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysSince(dateString) {
  return Math.floor((Date.now() - new Date(dateString).getTime()) / 86400000);
}

function timeAgo(dateString) {
  const days = daysSince(dateString);
  if (days <= 0) return "今天更新";
  if (days === 1) return "1天前更新";
  return `${days}天前更新`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cloneListings(items) {
  return JSON.parse(JSON.stringify(items));
}
