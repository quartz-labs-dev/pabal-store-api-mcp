import { GooglePlayClient } from "@packages/play-store/client";
import { loadConfig } from "@packages/common/config";

/**
 * Result type for Google Play client creation
 */
export type GooglePlayClientResult =
  | { success: true; client: GooglePlayClient }
  | { success: false; error: string };

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
    return {
      success: false,
      error: "Google Play client configuration is missing",
    };
  }

  const { packageName } = config;

  if (!packageName || typeof packageName !== "string" || !packageName.trim()) {
    return {
      success: false,
      error: "Package name is required and must be a non-empty string",
    };
  }

  // Load fresh config (stateless - works from any directory)
  let playStoreConfig;
  try {
    const fullConfig = loadConfig();
    playStoreConfig = fullConfig.playStore;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to load Google Play configuration: ${message}`,
    };
  }

  // Validate required credentials
  if (!playStoreConfig) {
    return {
      success: false,
      error: "Google Play configuration is missing in config file",
    };
  }

  const { serviceAccountJson } = playStoreConfig;

  if (
    !serviceAccountJson ||
    typeof serviceAccountJson !== "string" ||
    !serviceAccountJson.trim()
  ) {
    return {
      success: false,
      error: "Google Play service account JSON is required in configuration",
    };
  }

  // Parse and validate service account JSON
  let serviceAccountKey: Record<string, unknown>;
  try {
    const parsed = JSON.parse(serviceAccountJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        success: false,
        error: "Service account JSON must be a valid JSON object",
      };
    }
    serviceAccountKey = parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Invalid Google Play service account JSON: ${message}`,
    };
  }

  // Create client
  try {
    const client = new GooglePlayClient({
      packageName,
      serviceAccountKey,
    });

    return {
      success: true,
      client,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Failed to create Google Play client: ${message}`,
    };
  }
}
