import {
  checkLatestVersions,
  getStoreTargets,
  type StoreType,
} from "@packages/common";
import { findApp } from "@packages/utils";

interface CheckVersionsOptions {
  app?: string; // Registered app slug
  packageName?: string; // For Google Play
  bundleId?: string; // For App Store
  store?: StoreType;
}

export async function handleCheckLatestVersions(options: CheckVersionsOptions) {
  const { app, store } = options;
  let { packageName, bundleId } = options;
  const { store: selectedStore } = getStoreTargets(store);

  console.error(`[MCP] 🔍 Checking latest versions (store: ${selectedStore})`);

  // Determine bundleId and packageName
  let registeredApp = app ? findApp(app) : undefined;

  if (app && registeredApp) {
    // Successfully retrieved app info by app slug
    if (!packageName && registeredApp.googlePlay) {
      packageName = registeredApp.googlePlay.packageName;
    }
    if (!bundleId && registeredApp.appStore) {
      bundleId = registeredApp.appStore.bundleId;
    }
  } else if (packageName || bundleId) {
    // Find app by bundleId or packageName
    const identifier = packageName || bundleId || "";
    registeredApp = findApp(identifier);
    if (!registeredApp) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ App registered with "${identifier}" not found. Check registered apps using apps-search.`,
          },
        ],
      };
    }
    if (!packageName && registeredApp.googlePlay) {
      packageName = registeredApp.googlePlay.packageName;
    }
    if (!bundleId && registeredApp.appStore) {
      bundleId = registeredApp.appStore.bundleId;
    }
  } else {
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ App not found. Please provide app (slug), packageName, or bundleId.`,
        },
      ],
    };
  }

  // Check latest versions (without prompt message since this is a dedicated check tool)
  if (bundleId) console.error(`[MCP]   App Store bundleId: ${bundleId}`);
  if (packageName)
    console.error(`[MCP]   Google Play packageName: ${packageName}`);

  const versionInfo = await checkLatestVersions({
    store: selectedStore,
    bundleId,
    packageName,
    includePrompt: false,
  });

  console.error(`[MCP]   ✅ Version check completed`);

  return {
    content: [
      {
        type: "text" as const,
        text: versionInfo.join("\n"),
      },
    ],
  };
}
