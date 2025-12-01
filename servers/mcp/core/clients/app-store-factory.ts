import { AppStoreClient } from "@packages/app-store/client";
import { loadConfig } from "@packages/common/config";

/**
 * Result type for App Store client creation
 */
export type AppStoreClientResult =
  | { success: true; client: AppStoreClient }
  | { success: false; error: string };

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
    return {
      success: false,
      error: "App Store client configuration is missing",
    };
  }

  const { bundleId } = config;

  if (!bundleId || typeof bundleId !== "string" || !bundleId.trim()) {
    return {
      success: false,
      error: "Bundle ID is required and must be a non-empty string",
    };
  }

  // Load fresh config (stateless - works from any directory)
  let appStoreConfig;
  try {
    const fullConfig = loadConfig();
    appStoreConfig = fullConfig.appStore;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to load App Store configuration: ${message}`,
    };
  }

  // Validate required credentials
  if (!appStoreConfig) {
    return {
      success: false,
      error: "App Store configuration is missing in config file",
    };
  }

  const { issuerId, keyId, privateKey } = appStoreConfig;

  if (!issuerId || typeof issuerId !== "string" || !issuerId.trim()) {
    return {
      success: false,
      error: "App Store Issuer ID is required in configuration",
    };
  }

  if (!keyId || typeof keyId !== "string" || !keyId.trim()) {
    return {
      success: false,
      error: "App Store Key ID is required in configuration",
    };
  }

  if (!privateKey || typeof privateKey !== "string" || !privateKey.trim()) {
    return {
      success: false,
      error: "App Store Private Key is required in configuration",
    };
  }

  // Validate private key format
  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    return {
      success: false,
      error:
        "Invalid Private Key format. PEM format private key is required (must contain 'BEGIN PRIVATE KEY')",
    };
  }

  // Create client
  try {
    const client = new AppStoreClient({
      bundleId,
      issuerId,
      keyId,
      privateKey,
    });

    return {
      success: true,
      client,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to create App Store client: ${message}`,
    };
  }
}
