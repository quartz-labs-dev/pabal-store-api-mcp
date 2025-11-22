import { loadConfig } from "../core/config";

export interface VerifyPlayStoreAuthResult {
  success: boolean;
  error?: string;
  data?: {
    client_email: string;
    project_id: string;
  };
}

/**
 * Google Play Store 서비스 계정 인증 설정을 확인합니다.
 * @returns 인증 확인 결과
 */
export function verifyPlayStoreAuth(): VerifyPlayStoreAuthResult {
  try {
    const cfg = loadConfig().playStore;
    if (!cfg) {
      return {
        success: false,
        error: "secrets/aso-config.json 파일에 Play Store 설정이 없습니다.",
      };
    }

    const parsed = JSON.parse(cfg.serviceAccountJson);

    return {
      success: true,
      data: {
        client_email: parsed.client_email,
        project_id: parsed.project_id,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Play Store 인증 확인 실패: ${message}`,
    };
  }
}

