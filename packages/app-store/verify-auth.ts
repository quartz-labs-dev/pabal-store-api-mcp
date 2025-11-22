import { loadConfig } from "../core/config";
import { createAppStoreJWT, decodeJwt } from "./auth";

export interface VerifyAppStoreAuthResult {
  success: boolean;
  error?: string;
  data?: {
    header: Record<string, unknown>;
    payload: Record<string, unknown>;
  };
}

/**
 * App Store Connect 인증 설정을 확인하고 JWT 토큰을 생성하여 검증합니다.
 * @param expirationSeconds JWT 토큰 만료 시간 (초). 기본값: 300초
 * @returns 인증 확인 결과
 */
export function verifyAppStoreAuth({
  expirationSeconds = 300,
}: {
  expirationSeconds?: number;
} = {}): VerifyAppStoreAuthResult {
  try {
    const cfg = loadConfig().appStore;
    if (!cfg) {
      return {
        success: false,
        error: "secrets/aso-config.json 파일에 App Store 설정이 없습니다.",
      };
    }

    const token = createAppStoreJWT(cfg, { expirationSeconds });
    const decoded = decodeJwt(token);

    return {
      success: true,
      data: {
        header: decoded.header,
        payload: decoded.payload,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `App Store 인증 확인 실패: ${message}`,
    };
  }
}

