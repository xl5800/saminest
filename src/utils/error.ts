import type { ResultError } from "../services/result";

const DEFAULT_ERROR: ResultError = {
  code: "UNKNOWN_ERROR",
  message: "发生未知错误"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readStringField(
  value: Record<string, unknown>,
  field: "code" | "message"
): string | undefined {
  const candidate = value[field];
  return typeof candidate === "string" && candidate.length > 0
    ? candidate
    : undefined;
}

export function normalizeError(error: unknown): ResultError {
  if (error instanceof Error) {
    const fields = error as unknown as Record<string, unknown>;
    return {
      code: readStringField(fields, "code") ?? "ERROR",
      message: error.message || DEFAULT_ERROR.message
    };
  }

  if (typeof error === "string") {
    return {
      code: "ERROR",
      message: error || DEFAULT_ERROR.message
    };
  }

  if (isRecord(error)) {
    return {
      code: readStringField(error, "code") ?? DEFAULT_ERROR.code,
      message: readStringField(error, "message") ?? DEFAULT_ERROR.message
    };
  }

  return { ...DEFAULT_ERROR };
}
