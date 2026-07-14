import { hasSupabaseConfig, readSupabaseConfig } from "../../config";

export type SupabaseClient = SaminestSupabaseClient;
export type SupabaseClientFactory = SaminestSupabaseClientFactory;

let supabaseClient: SupabaseClient | null = null;

export function initializeSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const factory = window.supabase;
  const config = readSupabaseConfig();
  if (!factory || !hasSupabaseConfig(config)) return null;

  supabaseClient = factory.createClient(config.url, config.anonKey);
  return supabaseClient;
}

export function getSupabaseClient(): SupabaseClient | null {
  return supabaseClient || initializeSupabaseClient();
}
