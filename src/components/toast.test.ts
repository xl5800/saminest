// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { showAppNotice } from "./toast";

interface ScheduledTimeout {
  callback: () => void;
  delay: number | undefined;
}

describe("showAppNotice", () => {
  let scheduledTimeouts: ScheduledTimeout[];

  beforeEach(() => {
    document.body.innerHTML = "";
    scheduledTimeouts = [];
    vi.spyOn(window, "setTimeout").mockImplementation((handler, timeout) => {
      if (typeof handler !== "function") {
        throw new TypeError("Toast timeout must use a function callback");
      }
      scheduledTimeouts.push({ callback: () => handler(), delay: timeout });
      return scheduledTimeouts.length;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("preserves the legacy DOM, default tone and display duration", () => {
    showAppNotice("发布成功");

    const notice = document.querySelector<HTMLElement>("[data-app-notice]");
    expect(notice?.tagName).toBe("DIV");
    expect(notice?.className).toBe("app-notice success");
    expect(notice?.dataset.appNotice).toBe("");
    expect(notice?.getAttribute("role")).toBe("status");
    expect(notice?.textContent).toBe("发布成功");

    expect(scheduledTimeouts).toHaveLength(1);
    expect(scheduledTimeouts[0].delay).toBe(3200);
    expect(notice?.isConnected).toBe(true);
    scheduledTimeouts[0].callback();
    expect(notice?.isConnected).toBe(false);
  });

  it("preserves the error class, alert role and text-only message", () => {
    showAppNotice("<strong>失败</strong>", "error");

    const notice = document.querySelector<HTMLElement>("[data-app-notice]");
    expect(notice?.className).toBe("app-notice error");
    expect(notice?.getAttribute("role")).toBe("alert");
    expect(notice?.textContent).toBe("<strong>失败</strong>");
    expect(notice?.children).toHaveLength(0);
  });

  it("keeps the current consecutive-call and timer cleanup behavior", () => {
    showAppNotice("第一条");
    const first = document.querySelector<HTMLElement>("[data-app-notice]");

    showAppNotice("第二条");
    const second = document.querySelector<HTMLElement>("[data-app-notice]");

    expect(first?.isConnected).toBe(false);
    expect(second?.textContent).toBe("第二条");
    expect(document.querySelectorAll("[data-app-notice]")).toHaveLength(1);

    expect(scheduledTimeouts.map(({ delay }) => delay)).toEqual([3200, 3200]);
    scheduledTimeouts[0].callback();
    expect(second?.isConnected).toBe(true);
    scheduledTimeouts[1].callback();
    expect(second?.isConnected).toBe(false);
  });
});
