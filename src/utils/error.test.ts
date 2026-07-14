import { describe, expect, it } from "vitest";

import { normalizeError } from "./error";

describe("normalizeError", () => {
  it("normalizes Error instances", () => {
    expect(normalizeError(new Error("请求失败"))).toEqual({
      code: "ERROR",
      message: "请求失败"
    });
  });

  it("normalizes string errors", () => {
    expect(normalizeError("网络不可用")).toEqual({
      code: "ERROR",
      message: "网络不可用"
    });
  });

  it("preserves code and message from ordinary objects", () => {
    expect(
      normalizeError({ code: "NOT_FOUND", message: "内容不存在", detail: 404 })
    ).toEqual({
      code: "NOT_FOUND",
      message: "内容不存在"
    });
  });

  it.each([null, undefined])("normalizes empty values", (value) => {
    expect(normalizeError(value)).toEqual({
      code: "UNKNOWN_ERROR",
      message: "发生未知错误"
    });
  });
});
