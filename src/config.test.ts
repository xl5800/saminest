// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import { hasSupabaseConfig, readSupabaseConfig } from "./config";

describe("Supabase configuration", () => {
  beforeEach(() => {
    delete window.SAMINEST_SUPABASE_CONFIG;
    delete window.DMV_SUPABASE_CONFIG;
  });

  it("reads the primary Saminest configuration without changing its values", () => {
    const config = { url: " https://example.supabase.co ", anonKey: " anon-key " };
    window.SAMINEST_SUPABASE_CONFIG = config;
    window.DMV_SUPABASE_CONFIG = { url: "fallback", anonKey: "fallback-key" };

    expect(readSupabaseConfig()).toBe(config);
    expect(readSupabaseConfig()).toEqual(config);
  });

  it("falls back to the legacy DMV configuration alias", () => {
    const config = { url: "https://legacy.supabase.co", anonKey: "legacy-key" };
    window.DMV_SUPABASE_CONFIG = config;

    expect(readSupabaseConfig()).toBe(config);
    expect(hasSupabaseConfig(readSupabaseConfig())).toBe(true);
  });

  it("returns an unconfigured value when configuration is missing", () => {
    const config = readSupabaseConfig();

    expect(config).toEqual({});
    expect(hasSupabaseConfig(config)).toBe(false);
  });
});
