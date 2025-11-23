import { GooglePlayClient } from "../../../../packages/play-store";
import { AppStoreClient } from "../../../../packages/app-store";
import { type StoreType } from "../../../../packages/aso-core";
import { loadConfig, findApp } from "../../../../packages/core";

interface AsoCreateVersionOptions {
  app?: string; // 등록된 앱 slug
  packageName?: string; // Google Play용
  bundleId?: string; // App Store용
  version: string;
  store?: StoreType;
  versionCodes?: number[]; // Google Play용
}

export async function handleAsoCreateVersion(options: AsoCreateVersionOptions) {
  const { app, version, store = "both", versionCodes } = options;
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

  console.log(`\n📦 Creating version: ${version}`);
  console.log(`   Store: ${store}`);
  console.log(`   App: ${slug}`);
  if (packageName) console.log(`   Package Name: ${packageName}`);
  if (bundleId) console.log(`   Bundle ID: ${bundleId}`);
  if (versionCodes) {
    console.log(`   Version Codes: ${versionCodes.join(", ")}`);
  }
  console.log();

  const config = loadConfig();
  const results: string[] = [];

  if (store === "appStore" || store === "both") {
    if (!config.appStore) {
      results.push(`⏭️  Skipping App Store (not configured in secrets/aso-config.json)`);
    } else if (!bundleId) {
      results.push(`⏭️  Skipping App Store (no bundleId provided)`);
    } else {
      try {
        const client = new AppStoreClient({
          bundleId,
          issuerId: config.appStore.issuerId,
          keyId: config.appStore.keyId,
          privateKey: config.appStore.privateKey,
        });

        console.log(`📦 Creating App Store version ${version}...`);
        const createdVersion = await client.createNewVersion(version);
        const state = createdVersion.attributes.appStoreState?.toUpperCase();

        results.push(
          `✅ App Store version ${createdVersion.attributes.versionString} created` +
            (state ? ` (${state})` : "")
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push(`❌ App Store version creation failed: ${msg}`);
        console.error(`❌ App Store error:`, error);
      }
    }
  }

  if (store === "googlePlay" || store === "both") {
    if (!config.playStore) {
      results.push(`⏭️  Skipping Google Play (not configured in secrets/aso-config.json)`);
    } else if (!packageName) {
      results.push(`⏭️  Skipping Google Play (no packageName provided)`);
    } else if (!versionCodes || versionCodes.length === 0) {
      results.push(`⏭️  Skipping Google Play (no version codes provided)`);
    } else {
      try {
        const serviceAccount = JSON.parse(config.playStore.serviceAccountJson);
        const client = new GooglePlayClient({
          packageName,
          serviceAccountKey: serviceAccount,
        });

        console.log(`📦 Creating Google Play production release ${version}...`);
        await client.createProductionRelease({
          versionCodes,
          releaseName: version,
          status: "draft",
        });

        results.push(
          `✅ Google Play production draft created with versionCodes: ${versionCodes.join(", ")}`
        );
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        results.push(`❌ Google Play version creation failed: ${msg}`);
        console.error(`❌ Google Play error:`, error);
      }
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `📦 Version Creation Results:\n${results.join("\n")}`,
      },
    ],
  };
}
