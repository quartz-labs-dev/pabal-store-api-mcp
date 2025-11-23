/**
 * add-app: bundleId 또는 packageName으로 앱 등록
 */

import { getAppStoreClient } from "../../../../packages/app-store";
import { GooglePlayClient } from "../../../../packages/play-store";
import {
  loadConfig,
  registerApp,
  findApp,
  type RegisteredApp,
} from "../../../../packages/core";

interface AddAppOptions {
  /** 앱 식별자 (bundleId 또는 packageName) */
  identifier: string;
  /** 커스텀 slug (미지정시 identifier의 마지막 부분 사용) */
  slug?: string;
  /** 대상 스토어 (기본값: both - 둘 다 확인) */
  store?: "appStore" | "googlePlay" | "both";
}

/**
 * App Store에서 앱 정보 조회
 */
async function fetchAppStoreInfo(
  bundleId: string,
  config: ReturnType<typeof loadConfig>
): Promise<{ found: boolean; appId?: string; name?: string }> {
  if (!config.appStore) {
    return { found: false };
  }

  try {
    const client = getAppStoreClient({
      ...config.appStore,
      bundleId: "dummy",
    });

    const apps = await client.listAllApps({ onlyReleased: true });
    const app = apps.find((a) => a.bundleId === bundleId);

    if (app) {
      return { found: true, appId: app.id, name: app.name };
    }
    return { found: false };
  } catch {
    return { found: false };
  }
}

/**
 * Google Play에서 앱 정보 조회
 */
async function fetchGooglePlayInfo(
  packageName: string,
  config: ReturnType<typeof loadConfig>
): Promise<{ found: boolean; name?: string }> {
  if (!config.playStore?.serviceAccountJson) {
    return { found: false };
  }

  try {
    const serviceAccount = JSON.parse(config.playStore.serviceAccountJson);
    const client = new GooglePlayClient({
      packageName,
      serviceAccountKey: serviceAccount,
    });

    const appInfo = await client.verifyAppAccess();
    return { found: true, name: appInfo.title };
  } catch {
    return { found: false };
  }
}

/**
 * slug 생성 (identifier의 마지막 부분)
 */
function generateSlug(identifier: string): string {
  const parts = identifier.split(".");
  return parts[parts.length - 1].toLowerCase();
}

export async function handleAddApp(options: AddAppOptions) {
  const { identifier, slug: customSlug, store = "both" } = options;

  if (!identifier) {
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ identifier가 필요합니다.

사용법:
\`\`\`json
{ "identifier": "com.example.app" }
{ "identifier": "com.example.app", "slug": "myapp" }
{ "identifier": "com.example.app", "store": "googlePlay" }
\`\`\``,
        },
      ],
    };
  }

  // 이미 등록되어 있는지 확인
  const existing = findApp(identifier);
  if (existing) {
    return {
      content: [
        {
          type: "text" as const,
          text: `⏭️ 이미 등록된 앱입니다.

• Slug: \`${existing.slug}\`
• Name: ${existing.name}
• App Store: ${existing.appStore ? `✅ ${existing.appStore.bundleId}` : "❌"}
• Google Play: ${existing.googlePlay ? `✅ ${existing.googlePlay.packageName}` : "❌"}`,
        },
      ],
      _meta: { app: existing },
    };
  }

  const config = loadConfig();
  const slug = customSlug || generateSlug(identifier);

  // slug 중복 확인
  const slugExists = findApp(slug);
  if (slugExists) {
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ slug "${slug}"가 이미 사용 중입니다. 다른 slug를 지정해주세요.

\`\`\`json
{ "identifier": "${identifier}", "slug": "다른slug" }
\`\`\``,
        },
      ],
    };
  }

  // 스토어별 앱 정보 조회
  let appStoreInfo: RegisteredApp["appStore"] = undefined;
  let googlePlayInfo: RegisteredApp["googlePlay"] = undefined;
  let appName = identifier;

  const results: string[] = [];

  // App Store 조회
  if (store === "both" || store === "appStore") {
    const asResult = await fetchAppStoreInfo(identifier, config);
    if (asResult.found) {
      appStoreInfo = {
        bundleId: identifier,
        appId: asResult.appId,
        name: asResult.name,
      };
      appName = asResult.name || appName;
      results.push(`🍎 App Store: ✅ 발견 (${asResult.name})`);
    } else {
      results.push(`🍎 App Store: ❌ 없음`);
    }
  }

  // Google Play 조회
  if (store === "both" || store === "googlePlay") {
    const gpResult = await fetchGooglePlayInfo(identifier, config);
    if (gpResult.found) {
      googlePlayInfo = {
        packageName: identifier,
        name: gpResult.name,
      };
      appName = gpResult.name || appName;
      results.push(`🤖 Google Play: ✅ 발견 (${gpResult.name})`);
    } else {
      results.push(`🤖 Google Play: ❌ 없음`);
    }
  }

  // 최소 하나의 스토어에서 발견되어야 함
  if (!appStoreInfo && !googlePlayInfo) {
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ 앱을 찾을 수 없습니다.

**조회 결과:**
${results.map((r) => `  • ${r}`).join("\n")}

**확인사항:**
• identifier가 올바른지 확인하세요: \`${identifier}\`
• 해당 스토어에 앱이 등록되어 있는지 확인하세요
• 인증 설정이 올바른지 확인하세요 (auth-check 툴 사용)`,
        },
      ],
    };
  }

  // 앱 등록
  try {
    const newApp = registerApp({
      slug,
      name: appName,
      appStore: appStoreInfo,
      googlePlay: googlePlayInfo,
    });

    const storeIcons = [
      appStoreInfo ? "🍎" : null,
      googlePlayInfo ? "🤖" : null,
    ]
      .filter(Boolean)
      .join("+");

    return {
      content: [
        {
          type: "text" as const,
          text: `✅ 앱 등록 완료 (${storeIcons})

**등록 정보:**
• Slug: \`${newApp.slug}\`
• Name: ${newApp.name}
${appStoreInfo ? `• App Store: ${appStoreInfo.bundleId} (ID: ${appStoreInfo.appId})` : ""}
${googlePlayInfo ? `• Google Play: ${googlePlayInfo.packageName}` : ""}

**조회 결과:**
${results.map((r) => `  • ${r}`).join("\n")}

이제 다른 툴에서 \`app: "${slug}"\` 파라미터로 앱을 참조할 수 있습니다.`,
        },
      ],
      _meta: { app: newApp },
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ 앱 등록 실패: ${msg}`,
        },
      ],
    };
  }
}
