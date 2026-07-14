export interface ResultError {
  code: string;
  message: string;
}

export type Result<T> =
  | {
      success: true;
      data: T;
      error: null;
    }
  | {
      success: false;
      data: null;
      error: ResultError;
    };

export function ok<T>(data: T): Result<T> {
  return { success: true, data, error: null };
}

export function fail(code: string, message: string): Result<never> {
  return { success: false, data: null, error: { code, message } };
}
