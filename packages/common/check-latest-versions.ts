import { checkAppStoreLatestVersion } from "@packages/app-store/check-latest-versions";
import { checkGooglePlayLatestVersion } from "@packages/play-store/check-latest-versions";
import { type StoreType } from "@packages/common/types";
import { loadConfig } from "@packages/common/config";
import { getStoreTargets } from "@packages/common/store";

interface CheckLatestVersionsOptions {
  store?: StoreType;
  bundleId?: string;
  packageName?: string;
  includePrompt?: boolean; // Whether to include prompt message at the end
}

/**
 * Check latest versions from stores (unified interface)
 * Delegates to store-specific functions in their respective packages
 */
export async function checkLatestVersions(
  options: CheckLatestVersionsOptions
): Promise<string[]> {
  const { store, bundleId, packageName, includePrompt = true } = options;
  const { includeAppStore, includeGooglePlay } = getStoreTargets(store);
  const config = loadConfig();
  const versionInfo: string[] = [];

  versionInfo.push(`\n📋 Checking latest versions from stores...\n`);

  // Check App Store latest version
  if (includeAppStore && config.appStore && bundleId) {
    const appStoreInfo = await checkAppStoreLatestVersion({
      bundleId,
      config: config.appStore,
    });
    if (appStoreInfo) {
      versionInfo.push(appStoreInfo);
    }
  }

  // Check Google Play latest version
  if (includeGooglePlay && config.playStore && packageName) {
    const playStoreInfo = await checkGooglePlayLatestVersion({
      packageName,
      config: config.playStore,
    });
    if (playStoreInfo) {
      versionInfo.push(playStoreInfo);
    }
  }

  if (includePrompt) {
    versionInfo.push(
      `\n💡 To create a new version, please provide the 'version' parameter.`
    );
    versionInfo.push(
      `   Example: Call release-create tool with version="1.2.0".`
    );
  }

  return versionInfo;
}
