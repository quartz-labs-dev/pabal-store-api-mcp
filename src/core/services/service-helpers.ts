import { AppError } from "@/packages/common/errors/app-error";
import { ERROR_CODES } from "@/packages/common/errors/error-codes";
import { updateAppSupportedLocales } from "@/packages/configs/secrets-config/registered-apps";
import type { ClientFactoryResult } from "../clients/types";
import type { ServiceResult } from "./types";

export const toServiceResult = <T>(
  clientResult: ClientFactoryResult<T>
): ServiceResult<T> =>
  clientResult.success
    ? { success: true, data: clientResult.client }
    : { success: false, error: clientResult.error };

export const serviceSuccess = <T>(data: T): ServiceResult<T> => ({
  success: true,
  data,
});

export const serviceFailure = <T = never>(
  error: AppError
): ServiceResult<T> => ({
  success: false,
  error,
});

export const updateRegisteredLocales = (
  identifier: string,
  store: "appStore" | "googlePlay",
  locales: string[]
): boolean => updateAppSupportedLocales({ identifier, store, locales });

export const checkPushPrerequisites = ({
  storeLabel,
  configured,
  identifierLabel,
  identifier,
  hasData,
  dataPath,
}: {
  storeLabel: string;
  configured: boolean;
  identifierLabel: string;
  identifier?: string;
  hasData: boolean;
  dataPath?: string;
}): AppError | null => {
  if (!configured) {
    return AppError.badRequest(
      ERROR_CODES.CONFIG_NOT_FOUND_SKIP,
      `⏭️  Skipping ${storeLabel} (not configured in ~/.config/pabal-mcp/config.json)`
    );
  }
  if (!identifier) {
    return AppError.validation(
      ERROR_CODES.IDENTIFIER_MISSING,
      `⏭️  Skipping ${storeLabel} (no ${identifierLabel} provided)`
    );
  }
  if (!hasData) {
    console.error(
      `[MCP]   ⏭️  Skipping ${storeLabel}: No data found after preparation`
    );
    if (dataPath) {
      console.error(`[MCP]     Check if data exists in: ${dataPath}`);
    }
    return AppError.validation(
      ERROR_CODES.NO_DATA_FOUND,
      `⏭️  Skipping ${storeLabel} (no data found)`
    );
  }
  return null;
};
