import { ERROR_CODES } from "./error-codes";
import { HTTP_STATUS } from "./status-codes";

export interface AppErrorJSON {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

type AppErrorParams = {
  status: number;
  code: string;
  message: string;
  details?: unknown;
  cause?: unknown;
};

/**
 * Standardized application error with HTTP-style status codes.
 * Use factory methods (e.g. AppError.notFound) for consistency.
 */
export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor({ status, code, message, details, cause }: AppErrorParams) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
    if (cause !== undefined) {
      // Preserve original error for debugging without leaking in toJSON
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }

  // ---------------------------------------------------------------------------
  // Factory helpers
  // ---------------------------------------------------------------------------
  static badRequest(
    code: string,
    message: string,
    details?: unknown
  ): AppError {
    return new AppError({
      status: HTTP_STATUS.BAD_REQUEST,
      code,
      message,
      details,
    });
  }

  static validation(
    code: string,
    message: string,
    details?: unknown
  ): AppError {
    return new AppError({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code,
      message,
      details,
    });
  }

  static unauthorized(
    code: string,
    message: string,
    details?: unknown
  ): AppError {
    return new AppError({
      status: HTTP_STATUS.UNAUTHORIZED,
      code,
      message,
      details,
    });
  }

  static forbidden(code: string, message: string, details?: unknown): AppError {
    return new AppError({
      status: HTTP_STATUS.FORBIDDEN,
      code,
      message,
      details,
    });
  }

  static notFound(code: string, message: string, details?: unknown): AppError {
    return new AppError({
      status: HTTP_STATUS.NOT_FOUND,
      code,
      message,
      details,
    });
  }

  static conflict(code: string, message: string, details?: unknown): AppError {
    return new AppError({
      status: HTTP_STATUS.CONFLICT,
      code,
      message,
      details,
    });
  }

  static configMissing(
    code: string,
    message: string,
    details?: unknown
  ): AppError {
    return new AppError({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code,
      message,
      details,
    });
  }

  static io(code: string, message: string, details?: unknown): AppError {
    return new AppError({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code,
      message,
      details,
    });
  }

  static fileNotFound(
    code: string,
    message: string,
    details?: unknown
  ): AppError {
    return new AppError({
      status: HTTP_STATUS.NOT_FOUND,
      code,
      message,
      details,
    });
  }

  static internal(
    code: string,
    message: string,
    details?: unknown,
    cause?: unknown
  ): AppError {
    return new AppError({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code,
      message,
      details,
      cause,
    });
  }

  /**
   * Wrap an unknown error into an AppError while preserving the message.
   */
  static wrap(
    error: unknown,
    fallbackStatus: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    fallbackCode: string = ERROR_CODES.INTERNAL_ERROR,
    overrideMessage?: string
  ): AppError {
    if (error instanceof AppError) return error;
    if (error instanceof Error) {
      return new AppError({
        status: fallbackStatus,
        code: fallbackCode,
        message: overrideMessage ?? error.message,
        cause: error,
      });
    }

    return new AppError({
      status: fallbackStatus,
      code: fallbackCode,
      message: overrideMessage ?? String(error),
    });
  }

  toJSON(): AppErrorJSON {
    return {
      status: this.status,
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}
