/**
 * apps-search: 등록된 앱 검색
 *
 * registered-apps.json에서 앱을 검색합니다.
 * - query 없이 호출: 모든 앱 목록 반환
 * - query와 함께 호출: slug, bundleId, packageName, name으로 검색
 */

import {
  loadRegisteredApps,
  findApp,
  type RegisteredApp,
} from "../../../../packages/core";

interface SearchAppsOptions {
  /** 검색어 (slug, bundleId, packageName, name). 비워두면 모든 앱 반환 */
  query?: string;
  /** 스토어 필터 (기본값: all) */
  store?: "all" | "appStore" | "googlePlay";
}

/**
 * 앱이 검색어와 매칭되는지 확인
 */
function matchesQuery(app: RegisteredApp, query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // slug 매칭
  if (app.slug.toLowerCase().includes(lowerQuery)) return true;

  // name 매칭
  if (app.name.toLowerCase().includes(lowerQuery)) return true;

  // App Store bundleId 매칭
  if (app.appStore?.bundleId?.toLowerCase().includes(lowerQuery)) return true;

  // App Store name 매칭
  if (app.appStore?.name?.toLowerCase().includes(lowerQuery)) return true;

  // Google Play packageName 매칭
  if (app.googlePlay?.packageName?.toLowerCase().includes(lowerQuery))
    return true;

  // Google Play name 매칭
  if (app.googlePlay?.name?.toLowerCase().includes(lowerQuery)) return true;

  return false;
}

/**
 * 스토어 필터 적용
 */
function filterByStore(
  apps: RegisteredApp[],
  store: "all" | "appStore" | "googlePlay"
): RegisteredApp[] {
  if (store === "all") return apps;

  return apps.filter((app) => {
    if (store === "appStore") return !!app.appStore;
    if (store === "googlePlay") return !!app.googlePlay;
    return true;
  });
}

/**
 * 앱 정보를 포맷팅
 */
function formatAppInfo(app: RegisteredApp): string {
  const lines: string[] = [];

  lines.push(`📱 **${app.name}** (\`${app.slug}\`)`);

  if (app.appStore) {
    lines.push(`   🍎 App Store: \`${app.appStore.bundleId}\``);
    if (app.appStore.appId) {
      lines.push(`      App ID: ${app.appStore.appId}`);
    }
  }

  if (app.googlePlay) {
    lines.push(`   🤖 Google Play: \`${app.googlePlay.packageName}\``);
  }

  return lines.join("\n");
}

export async function handleSearchApps(options: SearchAppsOptions) {
  const { query, store = "all" } = options;

  try {
    const config = loadRegisteredApps();
    let results: RegisteredApp[];

    if (!query) {
      // 검색어 없으면 전체 목록
      results = config.apps;
    } else {
      // 정확한 매칭 우선 시도
      const exactMatch = findApp(query);
      if (exactMatch) {
        results = [exactMatch];
      } else {
        // 부분 매칭
        results = config.apps.filter((app) => matchesQuery(app, query));
      }
    }

    // 스토어 필터 적용
    results = filterByStore(results, store);

    if (results.length === 0) {
      const message = query
        ? `"${query}"와 일치하는 앱을 찾을 수 없습니다.`
        : "등록된 앱이 없습니다.";

      return {
        content: [
          {
            type: "text" as const,
            text: `❌ ${message}

💡 apps-add 또는 apps-init 도구로 앱을 등록하세요.`,
          },
        ],
        _meta: { apps: [], count: 0 },
      };
    }

    const header = query
      ? `🔍 "${query}" 검색 결과: ${results.length}개`
      : `📋 등록된 앱 목록: ${results.length}개`;

    const appList = results.map(formatAppInfo).join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `${header}

${appList}`,
        },
      ],
      _meta: { apps: results, count: results.length },
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ 앱 검색 실패: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}
