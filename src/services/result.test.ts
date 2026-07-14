import { describe, expect, it } from "vitest";

import { fail, ok } from "./result";

describe("Result helpers", () => {
  it("creates a successful result without transforming data", () => {
    const data = { id: "post-1" };

    const result = ok(data);

    expect(result).toEqual({ success: true, data, error: null });
    expect(result.data).toBe(data);
  });

  it("creates a failed result with a stable error shape", () => {
    expect(fail("VALIDATION_ERROR", "请检查输入内容")).toEqual({
      success: false,
      data: null,
      error: {
        code: "VALIDATION_ERROR",
        message: "请检查输入内容"
      }
    });
  });
});
