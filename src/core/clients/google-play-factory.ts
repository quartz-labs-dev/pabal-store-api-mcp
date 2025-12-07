import { AppError } from "@/packages/common/errors/app-error";
import { ERROR_CODES } from "@/packages/common/errors/error-codes";
import { HTTP_STATUS } from "@/packages/common/errors/status-codes";
import { loadConfig } from "@/packages/configs/secrets-config/config";
import { GooglePlayClient } from "@/packages/stores/play-store/client";
import { failure, isNonEmptyString, success } from "./client-factory-helpers";
import type { ClientFactoryResult } from "./types";

/**
 * Result type for Google Play client creation
 */
export type GooglePlayClientResult = ClientFactoryResult<GooglePlayClient>;

/**
 * Configuration for Google Play client creation
 */
export interface GooglePlayClientConfig {
  packageName: string;
}

/**
 * Create Google Play client with fresh config loading and Result pattern
 *
 * Stateless factory - loads config on every call to ensure MCP works from any directory
 *
 * @param config - Package name configuration
 * @returns Result with client or error message
 *
 * @example
 * const result = createGooglePlayClient({ packageName: "com.example.app" });
 * if (result.success) {
 *   const data = await result.client.getApp();
 * } else {
 *   console.error(result.error);
 * }
 */
export function createGooglePlayClient(
  config: GooglePlayClientConfig
): GooglePlayClientResult {
  // Validate input
  if (!config) {
    return failure(
      AppError.badRequest(
        ERROR_CODES.GOOGLE_PLAY_CLIENT_CONFIG_MISSING,
        "Google Play client configuration is missing"
      )
    );
  }

  const { packageName } = config;

  if (!isNonEmptyString(packageName)) {
    return failure(
      AppError.validation(
        ERROR_CODES.GOOGLE_PLAY_PACKAGE_NAME_INVALID,
        "Package name is required and must be a non-empty string"
      )
    );
  }

  // Load fresh config (stateless - works from any directory)
  let playStoreConfig;
  try {
    const fullConfig = loadConfig();
    playStoreConfig = fullConfig.playStore;
  } catch (error) {
    return failure(
      AppError.wrap(
        error,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.GOOGLE_PLAY_CONFIG_LOAD_FAILED,
        "Failed to load Google Play configuration"
      )
    );
  }

  // Validate required credentials
  if (!playStoreConfig) {
    return failure(
      AppError.configMissing(
        ERROR_CODES.GOOGLE_PLAY_CONFIG_MISSING,
        "Google Play configuration is missing in config file"
      )
    );
  }

  const { serviceAccountJson } = playStoreConfig;

  if (!isNonEmptyString(serviceAccountJson)) {
    return failure(
      AppError.validation(
        ERROR_CODES.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_INVALID,
        "Google Play service account JSON is required in configuration"
      )
    );
  }

  // Parse and validate service account JSON
  let serviceAccountKey: Record<string, unknown>;
  try {
    const parsed = JSON.parse(serviceAccountJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return failure(
        AppError.validation(
          ERROR_CODES.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_FORMAT_INVALID,
          "Service account JSON must be a valid JSON object"
        )
      );
    }
    serviceAccountKey = parsed;
  } catch (error) {
    return failure(
      AppError.wrap(
        error,
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
        ERROR_CODES.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PARSE_FAILED,
        "Invalid Google Play service account JSON"
      )
    );
  }

  // Create client
  try {
    const client = new GooglePlayClient({
      packageName,
      serviceAccountKey,
    });

    return success(client);
  } catch (error) {
    return failure(
      AppError.wrap(
        error,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.GOOGLE_PLAY_CLIENT_CREATE_FAILED,
        "Failed to create Google Play client"
      )
    );
  }
}
