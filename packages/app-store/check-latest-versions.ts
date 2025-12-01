import type { AppStoreConfig } from "@packages/common/config";
import { createAppStoreClient } from "@servers/mcp/core/clients";

interface CheckAppStoreLatestVersionOptions {
  bundleId: string;
  config: AppStoreConfig;
}

/**
 * Check latest version from App Store
 * Returns formatted version information string
 */
export async function checkAppStoreLatestVersion({
  bundleId,
  config,
}: CheckAppStoreLatestVersionOptions): Promise<string | null> {
  try {
    const clientResult = createAppStoreClient({ bundleId });

    if (!clientResult.success) {
      return `🍎 App Store: Client creation failed - ${clientResult.error}`;
    }

    const latestVersion = await clientResult.client.getLatestVersion();
    if (latestVersion) {
      const versionString = latestVersion.attributes.versionString;
      const state =
        latestVersion.attributes.appStoreState?.toUpperCase() || "UNKNOWN";
      return `🍎 App Store: ${versionString} (${state})`;
    } else {
      return `🍎 App Store: No version found (can create first version)`;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `🍎 App Store: Check failed - ${msg}`;
  }
}
