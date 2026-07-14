export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
}

export interface SupabaseConfigSource {
  SAMINEST_SUPABASE_CONFIG?: SupabaseConfig;
  DMV_SUPABASE_CONFIG?: SupabaseConfig;
}

export interface CompleteSupabaseConfig {
  url: string;
  anonKey: string;
}

export function readSupabaseConfig(
  source: SupabaseConfigSource = window
): SupabaseConfig {
  return (
    source.SAMINEST_SUPABASE_CONFIG || source.DMV_SUPABASE_CONFIG || {}
  );
}

export function hasSupabaseConfig(
  config: SupabaseConfig
): config is CompleteSupabaseConfig {
  return Boolean(config.url && config.anonKey);
}
