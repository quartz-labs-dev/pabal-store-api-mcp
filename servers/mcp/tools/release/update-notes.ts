/**
 * 릴리즈 노트 업데이트 툴
 *
 * App Store와 Google Play 모두 지원합니다.
 */

type StoreType = "googlePlay" | "appStore" | "both";

interface UpdateNotesOptions {
  app?: string;
  bundleId?: string;
  packageName?: string;
  store?: StoreType;
  versionId?: string;
  whatsNew: Record<string, string>;
}

export async function handleUpdateNotes(options: UpdateNotesOptions) {
  const { app, versionId, whatsNew, store = "both" } = options;
  let { bundleId, packageName } = options;

  // app slug로 앱 정보 조회
  if (app) {
    const { findApp } = await import("../../../../packages/core");
    const registeredApp = findApp(app);
    if (!registeredApp) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ 앱 "${app}"을 찾을 수 없습니다. apps:init으로 등록된 앱을 확인하세요.`,
          },
        ],
      };
    }
    if (!bundleId && registeredApp.appStore) {
      bundleId = registeredApp.appStore.bundleId;
    }
    if (!packageName && registeredApp.googlePlay) {
      packageName = registeredApp.googlePlay.packageName;
    }
  }

  if (!bundleId && !packageName) {
    return {
      content: [
        {
          type: "text" as const,
          text: "❌ bundleId, packageName 또는 app이 필요합니다.",
        },
      ],
    };
  }

  if (!whatsNew || Object.keys(whatsNew).length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "❌ whatsNew 데이터가 필요합니다. 형식: { \"en-US\": \"텍스트\", \"ko\": \"텍스트\" }",
        },
      ],
    };
  }

  const { loadConfig } = await import("../../../../packages/core");
  const config = loadConfig();

  const results: string[] = [];
  const appStoreResults: string[] = [];
  const googlePlayResults: string[] = [];

  // App Store 업데이트
  if ((store === "both" || store === "appStore") && bundleId) {
    if (!config.appStore) {
      appStoreResults.push("❌ App Store 인증 정보가 설정되지 않았습니다.");
    } else {
      try {
        const { AppStoreClient } = await import("../../../../packages/app-store");
        const client = new AppStoreClient({
          bundleId,
          issuerId: config.appStore.issuerId,
          keyId: config.appStore.keyId,
          privateKey: config.appStore.privateKey,
        });

        let targetVersionId = versionId;
        if (!targetVersionId) {
          const versions = await client.getAllVersions();
          const editableVersion = versions.find(
            (v) => v.attributes.appStoreState === "PREPARE_FOR_SUBMISSION"
          );
          if (!editableVersion) {
            appStoreResults.push("❌ 편집 가능한 버전이 없습니다.");
          } else {
            targetVersionId = editableVersion.id;
          }
        }

        if (targetVersionId) {
          for (const [locale, text] of Object.entries(whatsNew)) {
            try {
              await client.updateWhatsNew({
                versionId: targetVersionId,
                locale,
                whatsNew: text,
              });
              appStoreResults.push(`✅ ${locale}`);
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              appStoreResults.push(`❌ ${locale}: ${msg}`);
            }
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        appStoreResults.push(`❌ App Store 오류: ${msg}`);
      }
    }
  }

  // Google Play 업데이트
  if ((store === "both" || store === "googlePlay") && packageName) {
    if (!config.playStore?.serviceAccountJson) {
      googlePlayResults.push("❌ Google Play 인증 정보가 설정되지 않았습니다.");
    } else {
      try {
        const { GooglePlayClient } = await import("../../../../packages/play-store");
        const serviceAccount = JSON.parse(config.playStore.serviceAccountJson);
        const client = new GooglePlayClient({
          packageName,
          serviceAccountKey: serviceAccount,
        });

        const result = await client.updateReleaseNotes({
          releaseNotes: whatsNew,
          track: "production",
        });

        if (result.updated.length > 0) {
          googlePlayResults.push(`✅ ${result.updated.join(", ")}`);
        }
        for (const fail of result.failed) {
          googlePlayResults.push(`❌ ${fail.locale}: ${fail.error}`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        googlePlayResults.push(`❌ Google Play 오류: ${msg}`);
      }
    }
  }

  // 결과 조합
  if (appStoreResults.length > 0) {
    results.push(`**🍎 App Store:**`);
    results.push(...appStoreResults.map(r => `  ${r}`));
  }
  if (googlePlayResults.length > 0) {
    results.push(`**🤖 Google Play:**`);
    results.push(...googlePlayResults.map(r => `  ${r}`));
  }

  if (results.length === 0) {
    return {
      content: [
        {
          type: "text" as const,
          text: "⚠️ 업데이트할 스토어가 없습니다. bundleId 또는 packageName을 확인하세요.",
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `📝 릴리즈 노트 업데이트 결과:\n\n${results.join("\n")}`,
      },
    ],
  };
}
