import { describe, expect, it } from "vitest";
import { normalizeAuthError } from "./auth-errors";

describe("normalizeAuthError", () => {
  it.each([
    ["Invalid login credentials", "AUTH_INVALID_CREDENTIALS", "邮箱或密码不正确，请重新输入。"],
    ["Email not confirmed", "AUTH_EMAIL_NOT_CONFIRMED", "邮箱还没有验证，请先打开系统发送的确认邮件。"],
    ["User already registered", "AUTH_EMAIL_ALREADY_REGISTERED", "这个邮箱已经注册，请直接登录。"],
    ["Auth session missing", "AUTH_SESSION_MISSING", "请先输入注册邮箱，再设置新密码。"],
    ["Password should be at least 6 characters", "AUTH_WEAK_PASSWORD", "密码至少需要 6 位。"],
    ["OTP token expired", "AUTH_LINK_EXPIRED", "账号状态已过期，请重新操作一次。"]
  ])("maps %s", (message, code, expectedMessage) => {
    expect(normalizeAuthError({ message })).toEqual({
      code,
      message: expectedMessage
    });
  });

  it("keeps a stable fallback for null and undefined", () => {
    expect(normalizeAuthError(null)).toEqual({
      code: "AUTH_UNAVAILABLE",
      message: "账号功能暂时不可用，请稍后再试。"
    });
    expect(normalizeAuthError(undefined)).toEqual({
      code: "AUTH_UNAVAILABLE",
      message: "账号功能暂时不可用，请稍后再试。"
    });
  });

  it("does not expose an error object", () => {
    const source = Object.assign(new Error("Unexpected auth failure"), {
      code: "provider_error",
      secret: "must-not-leak"
    });
    expect(normalizeAuthError(source)).toEqual({
      code: "AUTH_UNAVAILABLE",
      message: "账号功能暂时不可用，请稍后再试。"
    });
  });
});
