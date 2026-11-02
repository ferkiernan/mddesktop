import { AppErrorSchema, type AppErrorPayload, type ErrorCode } from "./contracts";

export class AppError extends Error {
  readonly code: ErrorCode | "UNKNOWN";
  readonly details?: unknown;

  constructor(code: ErrorCode | "UNKNOWN", message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }

  is(code: ErrorCode): boolean {
    return this.code === code;
  }
}

/** Normalizes whatever `invoke` rejected with into an AppError. */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  const parsed = AppErrorSchema.safeParse(e);
  if (parsed.success) {
    const p: AppErrorPayload = parsed.data;
    return new AppError(p.code, p.message, p.details);
  }
  return new AppError("UNKNOWN", typeof e === "string" ? e : "Unexpected error");
}
