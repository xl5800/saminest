import { escapeHtml } from "../utils/dom";

export type LoadingRoot = Pick<HTMLElement, "innerHTML">;
export type PageHeaderRenderer = (title: string) => string;

export function renderLoading(
  root: LoadingRoot,
  pageHeader: PageHeaderRenderer,
  message: unknown = "加载中..."
): void {
  root.innerHTML = `
    <section class="page-screen">
      ${pageHeader("加载中")}
      <section class="subpage-card">
        <p>${escapeHtml(message)}</p>
      </section>
    </section>
  `;
}
