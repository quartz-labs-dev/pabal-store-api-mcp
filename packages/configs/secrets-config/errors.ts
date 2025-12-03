import { AppError } from "@/packages/common/errors/app-error";
import { ERROR_CODES } from "@/packages/common/errors/error-codes";
import { HTTP_STATUS } from "@/packages/common/errors/status-codes";

export class ConfigError extends AppError {
  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      details?: unknown;
      cause?: unknown;
    }
  ) {
    super({
      status: options?.status ?? HTTP_STATUS.INTERNAL_SERVER_ERROR,
      code: options?.code ?? ERROR_CODES.CONFIG_ERROR,
      message,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = "ConfigError";
  }
}
