import { describe, expect, it, vi } from "vitest";

import { renderLoading } from "./loading";

const HEADER_HTML = `
    <header class="page-header">
      <button class="plain-back" type="button" data-back>‹</button>
      <h1>加载中</h1>
      <a href="#publish">发布</a>
    </header>
  `;

describe("renderLoading", () => {
  it("writes the exact legacy loading markup", () => {
    const root = { innerHTML: "" };
    const pageHeader = vi.fn(() => HEADER_HTML);

    renderLoading(root, pageHeader);

    expect(pageHeader).toHaveBeenCalledOnce();
    expect(pageHeader).toHaveBeenCalledWith("加载中");
    expect(root.innerHTML).toBe(`
    <section class="page-screen">
      ${HEADER_HTML}
      <section class="subpage-card">
        <p>加载中...</p>
      </section>
    </section>
  `);
  });

  it("keeps the markup and escapes only the loading message", () => {
    const root = { innerHTML: "" };

    renderLoading(root, () => HEADER_HTML, `<img src="x">`);

    expect(root.innerHTML).toBe(`
    <section class="page-screen">
      ${HEADER_HTML}
      <section class="subpage-card">
        <p>&lt;img src=&quot;x&quot;&gt;</p>
      </section>
    </section>
  `);
  });
});
