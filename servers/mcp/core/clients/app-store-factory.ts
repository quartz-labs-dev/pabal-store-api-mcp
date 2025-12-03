import { AppError } from "@/packages/common/errors/app-error";
import { ERROR_CODES } from "@/packages/common/errors/error-codes";
import { HTTP_STATUS } from "@/packages/common/errors/status-codes";
import { loadConfig } from "@/packages/configs/secrets-config/config";
import { AppStoreClient } from "@/packages/stores/app-store/client";
import { failure, isNonEmptyString, success } from "./client-factory-helpers";
import type { ClientFactoryResult } from "./types";

/**
 * Result type for App Store client creation
 */
export type AppStoreClientResult = ClientFactoryResult<AppStoreClient>;

/**
 * Configuration for App Store client creation
 */
export interface AppStoreClientConfig {
  bundleId: string;
}

/**
 * Create App Store client with fresh config loading and Result pattern
 *
 * Stateless factory - loads config on every call to ensure MCP works from any directory
 *
 * @param config - Bundle ID configuration
 * @returns Result with client or error message
 *
 * @example
 * const result = createAppStoreClient({ bundleId: "com.example.app" });
 * if (result.success) {
 *   const data = await result.client.getApp();
 * } else {
 *   console.error(result.error);
 * }
 */
export function createAppStoreClient(
  config: AppStoreClientConfig
): AppStoreClientResult {
  // Validate input
  if (!config) {
    return failure(
      AppError.badRequest(
        ERROR_CODES.APP_STORE_CLIENT_CONFIG_MISSING,
        "App Store client configuration is missing"
      )
    );
  }

  const { bundleId } = config;

  if (!isNonEmptyString(bundleId)) {
    return failure(
      AppError.validation(
        ERROR_CODES.APP_STORE_BUNDLE_ID_INVALID,
        "Bundle ID is required and must be a non-empty string"
      )
    );
  }

  // Load fresh config (stateless - works from any directory)
  let appStoreConfig;
  try {
    const fullConfig = loadConfig();
    appStoreConfig = fullConfig.appStore;
  } catch (error) {
    return failure(
      AppError.wrap(
        error,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.APP_STORE_CONFIG_LOAD_FAILED,
        "Failed to load App Store configuration"
      )
    );
  }

  // Validate required credentials
  if (!appStoreConfig) {
    return failure(
      AppError.configMissing(
        ERROR_CODES.APP_STORE_CONFIG_MISSING,
        "App Store configuration is missing in config file"
      )
    );
  }

  const { issuerId, keyId, privateKey } = appStoreConfig;

  if (!isNonEmptyString(issuerId)) {
    return failure(
      AppError.validation(
        ERROR_CODES.APP_STORE_ISSUER_ID_INVALID,
        "App Store Issuer ID is required in configuration"
      )
    );
  }

  if (!isNonEmptyString(keyId)) {
    return failure(
      AppError.validation(
        ERROR_CODES.APP_STORE_KEY_ID_INVALID,
        "App Store Key ID is required in configuration"
      )
    );
  }

  if (!isNonEmptyString(privateKey)) {
    return failure(
      AppError.validation(
        ERROR_CODES.APP_STORE_PRIVATE_KEY_INVALID,
        "App Store Private Key is required in configuration"
      )
    );
  }

  // Validate private key format
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    return failure(
      AppError.validation(
        ERROR_CODES.APP_STORE_PRIVATE_KEY_FORMAT_INVALID,
        "Invalid Private Key format. PEM format private key is required (must contain 'BEGIN PRIVATE KEY')"
      )
    );
  }

  // Create client
  try {
    const client = new AppStoreClient({
      bundleId,
      issuerId,
      keyId,
      privateKey,
    });

    return success(client);
  } catch (error) {
    return failure(
      AppError.wrap(
        error,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.APP_STORE_CLIENT_CREATE_FAILED,
        "Failed to create App Store client"
      )
    );
  }
}
