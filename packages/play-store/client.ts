/**
 * Google Play Console API Client
 *
 * Authentication: Service account JSON key file required
 * API Documentation: https://developers.google.com/android-publisher
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import { google } from "googleapis";
import type {
  GooglePlayAsoData,
  GooglePlayMultilingualAsoData,
  GooglePlayReleaseNote,
} from "@packages/aso-core/types";
import { DEFAULT_LOCALE } from "@packages/aso-core/types";

export interface GooglePlayClientConfig {
  packageName: string;
  serviceAccountKeyPath?: string;
  serviceAccountKey?: object;
}

export class GooglePlayClient {
  private auth: any;
  private androidPublisher: any;
  private packageName: string;

  constructor(config: GooglePlayClientConfig) {
    this.packageName = config.packageName;

    let key = config.serviceAccountKey;
    if (config.serviceAccountKeyPath && !key) {
      const content = readFileSync(config.serviceAccountKeyPath, "utf-8");
      key = JSON.parse(content);
    }

    if (!key) {
      throw new Error("Google Play service account key is required.");
    }

    this.auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    this.androidPublisher = google.androidpublisher("v3");
  }

  /**
   * Verify app access (returns app information)
   * Google Play API does not support listing apps, so only verifies access by package name
   */
  async verifyAppAccess(): Promise<{ 
    packageName: string; 
    title?: string; 
    defaultLanguage?: string;
    supportedLocales?: string[];
  }> {
    const authClient = await this.auth.getClient();

    const appResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });

    const editId = appResponse.data.id!;

    try {
      // Get app details
      const appDetails = await this.androidPublisher.edits.details.get({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });

      // Get all language listings
      const listingsResponse = await this.androidPublisher.edits.listings.list({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });

      const listings = listingsResponse.data.listings || [];
      const defaultListing = listings[0];
      const supportedLocales = listings
        .map((l: any) => l.language)
        .filter((lang: string | undefined): lang is string => !!lang)
        .sort();

      return {
        packageName: this.packageName,
        title: defaultListing?.title ?? undefined,
        defaultLanguage: appDetails.data.defaultLanguage ?? undefined,
        supportedLocales,
      };
    } finally {
      // Delete edit (exit without changes)
      try {
        await this.androidPublisher.edits.delete({
          auth: authClient,
          packageName: this.packageName,
          editId,
        });
      } catch {
        // Ignore deletion failure
      }
    }
  }

  async pullAllLanguagesAsoData(): Promise<GooglePlayMultilingualAsoData> {
    const authClient = await this.auth.getClient();

    const appResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });

    const editId = appResponse.data.id!;

    try {
      const appDetails = await this.androidPublisher.edits.details.get({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });

      const listingsResponse = await this.androidPublisher.edits.listings.list({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });

      const allListings = listingsResponse.data.listings || [];
      console.log(
        `🌍 Found ${allListings.length} Google Play languages: ${allListings
          .map((l: any) => l.language)
          .join(", ")}`
      );

      const locales: Record<string, GooglePlayAsoData> = {};
      let defaultLanguage: string | undefined;

      for (const listing of allListings) {
        const language = listing.language;
        if (!language) {
          console.warn(`⚠️  Listing has no language`);
          continue;
        }

        const listingDetail = await this.androidPublisher.edits.listings.get({
          auth: authClient,
          packageName: this.packageName,
          editId,
          language,
        });

        const screenshots = {
          phone: [] as string[],
          tablet7: [] as string[],
          tablet10: [] as string[],
          tv: [] as string[],
          wear: [] as string[],
        };

        let featureGraphic: string | undefined;

        const imageTypes = [
          "phoneScreenshots",
          "sevenInchScreenshots",
          "tenInchScreenshots",
          "tvScreenshots",
          "wearScreenshots",
          "featureGraphic",
        ] as const;

        for (const imageType of imageTypes) {
          try {
            const imagesResponse = await this.androidPublisher.edits.images.list({
              auth: authClient,
              packageName: this.packageName,
              editId,
              language,
              imageType,
            });

            const images = imagesResponse.data.images || [];

            if (imageType === "featureGraphic") {
              featureGraphic = images[0]?.url;
            } else {
              const urls = images.map((img: any) => img.url).filter(Boolean) as string[];
              if (imageType === "phoneScreenshots") screenshots.phone.push(...urls);
              else if (imageType === "sevenInchScreenshots") screenshots.tablet7.push(...urls);
              else if (imageType === "tenInchScreenshots") screenshots.tablet10.push(...urls);
              else if (imageType === "tvScreenshots") screenshots.tv.push(...urls);
              else if (imageType === "wearScreenshots") screenshots.wear.push(...urls);
            }
          } catch (error: unknown) {
            const err = error as { code?: number; message?: string };
            if (err.code !== 404) {
              console.warn(`⚠️  Failed to fetch ${imageType} images for ${language}:`, err.message);
            }
          }
        }

        locales[language] = {
          title: listingDetail.data.title || "",
          shortDescription: listingDetail.data.shortDescription || "",
          fullDescription: listingDetail.data.fullDescription || "",
          screenshots,
          featureGraphic,
          category: (appDetails.data as any).category || "",
          packageName: this.packageName,
          defaultLanguage: language,
          contactEmail: appDetails.data.contactEmail ?? undefined,
          contactPhone: appDetails.data.contactPhone ?? undefined,
          contactWebsite: appDetails.data.contactWebsite ?? undefined,
        };

        if (!defaultLanguage && language === DEFAULT_LOCALE) {
          defaultLanguage = language;
        }
      }

      if (!defaultLanguage && Object.keys(locales).length > 0) {
        defaultLanguage = Object.keys(locales)[0];
      }

      return {
        locales,
        defaultLocale: defaultLanguage || DEFAULT_LOCALE,
      };
    } finally {
      await this.androidPublisher.edits.delete({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
    }
  }

  async pullAsoData(): Promise<GooglePlayAsoData> {
    const authClient = await this.auth.getClient();

    const appResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });

    const editId = appResponse.data.id!;

    try {
      const appDetails = await this.androidPublisher.edits.details.get({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });

      const listings = await this.androidPublisher.edits.listings.list({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });

      const defaultListing = listings.data.listings?.[0];
      const defaultLanguage = defaultListing?.language || "en-US";

      const listing = await this.androidPublisher.edits.listings.get({
        auth: authClient,
        packageName: this.packageName,
        editId,
        language: defaultLanguage,
      });

      const screenshots = {
        phone: [] as string[],
        tablet7: [] as string[],
        tablet10: [] as string[],
        tv: [] as string[],
        wear: [] as string[],
      };

      let featureGraphic: string | undefined;

      const imageTypes = [
        "phoneScreenshots",
        "sevenInchScreenshots",
        "tenInchScreenshots",
        "tvScreenshots",
        "wearScreenshots",
        "featureGraphic",
      ] as const;

      for (const imageType of imageTypes) {
        try {
          const imagesResponse = await this.androidPublisher.edits.images.list({
            auth: authClient,
            packageName: this.packageName,
            editId,
            language: defaultLanguage,
            imageType,
          });

          const images = imagesResponse.data.images || [];

          if (imageType === "featureGraphic") {
            featureGraphic = images[0]?.url;
          } else {
            const urls = images.map((img: any) => img.url).filter(Boolean) as string[];
            if (imageType === "phoneScreenshots") screenshots.phone.push(...urls);
            else if (imageType === "sevenInchScreenshots") screenshots.tablet7.push(...urls);
            else if (imageType === "tenInchScreenshots") screenshots.tablet10.push(...urls);
            else if (imageType === "tvScreenshots") screenshots.tv.push(...urls);
            else if (imageType === "wearScreenshots") screenshots.wear.push(...urls);
          }
        } catch (error: unknown) {
          const err = error as { code?: number; message?: string };
          if (err.code !== 404) {
            console.warn(`⚠️  Failed to fetch ${imageType} images:`, err.message);
          }
        }
      }

      return {
        title: listing.data.title || "",
        shortDescription: listing.data.shortDescription || "",
        fullDescription: listing.data.fullDescription || "",
        screenshots,
        featureGraphic,
        category: (appDetails.data as any).category || "",
        packageName: this.packageName,
        defaultLanguage,
        contactEmail: appDetails.data.contactEmail ?? undefined,
        contactPhone: appDetails.data.contactPhone ?? undefined,
        contactWebsite: appDetails.data.contactWebsite ?? undefined,
      };
    } finally {
      await this.androidPublisher.edits.delete({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
    }
  }

  async pushAsoData(data: Partial<GooglePlayAsoData>): Promise<void> {
    const authClient = await this.auth.getClient();

    const editResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });

    const editId = editResponse.data.id!;

    try {
      const language = data.defaultLanguage || "en-US";

      if (data.title || data.shortDescription || data.fullDescription) {
        await this.androidPublisher.edits.listings.update({
          auth: authClient,
          packageName: this.packageName,
          editId,
          language,
          requestBody: {
            title: data.title,
            shortDescription: data.shortDescription,
            fullDescription: data.fullDescription,
          },
        });
      }

      if (data.contactEmail || data.contactPhone || data.contactWebsite) {
        await this.androidPublisher.edits.details.update({
          auth: authClient,
          packageName: this.packageName,
          editId,
          requestBody: {
            contactEmail: data.contactEmail,
            contactPhone: data.contactPhone,
            contactWebsite: data.contactWebsite,
          },
        });
      }

      await this.androidPublisher.edits.commit({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
    } catch (error) {
      await this.androidPublisher.edits.delete({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
      throw error;
    }
  }

  async uploadScreenshot(options: {
    imagePath: string;
    imageType:
      | "phoneScreenshots"
      | "sevenInchScreenshots"
      | "tenInchScreenshots"
      | "tvScreenshots"
      | "wearScreenshots"
      | "featureGraphic";
    language?: string;
  }): Promise<void> {
    const { imagePath, imageType, language = "en-US" } = options;

    if (!existsSync(imagePath)) {
      throw new Error(`Image file not found: ${imagePath}`);
    }

    const authClient = await this.auth.getClient();

    const editResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });

    const editId = editResponse.data.id!;

    try {
      const imageBuffer = readFileSync(imagePath);

      await this.androidPublisher.edits.images.upload({
        auth: authClient,
        packageName: this.packageName,
        editId,
        language,
        imageType,
        media: {
          mimeType: "image/png",
          body: imageBuffer,
        },
      });

      await this.androidPublisher.edits.commit({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
    } catch (error) {
      await this.androidPublisher.edits.delete({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
      throw error;
    }
  }

  async getLatestProductionRelease(): Promise<{
    versionCodes: number[];
    status?: string;
    versionName?: string;
    releaseName?: string;
    releaseDate?: string;
  } | null> {
    const authClient = await this.auth.getClient();

    const editResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });

    const editId = editResponse.data.id!;

    try {
      const trackResponse = await this.androidPublisher.edits.tracks.get({
        auth: authClient,
        packageName: this.packageName,
        editId,
        track: "production",
      });

      const releases = trackResponse.data.releases || [];
      if (releases.length === 0) {
        return null;
      }

      let latestRelease: (typeof releases)[number] | null = null;
      let latestVersionCode = 0;

      for (const release of releases) {
        const versionCodes = (release.versionCodes || []).map((code: string | number) => Number(code));
        const maxVersionCode = versionCodes.reduce((max: number, code: number) => Math.max(max, code), 0);

        if (!latestRelease || maxVersionCode > latestVersionCode) {
          latestRelease = release;
          latestVersionCode = maxVersionCode;
        }
      }

      if (!latestRelease) {
        return null;
      }

      const releaseDate = (latestRelease as any).releaseDate?.seconds
        ? new Date(Number((latestRelease as any).releaseDate.seconds) * 1000).toISOString()
        : undefined;

      return {
        versionCodes: (latestRelease.versionCodes || []).map((code: string | number) => Number(code)),
        status: latestRelease.status ?? undefined,
        versionName: latestRelease.name ?? undefined,
        releaseName: latestRelease.name ?? undefined,
        releaseDate,
      };
    } finally {
      await this.androidPublisher.edits.delete({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
    }
  }

  async createProductionRelease(options: {
    versionCodes: number[];
    releaseName?: string;
    status?: "draft" | "inProgress" | "completed" | "halted";
  }): Promise<void> {
    const { versionCodes, releaseName, status = "draft" } = options;

    if (!versionCodes || versionCodes.length === 0) {
      throw new Error("At least one versionCode is required to create a release.");
    }

    const authClient = await this.auth.getClient();
    const editResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });
    const editId = editResponse.data.id!;

    try {
      await this.androidPublisher.edits.tracks.update({
        auth: authClient,
        packageName: this.packageName,
        editId,
        track: "production",
        requestBody: {
          track: "production",
          releases: [{ name: releaseName, status, versionCodes: versionCodes.map(String) }],
        },
      });

      await this.androidPublisher.edits.commit({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
    } catch (error) {
      await this.androidPublisher.edits.delete({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
      throw error;
    }
  }

  /**
   * Update release notes for production track
   */
  async updateReleaseNotes(options: {
    releaseNotes: Record<string, string>; // { "en-US": "Bug fixes", "ko": "Bug fixes" }
    track?: string;
  }): Promise<{ updated: string[]; failed: Array<{ locale: string; error: string }> }> {
    const { releaseNotes, track = "production" } = options;

    const authClient = await this.auth.getClient();
    const editResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });
    const editId = editResponse.data.id!;

    try {
      // Get current track information
      const trackResponse = await this.androidPublisher.edits.tracks.get({
        auth: authClient,
        packageName: this.packageName,
        editId,
        track,
      });

      const releases = trackResponse.data.releases || [];
      if (releases.length === 0) {
        throw new Error(`No releases found in ${track} track`);
      }

      // Add release notes to latest release
      const latestRelease = releases[0];
      const releaseNotesArray = Object.entries(releaseNotes).map(([language, text]) => ({
        language,
        text,
      }));

      // Update track
      await this.androidPublisher.edits.tracks.update({
        auth: authClient,
        packageName: this.packageName,
        editId,
        track,
        requestBody: {
          track,
          releases: [
            {
              ...latestRelease,
              releaseNotes: releaseNotesArray,
            },
          ],
        },
      });

      // Commit
      await this.androidPublisher.edits.commit({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });

      return {
        updated: Object.keys(releaseNotes),
        failed: [],
      };
    } catch (error) {
      // Rollback on failure
      try {
        await this.androidPublisher.edits.delete({
          auth: authClient,
          packageName: this.packageName,
          editId,
        });
      } catch {
        // Ignore deletion failure
      }
      throw error;
    }
  }

  async pullReleaseNotes(): Promise<GooglePlayReleaseNote[]> {
    const authClient = await this.auth.getClient();

    const editResponse = await this.androidPublisher.edits.insert({
      auth: authClient,
      packageName: this.packageName,
    });

    const editId = editResponse.data.id!;

    try {
      const tracksResponse = await this.androidPublisher.edits.tracks.list({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });

      const tracks = tracksResponse.data.tracks || [];
      const releaseNotes: GooglePlayReleaseNote[] = [];

      for (const track of tracks) {
        const trackName = track.track || "production";

        const trackResponse = await this.androidPublisher.edits.tracks.get({
          auth: authClient,
          packageName: this.packageName,
          editId,
          track: trackName,
        });

        const releases = trackResponse.data.releases || [];

        for (const release of releases) {
          const versionCodes = release.versionCodes || [];
          const status = release.status || "draft";
          const releaseDate = (release as any).releaseDate?.seconds
            ? new Date(Number((release as any).releaseDate.seconds) * 1000).toISOString()
            : undefined;

          for (const versionCode of versionCodes) {
            const releaseNotesMap: Record<string, string> = {};

            if (release.releaseNotes) {
              for (const rn of release.releaseNotes) {
                if (rn.language && rn.text) {
                  releaseNotesMap[rn.language] = rn.text;
                }
              }
            }

            if (Object.keys(releaseNotesMap).length > 0) {
              releaseNotes.push({
                versionCode: Number(versionCode),
                versionName: versionCode.toString(),
                releaseNotes: releaseNotesMap,
                track: trackName,
                status,
                releaseDate,
              });
            }
          }
        }
      }

      return releaseNotes;
    } finally {
      await this.androidPublisher.edits.delete({
        auth: authClient,
        packageName: this.packageName,
        editId,
      });
    }
  }

  async pullProductionReleaseNotes(): Promise<GooglePlayReleaseNote[]> {
    const allReleaseNotes = await this.pullReleaseNotes();
    return allReleaseNotes.filter((rn) => rn.track === "production");
  }
}
