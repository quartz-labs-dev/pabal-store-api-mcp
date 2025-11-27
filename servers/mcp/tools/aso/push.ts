import { GooglePlayClient } from "@packages/play-store";
import { AppStoreClient, getAppStoreClient } from "@packages/app-store";
import { createAppStoreVersionWithAutoIncrement } from "@packages/app-store/create-version";
import {
  type StoreType,
  type GooglePlayMultilingualAsoData,
  type AppStoreMultilingualAsoData,
  isGooglePlayMultilingual,
  isAppStoreMultilingual,
  loadAsoData,
  saveAsoData,
  prepareAsoDataForPush,
  convertToMultilingual,
  getAsoDir,
} from "@packages/aso-core";
import { loadConfig, findApp } from "@packages/shared";
import { join } from "node:path";
import { existsSync } from "node:fs";

interface AsoPushOptions {
  app?: string; // Registered app slug
  packageName?: string; // For Google Play
  bundleId?: string; // For App Store
  store?: StoreType;
  uploadImages?: boolean;
  dryRun?: boolean;
}

export async function handleAsoPush(options: AsoPushOptions) {
  const { app, store = "both", uploadImages = false, dryRun = false } = options;
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

  console.error(`[MCP] 📤 Pushing ASO data`);
  console.error(`[MCP]   Store: ${store}`);
  console.error(`[MCP]   App: ${slug}`);
  if (packageName) console.error(`[MCP]   Package Name: ${packageName}`);
  if (bundleId) console.error(`[MCP]   Bundle ID: ${bundleId}`);
  console.error(`[MCP]   Upload Images: ${uploadImages ? "Yes" : "No"}`);
  console.error(`[MCP]   Mode: ${dryRun ? "Dry run" : "Actual push"}`);

  const config = loadConfig();

  // Load local data from ASO directory
  const asoDir = join(getAsoDir(), "pushData");
  console.error(`[MCP]   📁 ASO Directory: ${asoDir}`);
  console.error(`[MCP]   📁 Base ASO Dir: ${getAsoDir()}`);

  // Check expected file paths before loading
  const googlePlayDataPath = join(
    asoDir,
    "products",
    slug,
    "store",
    "google-play",
    "aso-data.json"
  );
  const appStoreDataPath = join(
    asoDir,
    "products",
    slug,
    "store",
    "app-store",
    "aso-data.json"
  );

  console.error(`[MCP]   🔍 Checking data files...`);
  console.error(`[MCP]     Google Play: ${googlePlayDataPath}`);
  console.error(
    `[MCP]       Exists: ${existsSync(googlePlayDataPath) ? "✅ Yes" : "❌ No"}`
  );
  console.error(`[MCP]     App Store: ${appStoreDataPath}`);
  console.error(
    `[MCP]       Exists: ${existsSync(appStoreDataPath) ? "✅ Yes" : "❌ No"}`
  );

  const configData = loadAsoData(slug, { asoDir });

  console.error(`[MCP]   📊 Loaded data status:`);
  console.error(
    `[MCP]     Google Play: ${
      configData.googlePlay ? "✅ Loaded" : "❌ Not found"
    }`
  );
  if (configData.googlePlay) {
    const gpData = configData.googlePlay;
    if (isGooglePlayMultilingual(gpData)) {
      const locales = Object.keys(gpData.locales);
      console.error(
        `[MCP]       Locales: ${locales.join(", ")} (${locales.length} total)`
      );
    } else {
      console.error(
        `[MCP]       Language: ${gpData.defaultLanguage || "unknown"}`
      );
    }
  }
  console.error(
    `[MCP]     App Store: ${configData.appStore ? "✅ Loaded" : "❌ Not found"}`
  );
  if (configData.appStore) {
    const asData = configData.appStore;
    if (isAppStoreMultilingual(asData)) {
      const locales = Object.keys(asData.locales);
      console.error(
        `[MCP]       Locales: ${locales.join(", ")} (${locales.length} total)`
      );
    } else {
      console.error(`[MCP]       Locale: ${asData.locale || "unknown"}`);
    }
  }

  if (!configData.googlePlay && !configData.appStore) {
    const errorDetails = [
      `❌ No ASO data found for ${slug}.`,
      ``,
      `📁 Expected paths:`,
      `   Google Play: ${googlePlayDataPath}`,
      `   App Store: ${appStoreDataPath}`,
      ``,
      `💡 To fix this:`,
      `   1. Run \`aso-pull\` to fetch data from stores`,
      `   2. Or ensure data exists at the paths above`,
      `   3. Check that PABAL_MCP_DATA_DIR is set correctly (current: ${getAsoDir()})`,
    ].join("\n");

    console.error(`[MCP]   ❌ ${errorDetails}`);
    return {
      content: [
        {
          type: "text" as const,
          text: errorDetails,
        },
      ],
    };
  }

  // Prepare data for push
  console.error(`[MCP]   🔄 Preparing data for push...`);
  const localAsoData = prepareAsoDataForPush(slug, configData);

  console.error(`[MCP]   📊 Prepared data status:`);
  console.error(
    `[MCP]     Google Play: ${
      localAsoData.googlePlay ? "✅ Ready" : "❌ Not available"
    }`
  );
  if (localAsoData.googlePlay) {
    const gpData = localAsoData.googlePlay;
    if (isGooglePlayMultilingual(gpData)) {
      const locales = Object.keys(gpData.locales);
      console.error(
        `[MCP]       Locales to push: ${locales.join(", ")} (${
          locales.length
        } total)`
      );
    }
  }
  console.error(
    `[MCP]     App Store: ${
      localAsoData.appStore ? "✅ Ready" : "❌ Not available"
    }`
  );
  if (localAsoData.appStore) {
    const asData = localAsoData.appStore;
    if (isAppStoreMultilingual(asData)) {
      const locales = Object.keys(asData.locales);
      console.error(
        `[MCP]       Locales to push: ${locales.join(", ")} (${
          locales.length
        } total)`
      );
    }
  }

  if (dryRun) {
    return {
      content: [
        {
          type: "text" as const,
          text: `📋 Dry run - Data that would be pushed:\n${JSON.stringify(
            localAsoData,
            null,
            2
          )}`,
        },
      ],
    };
  }

  // Save to ASO directory before pushing
  if (localAsoData.googlePlay || localAsoData.appStore) {
    saveAsoData(slug, localAsoData, { asoDir });
  }

  const results: string[] = [];

  if (store === "googlePlay" || store === "both") {
    if (!config.playStore) {
      results.push(
        `⏭️  Skipping Google Play (not configured in secrets/aso-config.json)`
      );
    } else if (!packageName) {
      results.push(`⏭️  Skipping Google Play (no packageName provided)`);
    } else if (!localAsoData.googlePlay) {
      console.error(
        `[MCP]   ⏭️  Skipping Google Play: No data found after preparation`
      );
      console.error(
        `[MCP]     Check if Google Play data exists in: ${googlePlayDataPath}`
      );
      results.push(`⏭️  Skipping Google Play (no data found)`);
    } else {
      try {
        const serviceAccount = JSON.parse(config.playStore.serviceAccountJson);
        const client = new GooglePlayClient({
          packageName,
          serviceAccountKey: serviceAccount,
        });

        const googlePlayData: GooglePlayMultilingualAsoData =
          isGooglePlayMultilingual(localAsoData.googlePlay)
            ? localAsoData.googlePlay
            : convertToMultilingual(
                localAsoData.googlePlay,
                localAsoData.googlePlay.defaultLanguage
              );

        const localesToPush = Object.keys(googlePlayData.locales);
        console.error(`[MCP]   📤 Pushing to Google Play...`);
        console.error(`[MCP]     Package: ${packageName}`);
        console.error(
          `[MCP]     Locales: ${localesToPush.join(", ")} (${
            localesToPush.length
          } total)`
        );
        for (const locale of localesToPush) {
          console.error(`[MCP]       📤 Preparing locale: ${locale}`);
        }

        // Use pushMultilingualAsoData to push all locales in a single edit session
        // This prevents backendError from rapid successive commits
        await client.pushMultilingualAsoData(googlePlayData);

        console.error(`[MCP]     ✅ Google Play upload complete per locale:`);
        for (const locale of localesToPush) {
          console.error(`[MCP]       ✅ ${locale}`);
        }

        results.push(
          `✅ Google Play data pushed (${localesToPush.length} locales)`
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error(`[MCP]   ❌ Google Play push failed`);
        console.error(`[MCP]     Error: ${msg}`);
        if (errorStack) {
          console.error(`[MCP]     Stack: ${errorStack}`);
        }

        // Extract detailed error info for response
        let detailedError = msg;
        if (error instanceof Error && "response" in error) {
          const responseData = (error as any).response?.data;
          console.error(
            `[MCP]     Response: ${JSON.stringify(
              (error as any).response,
              null,
              2
            )}`
          );
          if (responseData) {
            detailedError = `${msg}\n\nAPI Response:\n${JSON.stringify(
              responseData,
              null,
              2
            )}`;
          }
        }
        if ((error as any).errors) {
          detailedError = `${msg}\n\nError Details:\n${JSON.stringify(
            (error as any).errors,
            null,
            2
          )}`;
        }

        results.push(`❌ Google Play push failed: ${detailedError}`);
        console.error(`❌ Google Play push failed:`, error);
      }
    }
  }

  if (store === "appStore" || store === "both") {
    if (!config.appStore) {
      results.push(
        `⏭️  Skipping App Store (not configured in secrets/aso-config.json)`
      );
    } else if (!bundleId) {
      results.push(`⏭️  Skipping App Store (no bundleId provided)`);
    } else if (!localAsoData.appStore) {
      console.error(
        `[MCP]   ⏭️  Skipping App Store: No data found after preparation`
      );
      console.error(
        `[MCP]     Check if App Store data exists in: ${appStoreDataPath}`
      );
      results.push(`⏭️  Skipping App Store (no data found)`);
    } else {
      try {
        const client = new AppStoreClient({
          bundleId,
          issuerId: config.appStore.issuerId,
          keyId: config.appStore.keyId,
          privateKey: config.appStore.privateKey,
        });

        const appStoreData: AppStoreMultilingualAsoData =
          isAppStoreMultilingual(localAsoData.appStore)
            ? localAsoData.appStore
            : convertToMultilingual(
                localAsoData.appStore,
                localAsoData.appStore.locale
              );

        const localesToPush = Object.keys(appStoreData.locales);
        console.error(`[MCP]   📤 Pushing to App Store...`);
        console.error(`[MCP]     Bundle ID: ${bundleId}`);
        console.error(
          `[MCP]     Locales: ${localesToPush.join(", ")} (${
            localesToPush.length
          } total)`
        );

        for (const [locale, localeData] of Object.entries(
          appStoreData.locales
        )) {
          console.error(`[MCP]     📤 Pushing ${locale}...`);
          try {
            await client.pushAsoData(localeData);
            console.error(`[MCP]     ✅ ${locale} uploaded successfully`);
          } catch (localeError) {
            const localeMsg =
              localeError instanceof Error
                ? localeError.message
                : String(localeError);
            console.error(`[MCP]     ❌ ${locale} failed: ${localeMsg}`);
            throw localeError; // Re-throw to be caught by outer catch
          }
        }

        results.push(`✅ App Store data pushed`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);

        // Handle 409 STATE_ERROR - need to create new version with What's New
        if (msg.includes("409 Conflict") && msg.includes("STATE_ERROR")) {
          console.error(`[MCP]   🔄 STATE_ERROR detected. New version needed.`);

          // Try to create new version
          try {
            const client = getAppStoreClient({
              bundleId: bundleId!,
              issuerId: config.appStore!.issuerId,
              keyId: config.appStore!.keyId,
              privateKey: config.appStore!.privateKey,
            });

            const result = await createAppStoreVersionWithAutoIncrement({
              client,
            });
            const versionId = result.version.id;
            const versionString = result.version.attributes.versionString;

            const currentAppStoreData: AppStoreMultilingualAsoData =
              isAppStoreMultilingual(localAsoData.appStore!)
                ? localAsoData.appStore!
                : convertToMultilingual(
                    localAsoData.appStore!,
                    localAsoData.appStore!.locale
                  );
            const locales = Object.keys(currentAppStoreData.locales);

            console.error(`[MCP]     ✅ New version ${versionString} created.`);

            // Return translation request - guide LLM to translate then call aso-update-whats-new
            return {
              content: [
                {
                  type: "text" as const,
                  text: `🔄 New version required for App Store.

✅ New version ${versionString} created (Version ID: ${versionId})

📝 **What's New translation required**

Please translate What's New text for the following locales:
${locales.join(", ")}

After translation is complete, call the \`aso-update-whats-new\` tool:
\`\`\`json
{
  "bundleId": "${bundleId}",
  "versionId": "${versionId}",
  "whatsNew": {
    "en-US": "Bug fixes and improvements",
    "ko-KR": "Bug fixes and improvements",
    ...
  }
}
\`\`\`

After updating What's New, call \`aso-push\` again to push ASO data.`,
                },
              ],
              _meta: {
                needsTranslation: true,
                versionId,
                versionString,
                bundleId,
                locales,
              },
            };
          } catch (versionError) {
            const versionMsg =
              versionError instanceof Error
                ? versionError.message
                : String(versionError);
            results.push(
              `❌ App Store: Failed to create new version: ${versionMsg}`
            );
          }
        } else {
          const errorStack = error instanceof Error ? error.stack : undefined;
          console.error(`[MCP]   ❌ App Store push failed`);
          console.error(`[MCP]     Error: ${msg}`);
          if (errorStack) {
            console.error(`[MCP]     Stack: ${errorStack}`);
          }
          if (error instanceof Error && "response" in error) {
            console.error(
              `[MCP]     Response: ${JSON.stringify(
                (error as any).response,
                null,
                2
              )}`
            );
          }
          results.push(`❌ App Store push failed: ${msg}`);
        }

        console.error(`❌ App Store push failed:`, error);
      }
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `📤 ASO Push Results:\n${results.join("\n")}`,
      },
    ],
  };
}
