import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "../supabase/client";
import { createListingImagesWriteApi } from "./listing-images-write-api";

describe("Listing images write API", () => {
  it("deletes old rows then inserts unique images in original order", async () => {
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn(() => ({ eq: deleteEq }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn(() => ({ delete: remove, insert }));
    const api = createListingImagesWriteApi(
      () => ({ from } as unknown as SupabaseClient)
    );

    await expect(
      api.replaceListingImages("listing-1", [
        "one.jpg",
        "two.jpg",
        "one.jpg",
        ""
      ])
    ).resolves.toEqual({ success: true, data: null, error: null });
    expect(from).toHaveBeenCalledWith("listing_images");
    expect(deleteEq).toHaveBeenCalledWith("listing_id", "listing-1");
    expect(insert).toHaveBeenCalledWith([
      {
        listing_id: "listing-1",
        image_url: "one.jpg",
        sort_order: 0
      },
      {
        listing_id: "listing-1",
        image_url: "two.jpg",
        sort_order: 1
      }
    ]);
    expect(deleteEq.mock.invocationCallOrder[0]).toBeLessThan(
      insert.mock.invocationCallOrder[0]
    );
  });

  it("clears rows and skips insert for an empty image array", async () => {
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn();
    const client = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({ eq: deleteEq })),
        insert
      }))
    } as unknown as SupabaseClient;

    await expect(
      createListingImagesWriteApi(() => client).replaceListingImages(
        "listing-1",
        []
      )
    ).resolves.toEqual({ success: true, data: null, error: null });
    expect(insert).not.toHaveBeenCalled();
  });

  it("stops when clearing existing image rows fails", async () => {
    const insert = vi.fn();
    const client = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: { message: "private" } })
        })),
        insert
      }))
    } as unknown as SupabaseClient;

    await expect(
      createListingImagesWriteApi(() => client).replaceListingImages(
        "listing-1",
        ["one.jpg"]
      )
    ).resolves.toMatchObject({
      success: false,
      error: { code: "LISTING_IMAGES_CLEAR_FAILED" }
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("normalizes an insert failure without exposing provider details", async () => {
    const client = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null })
        })),
        insert: vi.fn().mockResolvedValue({
          error: { message: "private database detail", secret: "hidden" }
        })
      }))
    } as unknown as SupabaseClient;
    const result = await createListingImagesWriteApi(
      () => client
    ).replaceListingImages("listing-1", ["one.jpg"]);

    expect(result).toMatchObject({
      success: false,
      error: { code: "LISTING_IMAGES_INSERT_FAILED" }
    });
    expect(JSON.stringify(result)).not.toContain("hidden");
  });

  it("rejects a missing listing id before any query", async () => {
    const from = vi.fn();
    const api = createListingImagesWriteApi(
      () => ({ from } as unknown as SupabaseClient)
    );
    await expect(api.replaceListingImages("", ["one.jpg"])).resolves.toMatchObject({
      success: false,
      error: { code: "LISTING_IMAGES_LISTING_ID_REQUIRED" }
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("contains unavailable clients and thrown queries", async () => {
    await expect(
      createListingImagesWriteApi(() => null).replaceListingImages(
        "listing-1",
        ["one.jpg"]
      )
    ).resolves.toMatchObject({
      success: false,
      error: { code: "LISTING_IMAGES_WRITE_CLIENT_UNAVAILABLE" }
    });
    const client = {
      from: vi.fn(() => {
        throw new Error("private query failure");
      })
    } as unknown as SupabaseClient;
    await expect(
      createListingImagesWriteApi(() => client).replaceListingImages(
        "listing-1",
        ["one.jpg"]
      )
    ).resolves.toMatchObject({
      success: false,
      error: { code: "LISTING_IMAGES_WRITE_FAILED" }
    });
  });
});
