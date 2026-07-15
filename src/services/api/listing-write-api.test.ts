import { describe, expect, it, vi } from "vitest";
import type { SupabaseListingRow } from "../../types/listing";
import type { ListingWritePayload } from "../../types/publish";
import type { SupabaseClient } from "../supabase/client";
import { createListingWriteApi } from "./listing-write-api";

const payload: ListingWritePayload = {
  user_id: "user-1",
  type: "rental",
  status: "pending",
  title: "Room",
  description: "Description",
  price: 1000,
  area: "Rockville",
  category: "单间",
  move_in: null,
  nearby: "单间",
  image_url: null,
  contact: "站内消息"
};

const row = {
  id: "listing-1",
  ...payload,
  reported_count: 0,
  created_at: "2026-07-15T00:00:00Z",
  updated_at: "2026-07-15T00:00:00Z"
} as SupabaseListingRow;

describe("Listing write API", () => {
  it("inserts a listing through select().single()", async () => {
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));
    const api = createListingWriteApi(
      () => ({ from } as unknown as SupabaseClient)
    );

    await expect(api.insertListing(payload)).resolves.toEqual({
      success: true,
      data: row,
      error: null
    });
    expect(from).toHaveBeenCalledWith("listings");
    expect(insert).toHaveBeenCalledWith(payload);
    expect(select).toHaveBeenCalledOnce();
    expect(single).toHaveBeenCalledOnce();
  });

  it("updates a listing through id and select().single()", async () => {
    const single = vi.fn().mockResolvedValue({ data: row, error: null });
    const select = vi.fn(() => ({ single }));
    const eq = vi.fn(() => ({ select }));
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const api = createListingWriteApi(
      () => ({ from } as unknown as SupabaseClient)
    );

    await expect(api.updateListing("listing-1", payload)).resolves.toEqual({
      success: true,
      data: row,
      error: null
    });
    expect(update).toHaveBeenCalledWith(payload);
    expect(eq).toHaveBeenCalledWith("id", "listing-1");
    expect(select).toHaveBeenCalledOnce();
  });

  it("updates only image_url without selecting the row", async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const update = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ update }));
    const api = createListingWriteApi(
      () => ({ from } as unknown as SupabaseClient)
    );

    await expect(
      api.updateListingImageUrl("listing-1", '["one.jpg","two.jpg"]')
    ).resolves.toEqual({ success: true, data: null, error: null });
    expect(update).toHaveBeenCalledWith({
      image_url: '["one.jpg","two.jpg"]'
    });
    expect(eq).toHaveBeenCalledWith("id", "listing-1");
  });

  it("deletes a newly inserted listing for compensation", async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: null });
    const remove = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ delete: remove }));
    const api = createListingWriteApi(
      () => ({ from } as unknown as SupabaseClient)
    );

    await expect(api.deleteListing("listing-1")).resolves.toEqual({
      success: true,
      data: null,
      error: null
    });
    expect(remove).toHaveBeenCalledOnce();
    expect(eq).toHaveBeenCalledWith("id", "listing-1");
  });

  it("normalizes insert and update failures without raw errors", async () => {
    const rawError = { message: "private database detail", secret: "hidden" };
    const insertSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: rawError });
    const updateSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: rawError });
    const client = {
      from: vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({ single: insertSingle }))
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({ single: updateSingle }))
          }))
        }))
      }))
    } as unknown as SupabaseClient;
    const api = createListingWriteApi(() => client);

    const inserted = await api.insertListing(payload);
    const updated = await api.updateListing("listing-1", payload);
    expect(inserted).toMatchObject({
      success: false,
      error: { code: "LISTING_INSERT_FAILED" }
    });
    expect(updated).toMatchObject({
      success: false,
      error: { code: "LISTING_UPDATE_FAILED" }
    });
    expect(JSON.stringify([inserted, updated])).not.toContain("hidden");
  });

  it("normalizes image update and compensation failures", async () => {
    const eq = vi.fn().mockResolvedValue({ error: new Error("private") });
    const client = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({ eq })),
        delete: vi.fn(() => ({ eq }))
      }))
    } as unknown as SupabaseClient;
    const api = createListingWriteApi(() => client);

    await expect(
      api.updateListingImageUrl("listing-1", "one.jpg")
    ).resolves.toMatchObject({
      success: false,
      error: { code: "LISTING_IMAGE_URL_UPDATE_FAILED" }
    });
    await expect(api.deleteListing("listing-1")).resolves.toMatchObject({
      success: false,
      error: { code: "LISTING_DELETE_FAILED" }
    });
  });

  it("contains missing clients and thrown client getters", async () => {
    await expect(
      createListingWriteApi(() => null).insertListing(payload)
    ).resolves.toMatchObject({
      success: false,
      error: { code: "LISTINGS_WRITE_CLIENT_UNAVAILABLE" }
    });
    await expect(
      createListingWriteApi(() => {
        throw new Error("private getter failure");
      }).deleteListing("listing-1")
    ).resolves.toMatchObject({
      success: false,
      error: { code: "LISTINGS_WRITE_CLIENT_UNAVAILABLE" }
    });
  });
});
