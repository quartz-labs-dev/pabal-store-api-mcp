import { AppStoreClient } from "./client";
import type { AppStoreConfig } from "@packages/common/config";

/**
 * Helper to create an AppStoreClient from config.
 */
export function getAppStoreClient(
  config: AppStoreConfig & { bundleId: string }
): AppStoreClient {
  if (!config) {
    throw new Error("App Store configuration is missing.");
  }

  const { bundleId, issuerId, keyId, privateKey } = config;

  if (!privateKey) {
    throw new Error("App Store Private Key is required.");
  }

  if (
    typeof privateKey === "string" &&
    !privateKey.includes("BEGIN PRIVATE KEY")
  ) {
    throw new Error(
      "Invalid Private Key format. PEM format private key is required."
    );
  }

  return new AppStoreClient({
    bundleId,
    issuerId,
    keyId,
    privateKey: privateKey as string,
  });
}
