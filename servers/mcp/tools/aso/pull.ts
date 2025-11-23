import { GooglePlayClient } from "../../../../packages/play-store";
import { AppStoreClient } from "../../../../packages/app-store";
import {
  type AsoData,
  type StoreType,
  isGooglePlayMultilingual,
  isAppStoreMultilingual,
  saveAsoData,
  getAsoDir,
  downloadImage,
  copyLocalAssetToAso,
  isLocalAssetPath,
  resolveAppStoreImageUrl,
  convertToMultilingual,
} from "../../../../packages/aso-core";
import { loadConfig, getDataDir, findApp } from "../../../../packages/core";
import { join } from "node:path";

interface AsoPullOptions {
  app?: string; // 등록된 앱 slug
  packageName?: string; // Google Play용
  bundleId?: string; // App Store용
  store?: StoreType;
  dryRun?: boolean;
}

async function downloadScreenshotsToAso(
  slug: string,
  asoData: AsoData,
  asoDir: string
): Promise<void> {
  const productStoreRoot = join(asoDir, "products", slug, "store");

  if (asoData.googlePlay) {
    const googlePlayData = isGooglePlayMultilingual(asoData.googlePlay)
      ? asoData.googlePlay
      : convertToMultilingual(
          asoData.googlePlay,
          asoData.googlePlay.defaultLanguage
        );

    const languages = Object.keys(googlePlayData.locales);
    const defaultLanguage = googlePlayData.defaultLocale;
    const targetLanguage =
      (defaultLanguage && googlePlayData.locales[defaultLanguage]
        ? defaultLanguage
        : languages[0]) || null;

    if (targetLanguage) {
      const localeData = googlePlayData.locales[targetLanguage];
      const screenshotDir = join(
        productStoreRoot,
        "google-play",
        "screenshots",
        targetLanguage
      );

      if (localeData.screenshots.phone?.length > 0) {
        console.log(
          `📥 Downloading ${localeData.screenshots.phone.length} Google Play phone screenshots...`
        );
        for (let i = 0; i < localeData.screenshots.phone.length; i++) {
          const url = localeData.screenshots.phone[i];
          const outputPath = join(screenshotDir, `phone-${i + 1}.png`);
          if (isLocalAssetPath(url)) {
            copyLocalAssetToAso(url, outputPath);
          } else {
            await downloadImage(url, outputPath);
          }
          console.log(`   ✅ phone-${i + 1}.png`);
        }
      }

      if (localeData.featureGraphic) {
        console.log(`📥 Downloading Feature Graphic...`);
        const outputPath = join(screenshotDir, "feature-graphic.png");
        if (isLocalAssetPath(localeData.featureGraphic)) {
          copyLocalAssetToAso(localeData.featureGraphic, outputPath);
        } else {
          await downloadImage(localeData.featureGraphic, outputPath);
        }
        console.log(`   ✅ feature-graphic.png`);
      }
    }
  }

  if (asoData.appStore) {
    const appStoreData = isAppStoreMultilingual(asoData.appStore)
      ? asoData.appStore
      : convertToMultilingual(asoData.appStore, asoData.appStore.locale);

    const locales = Object.keys(appStoreData.locales);
    const defaultLocale = appStoreData.defaultLocale;
    const targetLocale =
      (defaultLocale && appStoreData.locales[defaultLocale]
        ? defaultLocale
        : locales[0]) || null;

    if (targetLocale) {
      const localeData = appStoreData.locales[targetLocale];
      const screenshotDir = join(
        productStoreRoot,
        "app-store",
        "screenshots",
        targetLocale
      );

      const screenshotTypes = ["iphone65", "iphone61", "ipadPro129"] as const;

      for (const type of screenshotTypes) {
        const screenshots = localeData.screenshots[type];
        if (screenshots && screenshots.length > 0) {
          console.log(
            `📥 Downloading ${screenshots.length} App Store ${type} screenshots...`
          );
          for (let i = 0; i < screenshots.length; i++) {
            let url = screenshots[i];
            const outputPath = join(screenshotDir, `${type}-${i + 1}.png`);

            if (isLocalAssetPath(url)) {
              copyLocalAssetToAso(url, outputPath);
            } else {
              if (url.includes("{w}") || url.includes("{h}")) {
                url = resolveAppStoreImageUrl(url);
              }
              await downloadImage(url, outputPath);
            }
            console.log(`   ✅ ${type}-${i + 1}.png`);
          }
        }
      }
    }
  }
}

export async function handleAsoPull(options: AsoPullOptions) {
  const { app, store = "both", dryRun = false } = options;
  let { packageName, bundleId } = options;

  // slug 결정
  let slug: string;
  let registeredApp = app ? findApp(app) : undefined;

  if (app && registeredApp) {
    // app slug로 앱 정보 조회 성공
    slug = app;
    if (!packageName && registeredApp.googlePlay) {
      packageName = registeredApp.googlePlay.packageName;
    }
    if (!bundleId && registeredApp.appStore) {
      bundleId = registeredApp.appStore.bundleId;
    }
  } else if (packageName || bundleId) {
    // bundleId나 packageName으로 앱 찾기
    const identifier = packageName || bundleId || "";
    registeredApp = findApp(identifier);
    if (!registeredApp) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ "${identifier}"로 등록된 앱을 찾을 수 없습니다. apps-search로 등록된 앱을 확인하세요.`,
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
          text: `❌ 앱을 찾을 수 없습니다. app (slug), packageName, 또는 bundleId를 제공해주세요.`,
        },
      ],
    };
  }

  console.log(`\n📥 Pulling ASO data`);
  console.log(`   Store: ${store}`);
  console.log(`   App: ${slug}`);
  if (packageName) console.log(`   Package Name: ${packageName}`);
  if (bundleId) console.log(`   Bundle ID: ${bundleId}`);
  console.log(`   Mode: ${dryRun ? "Dry run" : "Actual fetch"}\n`);

  const config = loadConfig();
  const syncedData: AsoData = {};

  if (store === "googlePlay" || store === "both") {
    if (!config.playStore) {
      console.log(
        `⏭️  Skipping Google Play (not configured in secrets/aso-config.json)`
      );
    } else if (!packageName) {
      console.log(`⏭️  Skipping Google Play (no packageName provided)`);
    } else {
      try {
        const serviceAccount = JSON.parse(config.playStore.serviceAccountJson);
        const client = new GooglePlayClient({
          packageName,
          serviceAccountKey: serviceAccount,
        });

        console.log(`📥 Fetching from Google Play...`);
        const data = await client.pullAllLanguagesAsoData();
        syncedData.googlePlay = data;
        console.log(`✅ Google Play data fetched`);
      } catch (error) {
        console.error(`❌ Google Play fetch failed:`, error);
      }
    }
  }

  if (store === "appStore" || store === "both") {
    if (!config.appStore) {
      console.log(
        `⏭️  Skipping App Store (not configured in secrets/aso-config.json)`
      );
    } else if (!bundleId) {
      console.log(`⏭️  Skipping App Store (no bundleId provided)`);
    } else {
      try {
        const client = new AppStoreClient({
          bundleId,
          issuerId: config.appStore.issuerId,
          keyId: config.appStore.keyId,
          privateKey: config.appStore.privateKey,
        });

        console.log(`📥 Fetching from App Store...`);
        const data = await client.pullAllLocalesAsoData();
        syncedData.appStore = data;
        console.log(`✅ App Store data fetched`);
      } catch (error) {
        console.error(`❌ App Store fetch failed:`, error);
      }
    }
  }

  if (dryRun) {
    return {
      content: [
        {
          type: "text" as const,
          text: `📋 Dry run - Data that would be saved:\n${JSON.stringify(
            syncedData,
            null,
            2
          )}`,
        },
      ],
    };
  }

  const asoDir = join(getAsoDir(), "pullData");
  saveAsoData(slug, syncedData, { asoDir });
  await downloadScreenshotsToAso(
    slug,
    syncedData,
    join(getDataDir(), ".aso", "pullData")
  );

  return {
    content: [
      {
        type: "text" as const,
        text:
          `✅ ASO data pulled\n` +
          `   Google Play: ${syncedData.googlePlay ? "✓" : "✗"}\n` +
          `   App Store: ${syncedData.appStore ? "✓" : "✗"}`,
      },
    ],
  };
}
