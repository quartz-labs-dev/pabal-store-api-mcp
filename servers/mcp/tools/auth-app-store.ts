import { verifyAppStoreAuth } from "../../../packages/app-store";

/**
 * App Store 인증 상태 확인 도구
 */
export async function handleAuthAppStore() {
  const result = verifyAppStoreAuth({ expirationSeconds: 300 });
  if (result.success && result.data) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              ok: true,
              header: result.data.header,
              payload: result.data.payload,
            },
            null,
            2
          ),
        },
      ],
    };
  }
  return {
    content: [
      {
        type: "text" as const,
        text: result.error || "알 수 없는 오류가 발생했습니다.",
      },
    ],
  };
}


