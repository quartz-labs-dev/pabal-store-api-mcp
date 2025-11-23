import { GooglePlayClient } from "../../../../packages/play-store";
import { AppStoreClient } from "../../../../packages/app-store";
import {
  type StoreType,
  type GooglePlayMultilingualAsoData,
  type AppStoreMultilingualAsoData,
  isGooglePlayMultilingual,
  isAppStoreMultilingual,
  loadAsoFromCache,
  saveAsoToCache,
  prepareAsoDataForPush,
  convertToMultilingual,
} from "../../../../packages/aso-core";
import { loadConfig, findApp } from "../../../../packages/core";

interface AsoPushOptions {
  app?: string; // 등록된 앱 slug
  packageName?: string; // Google Play용
  bundleId?: string; // App Store용
  store?: StoreType;
  uploadImages?: boolean;
  dryRun?: boolean;
  cacheKey?: string; // 캐시에서 데이터를 가져올 키 (기본값: packageName 또는 bundleId)
}

export async function handleAsoPush(options: AsoPushOptions) {
  const { app, store = "both", uploadImages = false, dryRun = false, cacheKey } = options;
  let { packageName, bundleId } = options;

  // app slug로 앱 정보 조회
  if (app) {
    const registeredApp = findApp(app);
    if (!registeredApp) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ 앱 "${app}"을 찾을 수 없습니다. aso-list-apps로 등록된 앱을 확인하세요.`,
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
  }

  const identifier = cacheKey || packageName || bundleId || "unknown";

  console.log(`\n📤 Pushing ASO data`);
  console.log(`   Store: ${store}`);
  if (app) console.log(`   App: ${app}`);
  if (packageName) console.log(`   Package Name: ${packageName}`);
  if (bundleId) console.log(`   Bundle ID: ${bundleId}`);
  console.log(`   Upload Images: ${uploadImages ? "Yes" : "No"}`);
  console.log(`   Mode: ${dryRun ? "Dry run" : "Actual push"}\n`);

  const config = loadConfig();

  // Load local data from cache
  const configData = loadAsoFromCache(identifier);

  if (!configData.googlePlay && !configData.appStore) {
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ No ASO data found in cache for ${identifier}. Run aso:prepare first.`,
        },
      ],
    };
  }

  // Prepare data for push
  const localAsoData = prepareAsoDataForPush(identifier, configData);

  if (dryRun) {
    return {
      content: [
        {
          type: "text" as const,
          text: `📋 Dry run - Data that would be pushed:\n${JSON.stringify(localAsoData, null, 2)}`,
        },
      ],
    };
  }

  // Save to cache before pushing
  if (localAsoData.googlePlay || localAsoData.appStore) {
    saveAsoToCache(identifier, localAsoData);
  }

  const results: string[] = [];

  if (store === "googlePlay" || store === "both") {
    if (!config.playStore) {
      results.push(`⏭️  Skipping Google Play (not configured in secrets/aso-config.json)`);
    } else if (!packageName) {
      results.push(`⏭️  Skipping Google Play (no packageName provided)`);
    } else if (!localAsoData.googlePlay) {
      results.push(`⏭️  Skipping Google Play (no data in cache)`);
    } else {
      try {
        const serviceAccount = JSON.parse(config.playStore.serviceAccountJson);
        const client = new GooglePlayClient({
          packageName,
          serviceAccountKey: serviceAccount,
        });

        const googlePlayData: GooglePlayMultilingualAsoData = isGooglePlayMultilingual(
          localAsoData.googlePlay
        )
          ? localAsoData.googlePlay
          : convertToMultilingual(
              localAsoData.googlePlay,
              localAsoData.googlePlay.defaultLanguage
            );

        console.log(`📤 Pushing to Google Play...`);
        for (const [language, localeData] of Object.entries(googlePlayData.locales)) {
          console.log(`   📤 Pushing ${language}...`);
          await client.pushAsoData(localeData);
          console.log(`   ✅ ${language} uploaded`);
        }

        results.push(`✅ Google Play data pushed`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push(`❌ Google Play push failed: ${msg}`);
        console.error(`❌ Google Play push failed:`, error);
      }
    }
  }

  if (store === "appStore" || store === "both") {
    if (!config.appStore) {
      results.push(`⏭️  Skipping App Store (not configured in secrets/aso-config.json)`);
    } else if (!bundleId) {
      results.push(`⏭️  Skipping App Store (no bundleId provided)`);
    } else if (!localAsoData.appStore) {
      results.push(`⏭️  Skipping App Store (no data in cache)`);
    } else {
      try {
        const client = new AppStoreClient({
          bundleId,
          issuerId: config.appStore.issuerId,
          keyId: config.appStore.keyId,
          privateKey: config.appStore.privateKey,
        });

        const appStoreData: AppStoreMultilingualAsoData = isAppStoreMultilingual(
          localAsoData.appStore
        )
          ? localAsoData.appStore
          : convertToMultilingual(localAsoData.appStore, localAsoData.appStore.locale);

        console.log(`📤 Pushing to App Store...`);
        for (const [locale, localeData] of Object.entries(appStoreData.locales)) {
          console.log(`   📤 Pushing ${locale}...`);
          await client.pushAsoData(localeData);
          console.log(`   ✅ ${locale} uploaded`);
        }

        results.push(`✅ App Store data pushed`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);

        // Handle 409 STATE_ERROR - need to create new version with What's New
        if (msg.includes("409 Conflict") && msg.includes("STATE_ERROR")) {
          console.log(`\n🔄 STATE_ERROR detected. New version needed.`);

          // 새 버전 생성 시도
          try {
            const client = new AppStoreClient({
              bundleId: bundleId!,
              issuerId: config.appStore!.issuerId,
              keyId: config.appStore!.keyId,
              privateKey: config.appStore!.privateKey,
            });

            const newVersion = await client.createNewVersionWithAutoIncrement();
            const versionId = newVersion.id;
            const versionString = newVersion.attributes.versionString;

            const currentAppStoreData: AppStoreMultilingualAsoData = isAppStoreMultilingual(
              localAsoData.appStore!
            )
              ? localAsoData.appStore!
              : convertToMultilingual(localAsoData.appStore!, localAsoData.appStore!.locale);
            const locales = Object.keys(currentAppStoreData.locales);

            console.log(`✅ New version ${versionString} created.`);

            // 번역 요청 반환 - LLM이 번역 후 aso-update-whats-new 호출하도록 안내
            return {
              content: [
                {
                  type: "text" as const,
                  text: `🔄 App Store에 새 버전이 필요합니다.

✅ 새 버전 ${versionString} 생성됨 (Version ID: ${versionId})

📝 **What's New 번역이 필요합니다**

다음 로케일에 대해 What's New 텍스트를 번역해주세요:
${locales.join(", ")}

번역 완료 후 \`aso-update-whats-new\` 툴을 호출하세요:
\`\`\`json
{
  "bundleId": "${bundleId}",
  "versionId": "${versionId}",
  "whatsNew": {
    "en-US": "Bug fixes and improvements",
    "ko-KR": "버그 수정 및 개선",
    ...
  }
}
\`\`\`

What's New 업데이트 후 다시 \`aso-push\`를 호출하면 ASO 데이터가 푸시됩니다.`,
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
            const versionMsg = versionError instanceof Error ? versionError.message : String(versionError);
            results.push(`❌ App Store: 새 버전 생성 실패: ${versionMsg}`);
          }
        } else {
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
