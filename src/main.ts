/**
 * Vite + TypeScript shadow entry.
 * The application is still bootstrapped by /legacy-app.js.
 */
import { renderLoading } from "./components/loading";
import { showAppNotice } from "./components/toast";
import { createAuthService } from "./features/auth/auth-service";
import { createPostsBridge } from "./features/posts/posts-service";
import { createImageService } from "./features/publish/image-service";
import { getSupabaseClient } from "./services/supabase/client";
import { escapeHtml } from "./utils/dom";

const auth = createAuthService();
const posts = createPostsBridge();
const images = createImageService();

window.SaminestModules = {
  dom: { escapeHtml },
  toast: { showAppNotice },
  loading: { renderLoading },
  supabase: { getClient: getSupabaseClient },
  auth,
  posts,
  publish: { images }
};

// The async CDN may finish before this module, so replay ready after the bridge exists.
if (window.supabase) {
  window.dispatchEvent(new Event("saminest:supabase-ready"));
}

const isLocalDevelopment = ["localhost", "127.0.0.1"].includes(
  window.location.hostname
);

if (isLocalDevelopment) {
  console.info("[Saminest] Vite + TypeScript shadow shell is ready.");
}
