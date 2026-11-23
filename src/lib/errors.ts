export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "FORBIDDEN_ORIGIN"
  | "EMAIL_NOT_VERIFIED"
  | "ACCOUNT_BLOCKED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "STALE_REVISION"
  | "INVALID_STATE"
  | "QUOTA_EXCEEDED"
  | "ALREADY_EXISTS"
  | "LIMIT_REACHED"
  | "INVALID_TOKEN"
  | "VALIDATION_FAILED"
  | "PUBLISH_REQUIREMENTS_FAILED"
  | "QUIZ_VERSION_CHANGED"
  | "QUESTION_CHANGED"
  | "MEDIA_IN_USE"
  | "MEDIA_NOT_READY"
  | "UPLOAD_NOT_FOUND"
  | "UPLOAD_REJECTED"
  | "RESERVATION_EXPIRED"
  | "RATE_LIMITED"
  | "UPLOADS_DISABLED"
  | "PLAYBACK_DISABLED"
  | "USAGE_STALE"
  | "PROVIDER_UNAVAILABLE"
  | "NOT_CONFIGURED"
  | "INTERNAL_ERROR";

const STATUS: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  FORBIDDEN_ORIGIN: 403,
  EMAIL_NOT_VERIFIED: 403,
  ACCOUNT_BLOCKED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  STALE_REVISION: 409,
  INVALID_STATE: 409,
  QUOTA_EXCEEDED: 409,
  ALREADY_EXISTS: 409,
  LIMIT_REACHED: 409,
  QUIZ_VERSION_CHANGED: 409,
  QUESTION_CHANGED: 409,
  MEDIA_IN_USE: 409,
  MEDIA_NOT_READY: 409,
  RESERVATION_EXPIRED: 409,
  UPLOAD_NOT_FOUND: 409,
  INVALID_TOKEN: 400,
  VALIDATION_FAILED: 422,
  PUBLISH_REQUIREMENTS_FAILED: 422,
  UPLOAD_REJECTED: 422,
  RATE_LIMITED: 429,
  UPLOADS_DISABLED: 503,
  PLAYBACK_DISABLED: 503,
  USAGE_STALE: 503,
  PROVIDER_UNAVAILABLE: 503,
  NOT_CONFIGURED: 503,
  INTERNAL_ERROR: 500,
};

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly fieldErrors?: FieldErrors;
  readonly retryAfterSeconds?: number;
  readonly details?: string[];

  constructor(
    code: ErrorCode,
    message: string,
    opts: { fieldErrors?: FieldErrors; retryAfterSeconds?: number; details?: string[]; cause?: unknown } = {},
  ) {
    super(message, { cause: opts.cause });
    this.name = "AppError";
    this.code = code;
    this.status = STATUS[code];
    this.fieldErrors = opts.fieldErrors;
    this.retryAfterSeconds = opts.retryAfterSeconds;
    this.details = opts.details;
  }
}

export type ActionError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
  retryAfterSeconds?: number;
  details?: string[];
  requestId?: string;
};

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: ActionError };

export const notFound = (what = "Không tìm thấy nội dung") => new AppError("NOT_FOUND", what);
export const forbidden = (msg = "Bạn không có quyền thực hiện thao tác này") => new AppError("FORBIDDEN", msg);

export function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === 11000;
}
