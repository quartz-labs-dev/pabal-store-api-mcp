import { AppError } from "@/packages/common/errors/app-error";
import { ERROR_CODES } from "@/packages/common/errors/error-codes";
import { HTTP_STATUS } from "@/packages/common/errors/status-codes";
import type {
  GooglePlayMultilingualAsoData,
  GooglePlayReleaseNote,
} from "@/packages/configs/aso-config/types";
import type { PreparedAsoData } from "@/packages/configs/aso-config/utils";
import type { EnvConfig } from "@/packages/configs/secrets-config/types";
import type { GooglePlayClient } from "@/packages/stores/play-store/client";
import { verifyPlayStoreAuth } from "@/packages/stores/play-store/verify-auth";
import { createGooglePlayClient } from "@/core/clients/google-play-factory";
import {
  checkPushPrerequisites,
  serviceFailure,
  toServiceResult,
  updateRegisteredLocales,
} from "./service-helpers";
import {
  type MaybeResult,
  type ServiceResult,
  type GooglePlayReleaseInfo,
  type UpdatedReleaseNotesResult,
  type PushAsoResult,
  type CreatedGooglePlayVersion,
  type VerifyAuthResult,
} from "./types";

interface GooglePlayAppInfo {
  name?: string;
  supportedLocales?: string[];
}

/**
 * Google Play-facing service layer that wraps client creation and common operations.
 * Keeps MCP tools independent from client factories and SDK details.
 */
export class GooglePlayService {
  private getClientOrThrow(
    packageName: string,
    existingClient?: GooglePlayClient
  ): GooglePlayClient {
    if (existingClient) return existingClient;
    const clientResult = this.createClient(packageName);
    if (!clientResult.success) {
      throw clientResult.error;
    }
    return clientResult.data;
  }

  createClient(packageName: string): ServiceResult<GooglePlayClient> {
    return toServiceResult(createGooglePlayClient({ packageName }));
  }

  /**
   * Fetch a single app info (with locales) by packageName.
   */
  async fetchAppInfo(
    packageName: string
  ): Promise<MaybeResult<GooglePlayAppInfo>> {
    try {
      const client = this.getClientOrThrow(packageName);
      const appInfo = await client.verifyAppAccess();
      return {
        found: true,
        name: appInfo.title,
        supportedLocales: appInfo.supportedLocales,
      };
    } catch (error) {
      return {
        found: false,
        error: AppError.wrap(
          error,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.GOOGLE_PLAY_FETCH_APP_INFO_FAILED,
          "Failed to fetch Google Play app info"
        ),
      };
    }
  }

  async getLatestProductionRelease(
    packageName: string
  ): Promise<MaybeResult<GooglePlayReleaseInfo>> {
    try {
      const client = this.getClientOrThrow(packageName);
      const latestRelease = await client.getLatestProductionRelease();
      if (!latestRelease) {
        return { found: false };
      }

      const { versionName, releaseName, status, versionCodes } = latestRelease;

      return {
        found: true,
        versionName,
        releaseName,
        status,
        versionCodes,
      };
    } catch (error) {
      return {
        found: false,
        error: AppError.wrap(
          error,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.GOOGLE_PLAY_GET_LATEST_RELEASE_FAILED,
          "Failed to fetch latest Google Play release"
        ),
      };
    }
  }

  async updateReleaseNotes(
    packageName: string,
    releaseNotes: Record<string, string>,
    track?: string,
    supportedLocales?: string[]
  ): Promise<ServiceResult<UpdatedReleaseNotesResult>> {
    try {
      const client = this.getClientOrThrow(packageName);
      const filteredReleaseNotes: Record<string, string> = {};
      if (supportedLocales) {
        for (const locale of supportedLocales) {
          if (releaseNotes[locale]) {
            filteredReleaseNotes[locale] = releaseNotes[locale];
          }
        }
      } else {
        Object.assign(filteredReleaseNotes, releaseNotes);
      }

      if (Object.keys(filteredReleaseNotes).length === 0) {
        return serviceFailure(
          AppError.validation(
            ERROR_CODES.GOOGLE_PLAY_RELEASE_NOTES_EMPTY,
            "No supported locales found in release notes"
          )
        );
      }

      try {
        const updateResult = await client.updateReleaseNotes({
          releaseNotes: filteredReleaseNotes,
          track: track ?? "production",
        });

        const success = updateResult.failed.length === 0;
        const partialError = !success
          ? AppError.wrap(
              updateResult.failed[0]?.error ??
                "Failed to update some release notes",
              HTTP_STATUS.INTERNAL_SERVER_ERROR,
              ERROR_CODES.GOOGLE_PLAY_UPDATE_RELEASE_NOTES_PARTIAL
            )
          : undefined;
        if (!success) {
          return {
            success: false,
            error:
              partialError ??
              AppError.internal(
                ERROR_CODES.GOOGLE_PLAY_UPDATE_RELEASE_NOTES_FAILED,
                "Failed to update Google Play release notes"
              ),
          };
        }

        return {
          success: true,
          data: {
            updated: updateResult.updated,
            failed: updateResult.failed,
          },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return serviceFailure(
          AppError.wrap(
            error,
            HTTP_STATUS.INTERNAL_SERVER_ERROR,
            ERROR_CODES.GOOGLE_PLAY_UPDATE_RELEASE_NOTES_FAILED,
            msg
          )
        );
      }
    } catch (error) {
      return serviceFailure(
        AppError.wrap(
          error,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.GOOGLE_PLAY_UPDATE_RELEASE_NOTES_FAILED,
          "Failed to update Google Play release notes"
        )
      );
    }
  }

  async pullReleaseNotes(
    packageName: string
  ): Promise<ServiceResult<GooglePlayReleaseNote[]>> {
    try {
      const client = this.getClientOrThrow(packageName);
      const releaseNotes = await client.pullProductionReleaseNotes();
      return { success: true, data: releaseNotes };
    } catch (error) {
      return serviceFailure(
        AppError.wrap(
          error,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.GOOGLE_PLAY_PULL_RELEASE_NOTES_FAILED,
          "Failed to pull Google Play release notes"
        )
      );
    }
  }

  async createVersion(
    packageName: string,
    versionString: string,
    versionCodes: number[]
  ): Promise<ServiceResult<CreatedGooglePlayVersion>> {
    try {
      const client = this.getClientOrThrow(packageName);
      await client.createProductionRelease({
        versionCodes,
        releaseName: versionString,
        status: "draft",
      });
      return {
        success: true,
        data: {
          versionName: versionString,
          versionCodes,
          status: "DRAFT",
        },
      };
    } catch (error) {
      return serviceFailure(
        AppError.wrap(
          error,
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.GOOGLE_PLAY_CREATE_VERSION_FAILED,
          "Failed to create Google Play version"
        )
      );
    }
  }

  async pushAsoData({
    config,
    packageName,
    localAsoData,
    googlePlayDataPath,
    uploadImages = false,
    slug,
  }: {
    config: EnvConfig;
    packageName?: string;
    localAsoData: PreparedAsoData;
    googlePlayDataPath: string;
    uploadImages?: boolean;
    slug?: string;
  }): Promise<PushAsoResult> {
    const skip = checkPushPrerequisites({
      storeLabel: "Google Play",
      configured: Boolean(config.playStore),
      identifierLabel: "packageName",
      identifier: packageName,
      hasData: Boolean(localAsoData.googlePlay),
      dataPath: googlePlayDataPath,
    });
    if (skip) return { success: false, error: skip };

    const ensuredPackage = packageName as string;
    const googlePlayData =
      localAsoData.googlePlay as GooglePlayMultilingualAsoData;
    const client = this.getClientOrThrow(ensuredPackage);

    console.error(`[MCP]   📤 Pushing to Google Play...`);
    console.error(`[MCP]     Package: ${packageName}`);

    try {
      const localesToPush = Object.keys(googlePlayData.locales);

      for (const locale of localesToPush) {
        console.error(`[GooglePlay]   📤 Preparing locale: ${locale}`);
      }

      await client.pushMultilingualAsoData(googlePlayData);

      // Push app-level contact information
      if (googlePlayData.contactEmail || googlePlayData.contactWebsite) {
        console.error(`[GooglePlay]   📤 Pushing app details...`);
        await client.pushAppDetails({
          contactEmail: googlePlayData.contactEmail,
          contactWebsite: googlePlayData.contactWebsite,
        });
        console.error(`[GooglePlay]   ✅ App details uploaded successfully`);
      }

      // Upload screenshots if enabled
      if (uploadImages && slug) {
        console.error(`[GooglePlay]   📤 Uploading screenshots...`);
        const { getAsoPushDir } =
          await import("@/packages/configs/aso-config/utils");
        const { parseGooglePlayScreenshots, hasScreenshots } =
          await import("@/core/helpers/screenshot-helpers");
        const pushDataDir = getAsoPushDir();
        const screenshotsBaseDir = `${pushDataDir}/products/${slug}/store/google-play/screenshots`;

        for (const locale of localesToPush) {
          if (!hasScreenshots(screenshotsBaseDir, locale)) {
            console.error(
              `[GooglePlay]   ⏭️  Skipping ${locale} - no screenshots directory`
            );
            continue;
          }

          console.error(
            `[GooglePlay]   📤 Uploading screenshots for ${locale}...`
          );
          const screenshots = parseGooglePlayScreenshots(
            screenshotsBaseDir,
            locale
          );

          // Upload phone screenshots (phone-*.png)
          for (const imagePath of screenshots.phone) {
            await client.uploadScreenshot({
              imagePath,
              imageType: "phoneScreenshots",
              language: locale,
            });
            console.error(`[GooglePlay]     ✅ ${imagePath.split("/").pop()}`);
          }

          // Upload 7-inch tablet screenshots as phone
          for (const imagePath of screenshots.tablet7) {
            await client.uploadScreenshot({
              imagePath,
              imageType: "phoneScreenshots",
              language: locale,
            });
            console.error(
              `[GooglePlay]     ✅ ${imagePath.split("/").pop()} (as phone)`
            );
          }

          // Upload 10-inch tablet screenshots as tablet
          for (const imagePath of screenshots.tablet10) {
            await client.uploadScreenshot({
              imagePath,
              imageType: "tenInchScreenshots",
              language: locale,
            });
            console.error(
              `[GooglePlay]     ✅ ${imagePath.split("/").pop()} (as tablet)`
            );
          }

          // Upload feature graphic
          if (screenshots.featureGraphic) {
            await client.uploadScreenshot({
              imagePath: screenshots.featureGraphic,
              imageType: "featureGraphic",
              language: locale,
            });
            console.error(`[GooglePlay]     ✅ feature-graphic.png`);
          }

          console.error(`[GooglePlay]   ✅ Screenshots uploaded for ${locale}`);
        }
      }

      try {
        const updated = updateRegisteredLocales(
          ensuredPackage,
          "googlePlay",
          localesToPush
        );
        if (updated) {
          console.error(
            `[MCP]   ✅ Updated registered-apps.json with ${localesToPush.length} Google Play locales`
          );
        }
      } catch (updateError) {
        console.error(
          `[MCP]   ⚠️ Failed to update registered-apps.json: ${
            updateError instanceof Error
              ? updateError.message
              : String(updateError)
          }`
        );
      }

      return {
        success: true,
        localesPushed: localesToPush,
      };
    } catch (error) {
      const wrapped = AppError.wrap(
        error,
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
        ERROR_CODES.GOOGLE_PLAY_PUSH_FAILED,
        error instanceof Error ? error.message : String(error)
      );
      console.error(`[GooglePlay] ❌ Push failed: ${wrapped.message}`, error);
      return { success: false, error: wrapped };
    }
  }

  async verifyAuth(): Promise<
    VerifyAuthResult<{ client_email: string; project_id: string }>
  > {
    const result = verifyPlayStoreAuth();

    if (!result.success) {
      return {
        success: false,
        error: AppError.wrap(
          result.error ?? "Unknown error",
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          ERROR_CODES.GOOGLE_PLAY_VERIFY_AUTH_FAILED,
          "Failed to verify Google Play auth"
        ),
      };
    }

    return { success: true, data: result.data };
  }
}
