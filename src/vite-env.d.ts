/// <reference types="vite/client" />

interface SaminestSupabaseClient {
  auth?: unknown;
  storage?: unknown;
  from?: (...args: unknown[]) => unknown;
  [key: string]: unknown;
}

interface SaminestSupabaseClientFactory {
  createClient(url: string, anonKey: string): SaminestSupabaseClient;
}

interface Window {
  SAMINEST_SUPABASE_CONFIG?: import("./config").SupabaseConfig;
  DMV_SUPABASE_CONFIG?: import("./config").SupabaseConfig;
  supabase?: SaminestSupabaseClientFactory;
  SaminestModules: {
    dom: {
      escapeHtml(value: unknown): string;
    };
    toast: {
      showAppNotice(message: string, tone?: string): void;
    };
    loading: {
      renderLoading(
        root: Pick<HTMLElement, "innerHTML">,
        pageHeader: (title: string) => string,
        message?: unknown
      ): void;
    };
    supabase: {
      getClient(): SaminestSupabaseClient | null;
    };
  };
}
