import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

const legacyPath = fileURLToPath(
  new URL("../../../public/legacy-app.js", import.meta.url)
);
const legacySource = readFileSync(legacyPath, "utf8");

function sourceBetween(startMarker, endMarker) {
  const start = legacySource.indexOf(startMarker);
  const end = legacySource.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) {
    throw new Error(`Missing legacy source markers: ${startMarker}`);
  }
  return legacySource.slice(start, end);
}

function deferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function compileLegacyFunction(startMarker, endMarker, functionName, context) {
  const source = sourceBetween(startMarker, endMarker);
  const names = Object.keys(context);
  const values = Object.values(context);
  return new Function(
    ...names,
    `${source}\nreturn { run: ${functionName}, getState: () => state };`
  )(...values);
}

class MockFormData {
  constructor(form) {
    this.form = form;
  }

  entries() {
    return Object.entries(this.form.values);
  }
}

describe("Legacy avatar adapters", () => {
  it("routes new avatars through the existing Auth service", () => {
    const source = sourceBetween(
      "async function updateProfileAvatar",
      "function escapeHtml"
    );
    expect(source).toContain("module.saveAvatar({");
    expect(source).toContain("const requestedUserId = currentUserId();");
    expect(source).toContain("userId: requestedUserId");
    expect(source).toContain("state.session?.userId !== requestedUserId");
    expect(source).not.toContain("supabaseClient.auth.updateUser");
    expect(source).not.toContain('.from("profiles")');
  });

  it("does not write the cached avatar while saving a display name", () => {
    const source = sourceBetween(
      "async function saveProfileSettings",
      "async function updateProfileAvatar"
    );
    expect(source).toContain("const requestedUserId = currentUserId();");
    expect(source).toContain("module.updateDisplayName(requestedUserId, name)");
    expect(source).toContain("authResult.data?.userId !== requestedUserId");
    expect(source).not.toContain("supabaseClient.auth.updateUser");
    expect(source).not.toContain('.from("profiles")');
    expect(source).not.toContain("avatar_url: state.user.avatarUrl");
  });

  it("discards an avatar result when account A switches to account B", async () => {
    const upload = deferred();
    const saveAvatar = vi.fn(() => upload.promise);
    const applyCurrentUserAvatar = vi.fn();
    const renderProfileSettings = vi.fn();
    const renderProfile = vi.fn();
    const showAppNotice = vi.fn();
    const alert = vi.fn();
    const state = {
      session: { loggedIn: true, userId: "user-a" },
      user: { name: "User A", avatarUrl: "" },
      listings: [{ id: "a-post", owner: "User A" }]
    };
    const adapter = compileLegacyFunction(
      "async function updateProfileAvatar",
      "function escapeHtml",
      "updateProfileAvatar",
      {
        state,
        currentUserId: () => state.session.userId,
        cloudReady: () => true,
        authModule: () => ({ saveAvatar }),
        cloudLoadingMessage: vi.fn(),
        readFileAsDataUrl: vi.fn(async () => "data:image/png;base64,QQ=="),
        resizeImageDataUrl: vi.fn(async (value) => value),
        applyCurrentUserAvatar,
        legacyAvatarMigrationScheduled: false,
        legacyAvatarReauthenticationRequired: false,
        legacyAvatarMigrationUserId: "",
        location: { hash: "#settings-profile" },
        renderProfileSettings,
        renderProfile,
        showAppNotice,
        window: { alert },
        console: { warn: vi.fn() }
      }
    );

    const pending = adapter.run({ files: [{ type: "image/png" }] });
    await vi.waitFor(() => expect(saveAvatar).toHaveBeenCalledTimes(1));
    state.session = { loggedIn: true, userId: "user-b" };
    state.user = { name: "User B", avatarUrl: "https://cdn.test/b.png" };
    state.listings = [{ id: "b-post", owner: "User B" }];
    upload.resolve({
      success: true,
      data: {
        avatarUrl: "https://cdn.test/a.png",
        requiresReauthentication: true
      },
      error: null
    });
    await pending;

    expect(saveAvatar).toHaveBeenCalledWith({
      userId: "user-a",
      image: "data:image/png;base64,QQ=="
    });
    expect(adapter.getState().user).toEqual({
      name: "User B",
      avatarUrl: "https://cdn.test/b.png"
    });
    expect(adapter.getState().listings).toEqual([
      { id: "b-post", owner: "User B" }
    ]);
    expect(applyCurrentUserAvatar).not.toHaveBeenCalled();
    expect(renderProfileSettings).not.toHaveBeenCalled();
    expect(renderProfile).not.toHaveBeenCalled();
    expect(showAppNotice).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it("writes A's display name by captured user id and never applies it to B", async () => {
    const update = deferred();
    const updateDisplayName = vi.fn(() => update.promise);
    const syncCurrentUserListingsProfile = vi.fn();
    const saveState = vi.fn();
    const renderSettings = vi.fn();
    const alert = vi.fn();
    const state = {
      session: {
        loggedIn: true,
        userId: "user-a",
        email: "a@example.com"
      },
      user: { name: "User A", subtitle: "A", avatarUrl: "" },
      accounts: {},
      listings: [{ id: "a-post", owner: "User A" }]
    };
    const adapter = compileLegacyFunction(
      "async function saveProfileSettings",
      "async function updateProfileAvatar",
      "saveProfileSettings",
      {
        state,
        currentUserId: () => state.session.userId,
        cloudReady: () => true,
        FormData: MockFormData,
        authModule: () => ({ updateDisplayName }),
        imageUploadModule: () => ({ isLegacyAvatarDataUrl: () => false }),
        cloudLoadingMessage: vi.fn(),
        applyCurrentUserAvatar: vi.fn(),
        legacyAvatarMigrationScheduled: false,
        legacyAvatarReauthenticationRequired: false,
        legacyAvatarMigrationUserId: "",
        normalizeAuthEmail: (value) => String(value || "").toLowerCase(),
        syncCurrentUserListingsProfile,
        saveState,
        renderSettings,
        window: { alert }
      }
    );

    const pending = adapter.run({
      values: { name: "User A Updated", subtitle: "Updated" }
    });
    expect(updateDisplayName).toHaveBeenCalledWith("user-a", "User A Updated");
    state.session = {
      loggedIn: true,
      userId: "user-b",
      email: "b@example.com"
    };
    state.user = {
      name: "User B",
      subtitle: "B",
      avatarUrl: "https://cdn.test/b.png"
    };
    state.listings = [{ id: "b-post", owner: "User B" }];
    update.resolve({
      success: true,
      data: { userId: "user-a", user: { id: "user-a" } },
      error: null
    });
    await pending;

    expect(adapter.getState().user).toEqual({
      name: "User B",
      subtitle: "B",
      avatarUrl: "https://cdn.test/b.png"
    });
    expect(adapter.getState().listings).toEqual([
      { id: "b-post", owner: "User B" }
    ]);
    expect(syncCurrentUserListingsProfile).not.toHaveBeenCalled();
    expect(saveState).not.toHaveBeenCalled();
    expect(renderSettings).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
  });

  it("schedules legacy migration before cloud refresh and skips hydration", () => {
    const migration = sourceBetween(
      "function scheduleLegacyAvatarMigration",
      "function authFlowEffects"
    );
    const effects = sourceBetween(
      "function authFlowEffects",
      "async function ensureSupabaseProfile"
    );
    expect(effects.indexOf("scheduleLegacyAvatarMigration(outcome)"))
      .toBeLessThan(effects.indexOf("await refreshCloudData()"));
    expect(legacySource).toContain("&& !legacyAvatarReauthenticationRequired");
    expect(legacySource).toContain("const signedOut = await module.signOut(authFlowEffects())");
    expect(legacySource).toContain("if (!signedOut?.success)");
    expect(legacySource).toContain("window.clearTimeout(legacyAvatarMigrationTimer)");
    expect(legacySource).toContain("legacyAvatarMigrationUserId");
    expect(legacySource).toContain(".catch(() => false)");
    expect(migration).toContain("handleLegacyAvatarMigrationFailure(");
    expect(migration).toContain("input.userId");
    expect(migration.indexOf("state.session?.userId !== input.userId"))
      .toBeLessThan(migration.indexOf("const signedOut = await module.signOut(authFlowEffects())"));
    expect(legacySource).not.toContain("[DEBUG] listing_images");
  });
});
