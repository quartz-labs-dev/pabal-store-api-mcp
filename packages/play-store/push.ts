/**
 * Google Play ASO data push logic
 */

import { GooglePlayClient } from "./client";
import { type GooglePlayMultilingualAsoData } from "@packages/aso";

export interface PushGooglePlayAsoOptions {
  client: GooglePlayClient;
  asoData: GooglePlayMultilingualAsoData;
}

export interface PushGooglePlayAsoResult {
  success: boolean;
  localesPushed: string[];
  error?: string;
}

/**
 * Push ASO data to Google Play
 */
export async function pushGooglePlayAso({
  client,
  asoData,
}: PushGooglePlayAsoOptions): Promise<PushGooglePlayAsoResult> {
  try {
    const localesToPush = Object.keys(asoData.locales);

    console.error(`[GooglePlay] 📤 Pushing ASO data...`);
    console.error(
      `[GooglePlay]   Locales: ${localesToPush.join(", ")} (${localesToPush.length} total)`
    );

    for (const locale of localesToPush) {
      console.error(`[GooglePlay]   📤 Preparing locale: ${locale}`);
    }

    await client.pushMultilingualAsoData(asoData);

    console.error(`[GooglePlay]   ✅ Upload complete per locale:`);
    for (const locale of localesToPush) {
      console.error(`[GooglePlay]     ✅ ${locale}`);
    }

    return {
      success: true,
      localesPushed: localesToPush,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[GooglePlay]   ❌ Push failed`);
    console.error(`[GooglePlay]     Error: ${msg}`);
    if (errorStack) {
      console.error(`[GooglePlay]     Stack: ${errorStack}`);
    }

    let detailedError = msg;
    if (error instanceof Error && "response" in error) {
      const responseData = (error as any).response?.data;
      console.error(
        `[GooglePlay]     Response: ${JSON.stringify((error as any).response, null, 2)}`
      );
      if (responseData) {
        detailedError = `${msg}\n\nAPI Response:\n${JSON.stringify(responseData, null, 2)}`;
      }
    }
    if ((error as any).errors) {
      detailedError = `${msg}\n\nError Details:\n${JSON.stringify((error as any).errors, null, 2)}`;
    }

    console.error(`[GooglePlay] ❌ Push failed:`, error);

    return {
      success: false,
      localesPushed: [],
      error: detailedError,
    };
  }
}
