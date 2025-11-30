import { GooglePlayClient } from "./client";
import type { PlayStoreConfig } from "@packages/common/config";

/**
 * Helper to create a GooglePlayClient from config.
 */
export function getPlayStoreClient(
  config: PlayStoreConfig & { packageName: string }
): GooglePlayClient {
  if (!config) {
    throw new Error("Play Store configuration is missing.");
  }

  const { packageName, serviceAccountJson } = config;

  if (!packageName) {
    throw new Error("Package name is required.");
  }

  if (!serviceAccountJson || !serviceAccountJson.trim()) {
    throw new Error("Play Store service account JSON is required.");
  }

  let serviceAccountKey: Record<string, unknown>;

  try {
    const parsed = JSON.parse(serviceAccountJson);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Service account JSON must be an object");
    }
    serviceAccountKey = parsed;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "invalid service account JSON";
    throw new Error(`Invalid Play Store service account JSON: ${message}`);
  }

  return new GooglePlayClient({
    packageName,
    serviceAccountKey,
  });
}
