/**
 * auth-check: App Store / Google Play 인증 상태 확인
 */

import { verifyAppStoreAuth } from "../../../../packages/app-store";
import { verifyPlayStoreAuth } from "../../../../packages/play-store";

type StoreType = "appStore" | "googlePlay" | "both";

interface AuthCheckOptions {
  store?: StoreType;
}

export async function handleAuthCheck(options: AuthCheckOptions) {
  const { store = "both" } = options;
  const results: string[] = [];

  if (store === "appStore" || store === "both") {
    const appStoreResult = await verifyAppStoreAuth({ expirationSeconds: 300 });
    if (appStoreResult.success && appStoreResult.data) {
      results.push(`✅ **App Store Connect**`);
      results.push(`   Issuer ID: ${appStoreResult.data.payload.iss}`);
      results.push(`   Key ID: ${appStoreResult.data.header.kid}`);
      results.push(`   JWT 생성 성공`);
    } else {
      results.push(`❌ **App Store Connect**`);
      results.push(`   ${appStoreResult.error || "인증 실패"}`);
    }
    results.push("");
  }

  if (store === "googlePlay" || store === "both") {
    const playStoreResult = verifyPlayStoreAuth();
    if (playStoreResult.success && playStoreResult.data) {
      results.push(`✅ **Google Play Console**`);
      results.push(`   Project: ${playStoreResult.data.project_id}`);
      results.push(`   Service Account: ${playStoreResult.data.client_email}`);
    } else {
      results.push(`❌ **Google Play Console**`);
      results.push(`   ${playStoreResult.error || "인증 실패"}`);
    }
  }

  return {
    content: [
      {
        type: "text" as const,
        text: `🔐 **인증 상태**\n\n${results.join("\n")}`,
      },
    ],
  };
}
