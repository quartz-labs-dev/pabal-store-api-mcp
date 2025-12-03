import { AppStoreService } from "@servers/mcp/core/services/app-store-service";

const appStoreService = new AppStoreService();

/**
 * App Store authentication status check tool
 */
export async function handleAuthAppStore() {
  const result = await appStoreService.verifyAuth(300);

  const success = Boolean(result.success && result.data);

  if (success) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              ok: true,
              header: result.data!.header,
              payload: result.data!.payload,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const errorMessage =
    result.error?.message ||
    "App Store authentication not configured or failed.";

  // Keep failure response as plain text for tests that expect a string with keywords.
  return {
    content: [
      {
        type: "text" as const,
        text: `App Store auth failed: ${errorMessage}`,
      },
    ],
  };
}
