/**
 * App Store ASO data push logic
 */

import { AppStoreClient } from "./client";
import { type AppStoreMultilingualAsoData } from "@packages/aso";

export interface PushAppStoreAsoOptions {
  client: AppStoreClient;
  asoData: AppStoreMultilingualAsoData;
}

export interface PushAppStoreAsoResult {
  success: boolean;
  localesPushed?: string[];
  error?: string;
  needsNewVersion?: boolean;
  versionInfo?: {
    versionId: string;
    versionString: string;
    locales: string[];
  };
  failedFields?: {
    locale: string;
    fields: string[];
  }[];
}

/**
 * Push ASO data to App Store
 */
export async function pushAppStoreAso({
  client,
  asoData,
}: PushAppStoreAsoOptions): Promise<PushAppStoreAsoResult> {
  try {
    const localesToPush = Object.keys(asoData.locales);

    console.error(`[AppStore] 📤 Pushing ASO data...`);
    console.error(
      `[AppStore]   Locales: ${localesToPush.join(", ")} (${localesToPush.length} total)`
    );

    const failedFieldsList: { locale: string; fields: string[] }[] = [];

    for (const [locale, localeData] of Object.entries(asoData.locales)) {
      console.error(`[AppStore]   📤 Pushing ${locale}...`);
      try {
        const result = await client.pushAsoData(localeData);
        if (result.failedFields && result.failedFields.length > 0) {
          failedFieldsList.push({
            locale,
            fields: result.failedFields,
          });
          console.error(
            `[AppStore]   ⚠️  ${locale} partially updated (failed fields: ${result.failedFields.join(", ")})`
          );
        } else {
          console.error(`[AppStore]   ✅ ${locale} uploaded successfully`);
        }
      } catch (localeError) {
        const localeMsg =
          localeError instanceof Error
            ? localeError.message
            : String(localeError);
        console.error(`[AppStore]   ❌ ${locale} failed: ${localeMsg}`);
        throw localeError;
      }
    }

    return {
      success: true,
      localesPushed: localesToPush,
      failedFields: failedFieldsList.length > 0 ? failedFieldsList : undefined,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    if (msg.includes("409 Conflict") && msg.includes("STATE_ERROR")) {
      console.error(
        `[AppStore]   🔄 STATE_ERROR detected. New version needed.`
      );

      try {
        const version = await client.createNewVersionWithAutoIncrement();
        const versionId = version.id;
        const versionString = version.attributes.versionString;
        const locales = Object.keys(asoData.locales);

        console.error(`[AppStore]   ✅ New version ${versionString} created.`);

        return {
          success: false,
          needsNewVersion: true,
          versionInfo: {
            versionId,
            versionString,
            locales,
          },
        };
      } catch (versionError) {
        const versionMsg =
          versionError instanceof Error
            ? versionError.message
            : String(versionError);
        return {
          success: false,
          error: `Failed to create new version: ${versionMsg}`,
        };
      }
    }

    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error(`[AppStore]   ❌ Push failed`);
    console.error(`[AppStore]     Error: ${msg}`);
    if (errorStack) {
      console.error(`[AppStore]     Stack: ${errorStack}`);
    }
    if (error instanceof Error && "response" in error) {
      console.error(
        `[AppStore]     Response: ${JSON.stringify((error as any).response, null, 2)}`
      );
    }

    console.error(`[AppStore] ❌ Push failed:`, error);

    return {
      success: false,
      error: msg,
    };
  }
}
