import { AppError } from "@/packages/common/errors/app-error";
import { ERROR_CODES } from "@/packages/common/errors/error-codes";
import type { ClientFactoryResult } from "./types";
export type { ClientFactoryResult } from "./types";

export const success = <TClient>(
  client: TClient
): ClientFactoryResult<TClient> => ({
  success: true,
  client,
});

export const failure = <TClient>(
  error: AppError
): ClientFactoryResult<TClient> => ({
  success: false,
  error,
});

export const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && Boolean(value.trim());
