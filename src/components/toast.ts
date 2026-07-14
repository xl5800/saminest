export function showAppNotice(
  message: string,
  tone: string = "success"
): void {
  document.querySelector("[data-app-notice]")?.remove();
  const notice = document.createElement("div");
  notice.className = `app-notice ${tone}`;
  notice.dataset.appNotice = "";
  notice.setAttribute("role", tone === "error" ? "alert" : "status");
  notice.textContent = message;
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 3200);
}
