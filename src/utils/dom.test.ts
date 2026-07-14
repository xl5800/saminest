import { describe, expect, it } from "vitest";

import { escapeHtml } from "./dom";

describe("escapeHtml", () => {
  it("keeps ordinary text unchanged", () => {
    expect(escapeHtml("Rockville 本地信息")).toBe("Rockville 本地信息");
  });

  it("escapes the existing HTML special-character set", () => {
    expect(escapeHtml("<section>A & B</section>")).toBe(
      "&lt;section&gt;A &amp; B&lt;/section&gt;"
    );
  });

  it("uses the legacy quote entities", () => {
    expect(escapeHtml(`"double" and 'single'`)).toBe(
      "&quot;double&quot; and &#039;single&#039;"
    );
  });

  it("returns an empty string for an empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});
