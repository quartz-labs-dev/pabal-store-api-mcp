/**
 * setup-apps: 스토어에서 앱 조회 후 자동 등록
 */

import { getAppStoreClient } from "../../../../packages/app-store";
import { GooglePlayClient } from "../../../../packages/play-store";
import {
  loadConfig,
  registerApp,
  findApp,
  loadRegisteredApps,
  saveRegisteredApps,
  type RegisteredApp,
} from "../../../../packages/core";

interface SetupAppsOptions {
  store?: "appStore" | "googlePlay" | "both";
  packageName?: string; // Google Play용 - 목록 조회 불가하므로 특정 앱 확인용
}

/**
 * Play Store 접근 가능 여부 확인
 */
async function checkPlayStoreAccess(
  packageName: string,
  serviceAccountKey: object
): Promise<{ accessible: boolean; title?: string }> {
  try {
    const client = new GooglePlayClient({
      packageName,
      serviceAccountKey,
    });
    const appInfo = await client.verifyAppAccess();
    return { accessible: true, title: appInfo.title };
  } catch {
    return { accessible: false };
  }
}

export async function handleSetupApps(options: SetupAppsOptions) {
  const { store = "both", packageName } = options;
  const config = loadConfig();

  // both: App Store 앱 조회 후 Play Store 확인
  if (store === "both" || store === "appStore") {
    if (!config.appStore) {
      return {
        content: [
          {
            type: "text" as const,
            text: "❌ App Store 인증이 설정되지 않았습니다. secrets/aso-config.json을 확인하세요.",
          },
        ],
      };
    }

    try {
      const client = getAppStoreClient({
        ...config.appStore,
        bundleId: "dummy", // listAllApps()는 bundleId를 사용하지 않음
      });

      const apps = await client.listAllApps({ onlyReleased: true });

      if (apps.length === 0) {
        return {
          content: [
            {
              type: "text" as const,
              text: "📱 App Store에 등록된 앱이 없습니다.",
            },
          ],
        };
      }

      // Play Store 서비스 계정 준비
      const playStoreEnabled =
        store === "both" && config.playStore?.serviceAccountJson;
      const serviceAccountKey = playStoreEnabled
        ? JSON.parse(config.playStore!.serviceAccountJson)
        : null;

      // 자동 등록
      const registered: string[] = [];
      const skipped: string[] = [];
      const playStoreFound: string[] = [];
      const playStoreNotFound: string[] = [];

      for (const app of apps) {
        // bundleId의 마지막 부분만 slug로 사용 (com.quartz.postblackbelt -> postblackbelt)
        const parts = app.bundleId.split(".");
        const slug = parts[parts.length - 1].toLowerCase();

        // 이미 등록되어 있는지 확인 (findApp은 slug, bundleId, packageName 모두 검색)
        const existing = findApp(app.bundleId);
        if (existing) {
          // 기존 앱이 있고 both 모드면 Play Store 정보 업데이트 시도
          if (playStoreEnabled && !existing.googlePlay) {
            const playResult = await checkPlayStoreAccess(
              app.bundleId,
              serviceAccountKey
            );
            if (playResult.accessible) {
              // 기존 앱에 googlePlay 정보 추가
              const appsConfig = loadRegisteredApps();
              const appIndex = appsConfig.apps.findIndex(
                (a) => a.slug === existing.slug
              );
              if (appIndex >= 0) {
                appsConfig.apps[appIndex].googlePlay = {
                  packageName: app.bundleId,
                  name: playResult.title,
                };
                saveRegisteredApps(appsConfig);
                playStoreFound.push(`${app.name} → Play Store 정보 추가됨`);
              }
            } else {
              playStoreNotFound.push(app.name);
            }
          }
          skipped.push(`${app.name} (${app.bundleId}) - 이미 등록됨`);
          continue;
        }

        // Play Store 확인 (both 모드일 때)
        let googlePlayInfo: RegisteredApp["googlePlay"] = undefined;
        if (playStoreEnabled) {
          const playResult = await checkPlayStoreAccess(
            app.bundleId,
            serviceAccountKey
          );
          if (playResult.accessible) {
            googlePlayInfo = {
              packageName: app.bundleId,
              name: playResult.title,
            };
            playStoreFound.push(app.name);
          } else {
            playStoreNotFound.push(app.name);
          }
        }

        try {
          registerApp({
            slug,
            name: app.name,
            appStore: {
              bundleId: app.bundleId,
              appId: app.id,
              name: app.name,
            },
            googlePlay: googlePlayInfo,
          });

          const storeInfo = googlePlayInfo ? " (🍎+🤖)" : " (🍎)";
          registered.push(`${app.name}${storeInfo} → slug: "${slug}"`);
        } catch (error) {
          skipped.push(`${app.name} (${app.bundleId}) - 등록 실패`);
        }
      }

      const lines = [`📱 **앱 설정 완료**\n`];

      if (registered.length > 0) {
        lines.push(`✅ **등록됨** (${registered.length}개):`);
        for (const r of registered) {
          lines.push(`  • ${r}`);
        }
        lines.push("");
      }

      if (skipped.length > 0) {
        lines.push(`⏭️ **스킵** (${skipped.length}개):`);
        for (const s of skipped) {
          lines.push(`  • ${s}`);
        }
        lines.push("");
      }

      if (playStoreEnabled) {
        lines.push(`**Play Store 확인 결과:**`);
        lines.push(`  🤖 있음: ${playStoreFound.length}개`);
        if (playStoreFound.length > 0) {
          for (const name of playStoreFound) {
            lines.push(`    • ${name}`);
          }
        }
        lines.push(`  ❌ 없음: ${playStoreNotFound.length}개`);
        if (playStoreNotFound.length > 0) {
          for (const name of playStoreNotFound) {
            lines.push(`    • ${name}`);
          }
        }
        lines.push("");
      }

      lines.push(
        "이제 다른 툴에서 `app: \"slug\"` 파라미터로 앱을 참조할 수 있습니다."
      );

      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        _meta: {
          registered: registered.length,
          skipped: skipped.length,
          playStoreFound: playStoreFound.length,
          playStoreNotFound: playStoreNotFound.length,
          apps,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ App Store 앱 조회 실패: ${msg}`,
          },
        ],
      };
    }
  }

  if (store === "googlePlay") {
    if (!config.playStore) {
      return {
        content: [
          {
            type: "text" as const,
            text: "❌ Google Play 인증이 설정되지 않았습니다. secrets/aso-config.json을 확인하세요.",
          },
        ],
      };
    }

    if (!packageName) {
      return {
        content: [
          {
            type: "text" as const,
            text: `⚠️ Google Play API는 앱 목록 조회를 지원하지 않습니다.

packageName을 제공하면 해당 앱을 확인하고 등록합니다:
\`\`\`json
{ "store": "googlePlay", "packageName": "com.example.app" }
\`\`\``,
          },
        ],
      };
    }

    try {
      const serviceAccount = JSON.parse(config.playStore.serviceAccountJson);
      const client = new GooglePlayClient({
        packageName,
        serviceAccountKey: serviceAccount,
      });

      const appInfo = await client.verifyAppAccess();

      // packageName의 마지막 부분만 slug로 사용 (com.quartz.postblackbelt -> postblackbelt)
      const parts = packageName.split(".");
      const slug = parts[parts.length - 1].toLowerCase();

      // 이미 등록되어 있는지 확인 (findApp은 slug, bundleId, packageName 모두 검색)
      const existing = findApp(packageName);
      if (existing) {
        return {
          content: [
            {
              type: "text" as const,
              text: `⏭️ 앱이 이미 등록되어 있습니다: "${existing.slug}"`,
            },
          ],
          _meta: { app: existing },
        };
      }

      // 등록
      const newApp = registerApp({
        slug,
        name: appInfo.title || packageName,
        googlePlay: {
          packageName,
          name: appInfo.title,
        },
      });

      return {
        content: [
          {
            type: "text" as const,
            text: `✅ Google Play 앱 등록 완료

• Package Name: \`${packageName}\`
• Slug: \`${slug}\`
• Name: ${newApp.name}

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
            text: `❌ Google Play 앱 접근 실패: ${msg}`,
          },
        ],
      };
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: "❌ store 파라미터는 'appStore', 'googlePlay', 'both'여야 합니다.",
      },
    ],
  };
}
