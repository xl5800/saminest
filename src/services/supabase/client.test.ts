// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createClientValue(): SaminestSupabaseClient {
  return {
    auth: {},
    storage: {},
    from: vi.fn()
  };
}

describe("Supabase client", () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.SAMINEST_SUPABASE_CONFIG;
    delete window.DMV_SUPABASE_CONFIG;
    delete window.supabase;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates one client with the configured URL and anon key", async () => {
    const client = createClientValue();
    const createClient = vi.fn(() => client);
    window.SAMINEST_SUPABASE_CONFIG = {
      url: "https://example.supabase.co",
      anonKey: "anon-key"
    };
    window.supabase = { createClient };
    const { getSupabaseClient, initializeSupabaseClient } = await import(
      "./client"
    );

    expect(initializeSupabaseClient()).toBe(client);
    expect(getSupabaseClient()).toBe(client);
    expect(initializeSupabaseClient()).toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "anon-key"
    );
  });

  it("waits safely until the CDN factory becomes available", async () => {
    window.SAMINEST_SUPABASE_CONFIG = {
      url: "https://example.supabase.co",
      anonKey: "anon-key"
    };
    const { getSupabaseClient } = await import("./client");

    expect(getSupabaseClient()).toBeNull();

    const client = createClientValue();
    const createClient = vi.fn(() => client);
    window.supabase = { createClient };

    expect(getSupabaseClient()).toBe(client);
    expect(getSupabaseClient()).toBe(client);
    expect(createClient).toHaveBeenCalledOnce();
  });

  it("does not create a client when configuration is missing", async () => {
    const createClient = vi.fn(() => createClientValue());
    window.supabase = { createClient };
    const { getSupabaseClient } = await import("./client");

    expect(getSupabaseClient()).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });
});
