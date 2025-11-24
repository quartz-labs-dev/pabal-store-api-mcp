import {
  type StoreType,
  type GooglePlayReleaseNote,
  type AppStoreReleaseNote,
  ensureDir,
  getAsoDir,
} from "@packages/aso-core";
import { loadConfig, findApp } from "@packages/shared";
import { pullAppStoreReleaseNotes } from "@packages/app-store/pull-release-notes";
import { pullGooglePlayReleaseNotes } from "@packages/play-store/pull-release-notes";
import { getAppStoreClient } from "@packages/app-store";
import { GooglePlayClient } from "@packages/play-store";
import { join } from "node:path";
import { writeFileSync } from "node:fs";

interface AsoPullReleaseNotesOptions {
  app?: string; // Registered app slug
  packageName?: string; // For Google Play
  bundleId?: string; // For App Store
  store?: StoreType;
  dryRun?: boolean;
}

export async function handleAsoPullReleaseNotes(
  options: AsoPullReleaseNotesOptions
) {
  const { app, store = "both", dryRun = false } = options;
  let { packageName, bundleId } = options;

  // Determine slug
  let slug: string;
  let registeredApp = app ? findApp(app) : undefined;

  if (app && registeredApp) {
    // Successfully retrieved app info by app slug
    slug = app;
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
    slug = registeredApp.slug;
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

  console.error(`[MCP] 📥 Pulling release notes`);
  console.error(`[MCP]   Store: ${store}`);
  console.error(`[MCP]   App: ${slug}`);
  if (packageName) console.error(`[MCP]   Package Name: ${packageName}`);
  if (bundleId) console.error(`[MCP]   Bundle ID: ${bundleId}`);
  console.error(`[MCP]   Mode: ${dryRun ? "Dry run" : "Actual fetch"}`);

  const config = loadConfig();

  const releaseNotes: {
    googlePlay?: GooglePlayReleaseNote[];
    appStore?: AppStoreReleaseNote[];
  } = {};

  if (store === "googlePlay" || store === "both") {
    if (!config.playStore) {
      console.error(
        `[MCP]   ⏭️  Skipping Google Play (not configured in secrets/aso-config.json)`
      );
    } else if (!packageName) {
      console.error(
        `[MCP]   ⏭️  Skipping Google Play (no packageName provided)`
      );
    } else {
      try {
        const serviceAccount = JSON.parse(config.playStore.serviceAccountJson);
        const client = new GooglePlayClient({
          packageName,
          serviceAccountKey: serviceAccount,
        });

        console.error(`[MCP]   📥 Fetching release notes from Google Play...`);
        const result = await pullGooglePlayReleaseNotes({ client });
        releaseNotes.googlePlay = result.releaseNotes;

        console.error(`[MCP]   📊 Google Play Release Notes:`);
        console.error(
          `[MCP]     Total versions: ${result.releaseNotes.length}`
        );
        for (const rn of result.releaseNotes) {
          console.error(
            `[MCP]     Version ${rn.versionName} (${rn.versionCode}): ${
              Object.keys(rn.releaseNotes).length
            } languages`
          );
        }
        console.error(`[MCP]   ✅ Google Play release notes fetched`);
      } catch (error) {
        console.error(`[MCP]   ❌ Google Play fetch failed:`, error);
      }
    }
  }

  if (store === "appStore" || store === "both") {
    if (!config.appStore) {
      console.error(
        `[MCP]   ⏭️  Skipping App Store (not configured in secrets/aso-config.json)`
      );
    } else if (!bundleId) {
      console.error(`[MCP]   ⏭️  Skipping App Store (no bundleId provided)`);
    } else {
      try {
        const client = getAppStoreClient({
          bundleId,
          issuerId: config.appStore.issuerId,
          keyId: config.appStore.keyId,
          privateKey: config.appStore.privateKey,
        });

        console.error(`[MCP]   📥 Fetching release notes from App Store...`);
        const result = await pullAppStoreReleaseNotes({ client });
        releaseNotes.appStore = result.releaseNotes;

        console.error(`[MCP]   📊 App Store Release Notes:`);
        console.error(
          `[MCP]     Total versions: ${result.releaseNotes.length}`
        );
        for (const rn of result.releaseNotes) {
          console.error(
            `[MCP]     Version ${rn.versionString}: ${
              Object.keys(rn.releaseNotes).length
            } locales`
          );
        }
        console.error(`[MCP]   ✅ App Store release notes fetched`);
      } catch (error) {
        console.error(`[MCP]   ❌ App Store fetch failed:`, error);
      }
    }
  }

  if (dryRun) {
    return {
      content: [
        {
          type: "text" as const,
          text: `📋 Dry run - Release notes:\n${JSON.stringify(
            releaseNotes,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Save to ASO directory
  const asoDir = join(getAsoDir(), "pullData", "products", slug, "store");

  if (releaseNotes.googlePlay) {
    const googlePlayDir = join(asoDir, "google-play");
    ensureDir(googlePlayDir);
    const filePath = join(googlePlayDir, "release-notes.json");
    writeFileSync(filePath, JSON.stringify(releaseNotes.googlePlay, null, 2));
    console.error(`[MCP]   💾 Google Play release notes saved to ${filePath}`);
  }

  if (releaseNotes.appStore) {
    const appStoreDir = join(asoDir, "app-store");
    ensureDir(appStoreDir);
    const filePath = join(appStoreDir, "release-notes.json");
    writeFileSync(filePath, JSON.stringify(releaseNotes.appStore, null, 2));
    console.error(`[MCP]   💾 App Store release notes saved to ${filePath}`);
  }

  return {
    content: [
      {
        type: "text" as const,
        text:
          `✅ Release notes pulled\n` +
          `   Google Play: ${
            releaseNotes.googlePlay
              ? `${releaseNotes.googlePlay.length} versions`
              : "✗"
          }\n` +
          `   App Store: ${
            releaseNotes.appStore
              ? `${releaseNotes.appStore.length} versions`
              : "✗"
          }`,
      },
    ],
  };
}
