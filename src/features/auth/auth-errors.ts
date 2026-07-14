import type { ResultError } from "../../services/result";
import { normalizeError } from "../../utils/error";

const DEFAULT_AUTH_ERROR: ResultError = {
  code: "AUTH_UNAVAILABLE",
  message: "账号功能暂时不可用，请稍后再试。"
};

const AUTH_ERROR_RULES: Array<{
  pattern: RegExp;
  code: string;
  message: string;
}> = [
  {
    pattern: /auth session missing/i,
    code: "AUTH_SESSION_MISSING",
    message: "请先输入注册邮箱，再设置新密码。"
  },
  {
    pattern: /invalid login credentials/i,
    code: "AUTH_INVALID_CREDENTIALS",
    message: "邮箱或密码不正确，请重新输入。"
  },
  {
    pattern: /email not confirmed/i,
    code: "AUTH_EMAIL_NOT_CONFIRMED",
    message: "邮箱还没有验证，请先打开系统发送的确认邮件。"
  },
  {
    pattern: /already registered|already exists|user already/i,
    code: "AUTH_EMAIL_ALREADY_REGISTERED",
    message: "这个邮箱已经注册，请直接登录。"
  },
  {
    pattern: /token|otp|code/i,
    code: "AUTH_LINK_EXPIRED",
    message: "账号状态已过期，请重新操作一次。"
  },
  {
    pattern: /(?=.*password)(?=.*(?:six|6|weak|short))/i,
    code: "AUTH_WEAK_PASSWORD",
    message: "密码至少需要 6 位。"
  }
];

export function normalizeAuthError(
  error: unknown,
  fallback: ResultError = DEFAULT_AUTH_ERROR
): ResultError {
  if (error === null || error === undefined) return { ...fallback };
  const hasMessage =
    typeof error === "string" ||
    error instanceof Error ||
    (typeof error === "object" &&
      typeof (error as Record<string, unknown>).message === "string" &&
      Boolean((error as Record<string, unknown>).message));
  if (!hasMessage) return { ...fallback };
  const normalized = normalizeError(error);
  const message = normalized.message.trim();
  if (!message) return { ...fallback };

  const rule = AUTH_ERROR_RULES.find((candidate) =>
    candidate.pattern.test(message)
  );
  if (rule) return { code: rule.code, message: rule.message };

  if (/^(AUTH|PROFILE)_[A-Z0-9_]+$/.test(normalized.code)) {
    return { code: normalized.code, message };
  }
  return { ...fallback };
}

export function authClientUnavailableError(): ResultError {
  return {
    code: "AUTH_CLIENT_UNAVAILABLE",
    message: DEFAULT_AUTH_ERROR.message
  };
}
