/**
 * App Store Connect API Client
 *
 * Authentication: API Key (Issuer ID, Key ID, Private Key) required
 * API Documentation: https://developer.apple.com/documentation/appstoreconnectapi
 */

import { AppStoreConnectAPI } from "appstore-connect-sdk";
import {
  AppsApi,
  AppInfosApi,
  AppInfoLocalizationsApi,
  AppScreenshotSetsApi,
  AppStoreVersionLocalizationsApi,
  AppStoreVersionsApi,
  AppsAppStoreVersionsGetToManyRelatedFilterAppStoreStateEnum,
  AppsAppStoreVersionsGetToManyRelatedFilterPlatformEnum,
  BaseAPI,
  Configuration,
  ResponseError,
  type AppsResponse,
} from "appstore-connect-sdk/openapi";
import type { Platform } from "appstore-connect-sdk/openapi";
import type {
  AppStoreAsoData,
  AppStoreMultilingualAsoData,
  AppStoreReleaseNote,
} from "@/packages/configs/aso-config/types";
import { DEFAULT_LOCALE } from "@/packages/configs/aso-config/constants";
import {
  convertToAsoData,
  convertToMultilingualAsoData,
  convertToReleaseNote,
  fetchScreenshotsForLocalization,
  mapLocalizationsByLocale,
  selectEnglishAppName,
  sortReleaseNotes,
  sortVersions,
} from "./api-converters";
import {
  APP_STORE_API_BASE_URL,
  APP_STORE_PLATFORM,
  DEFAULT_APP_LIST_LIMIT,
  DEFAULT_VERSIONS_FETCH_LIMIT,
} from "./constants";
import type {
  ApiResponse,
  AppInfo,
  AppInfoLocalization,
  AppInfoLocalizationUpdateAttributes,
  AppStoreApp,
  AppStoreClientConfig,
  AppStoreLocalization,
  AppStoreScreenshot,
  AppStoreScreenshotSet,
  AppStoreVersion,
  AppStoreVersionLocalizationUpdateAttributes,
} from "./types";

type ApiClass<T extends BaseAPI> = new (configuration?: Configuration) => T;

export class AppStoreClient {
  private issuerId: string;
  private keyId: string;
  private privateKey: string;
  private bundleId: string;
  private sdk: AppStoreConnectAPI;
  private apiCache = new Map<ApiClass<BaseAPI>, Promise<BaseAPI>>();

  constructor(config: AppStoreClientConfig) {
    this.issuerId = config.issuerId;
    this.keyId = config.keyId;
    this.privateKey = this.normalizePrivateKey(config.privateKey);
    this.bundleId = config.bundleId;
    this.sdk = new AppStoreConnectAPI({
      issuerId: this.issuerId,
      privateKeyId: this.keyId,
      privateKey: this.privateKey,
    });
  }

  private normalizePrivateKey(rawKey: string): string {
    if (!rawKey || !rawKey.includes("BEGIN PRIVATE KEY")) {
      throw new Error(
        "Invalid Private Key format. PEM format private key is required."
      );
    }

    return rawKey.replace(/\\n/g, "\n").trim();
  }

  /**
   * List all apps registered in the account
   * @param options.onlyReleased - If true, returns only released apps (apps with READY_FOR_SALE status)
   */
  async listAllApps(options: { onlyReleased?: boolean } = {}): Promise<
    Array<{
      id: string;
      name: string;
      bundleId: string;
      sku: string;
      isReleased: boolean;
    }>
  > {
    const { onlyReleased = false } = options;
    const apps: Array<{
      id: string;
      name: string;
      bundleId: string;
      sku: string;
      isReleased: boolean;
    }> = [];
    let nextUrl: string | null = `/apps?limit=${DEFAULT_APP_LIST_LIMIT}`;

    while (nextUrl) {
      const response = await this.listApps(nextUrl);

      for (const app of response.data || []) {
        const isReleased = await this.checkAppReleased(app.id);

        if (onlyReleased && !isReleased) {
          continue;
        }

        const englishName = await this.getEnglishAppName(app.id);

        apps.push({
          id: app.id,
          name: englishName || app.attributes?.name || "Unknown",
          bundleId: app.attributes?.bundleId || "",
          sku: app.attributes?.sku || "",
          isReleased,
        });
      }

      nextUrl = this.normalizeNextLink(response.links?.next);
    }

    return apps;
  }

  private async checkAppReleased(appId: string): Promise<boolean> {
    try {
      const response = await this.listAppStoreVersions(appId, {
        platform: APP_STORE_PLATFORM,
        state: "READY_FOR_SALE",
        limit: 1,
      });
      return (response.data?.length || 0) > 0;
    } catch {
      return false;
    }
  }

  private async getEnglishAppName(appId: string): Promise<string | null> {
    try {
      const appInfoId = await this.findAppInfoId(appId);

      const localizationsResponse =
        await this.listAppInfoLocalizations(appInfoId);

      return selectEnglishAppName(localizationsResponse.data || []);
    } catch {
      return null;
    }
  }

  /**
   * Get supported locales for an app
   */
  async getSupportedLocales(appId: string): Promise<string[]> {
    try {
      const appInfoId = await this.findAppInfoId(appId);

      const localizationsResponse =
        await this.listAppInfoLocalizations(appInfoId);

      return (localizationsResponse.data || [])
        .map((l) => l.attributes?.locale)
        .filter((locale): locale is string => !!locale)
        .sort();
    } catch {
      return [];
    }
  }

  private async findAppId(): Promise<string> {
    const response = await this.findAppByBundleId(this.bundleId);

    const app = response.data?.[0];
    if (!app) {
      throw new Error(`App not found for Bundle ID "${this.bundleId}".`);
    }

    return app.id;
  }

  private async findAppInfoId(appId?: string): Promise<string> {
    const targetAppId = appId || (await this.findAppId());

    const appInfosResponse = await this.listAppInfos(targetAppId);

    const appInfo = appInfosResponse.data?.[0];
    if (!appInfo) {
      throw new Error(`App Info not found for App ID "${targetAppId}".`);
    }

    return appInfo.id;
  }

  async pullAsoData(
    options: { locale?: string } = {}
  ): Promise<AppStoreAsoData> {
    const locale = options.locale || DEFAULT_LOCALE;
    const appId = await this.findAppId();
    const appInfoId = await this.findAppInfoId(appId);

    const [appResponse, versionsResponse, appInfoLocalizationResponse] =
      await Promise.all([
        this.getApp(appId),
        this.listAppStoreVersions(appId, {
          platform: APP_STORE_PLATFORM,
          limit: DEFAULT_VERSIONS_FETCH_LIMIT,
        }),
        this.listAppInfoLocalizations(appInfoId, locale),
      ]);

    const app = appResponse.data;
    const version = sortVersions(versionsResponse.data || [])[0];
    if (!version) throw new Error("App Store version not found.");

    const localizationsResponse = await this.listAppStoreVersionLocalizations(
      version.id,
      locale
    );

    const localization = localizationsResponse.data?.[0];
    const detailedLocalization = localization
      ? (await this.getAppStoreVersionLocalization(localization.id)).data
      : null;

    const screenshots = await fetchScreenshotsForLocalization(
      localization?.id,
      (localizationId) => this.listScreenshotSets(localizationId),
      (setId) => this.listScreenshots(setId)
    );

    const appInfoLocalization = appInfoLocalizationResponse.data?.[0];

    return convertToAsoData({
      app,
      appInfoLocalization,
      localization: detailedLocalization,
      screenshots,
      locale,
      bundleId: this.bundleId,
    });
  }

  async pullAllLocalesAsoData(): Promise<AppStoreMultilingualAsoData> {
    const appId = await this.findAppId();
    const appInfoId = await this.findAppInfoId(appId);

    const [appResponse, appInfoLocalizationsResponse, versionsResponse] =
      await Promise.all([
        this.getApp(appId),
        this.listAppInfoLocalizations(appInfoId),
        this.listAppStoreVersions(appId, {
          platform: APP_STORE_PLATFORM,
          limit: DEFAULT_VERSIONS_FETCH_LIMIT,
        }),
      ]);

    const app = appResponse.data;

    const appInfoLocalizationMap = mapLocalizationsByLocale(
      appInfoLocalizationsResponse.data || []
    );

    const version = sortVersions(versionsResponse.data || [])[0];
    if (!version) throw new Error("App Store version not found.");

    const localizationsResponse = await this.listAppStoreVersionLocalizations(
      version.id
    );

    const allLocalizations = localizationsResponse.data || [];
    console.log(
      `🌍 Found ${
        allLocalizations.length
      } App Store localizations: ${allLocalizations
        .map((l) => l.attributes?.locale)
        .join(", ")}`
    );

    const locales: Record<string, AppStoreAsoData> = {};
    let defaultLocale: string | undefined;

    for (const localization of allLocalizations) {
      const locale = localization.attributes?.locale;
      if (!locale) continue;

      const detailedLocalization =
        (await this.getAppStoreVersionLocalization(localization.id)).data ??
        null;

      const screenshots = await fetchScreenshotsForLocalization(
        localization.id,
        (localizationId) => this.listScreenshotSets(localizationId),
        (setId) => this.listScreenshots(setId)
      );

      locales[locale] = convertToAsoData({
        app,
        appInfoLocalization: appInfoLocalizationMap[locale],
        localization: detailedLocalization,
        screenshots,
        locale,
        bundleId: this.bundleId,
      });

      if (!defaultLocale && locale === DEFAULT_LOCALE) {
        defaultLocale = locale;
      }
    }

    return convertToMultilingualAsoData(locales, defaultLocale);
  }

  async pushAsoData(data: Partial<AppStoreAsoData>): Promise<{
    failedFields?: string[];
  }> {
    const appId = await this.findAppId();
    const appInfoId = await this.findAppInfoId(appId);
    const locale = data.locale || DEFAULT_LOCALE;

    const appInfoLocalizationResponse = await this.listAppInfoLocalizations(
      appInfoId,
      locale
    );

    const appInfoAttributes: Record<string, string> = {};
    const attemptedFields: string[] = [];
    if (typeof data.name === "string") {
      appInfoAttributes.name = data.name;
      attemptedFields.push("name");
    }
    if (typeof data.subtitle === "string") {
      appInfoAttributes.subtitle = data.subtitle;
      attemptedFields.push("subtitle");
    }

    const failedFields: string[] = [];

    if (Object.keys(appInfoAttributes).length > 0) {
      try {
        if (appInfoLocalizationResponse.data?.[0]) {
          const localizationId = appInfoLocalizationResponse.data[0].id;
          await this.updateAppInfoLocalization(
            localizationId,
            appInfoAttributes
          );
        } else {
          await this.createAppInfoLocalization(
            appInfoId,
            locale,
            appInfoAttributes
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (msg.includes("STATE_ERROR") || msg.includes("409 Conflict")) {
          failedFields.push(...attemptedFields);
          console.error(
            `[AppStore] ⚠️  Name/Subtitle update failed for ${locale}: ${msg}`
          );
          console.error(
            `[AppStore]   ℹ️  Name and Subtitle can only be updated when a new version is created.`
          );
          console.error(
            `[AppStore]   ⏭️  Continuing with other ASO fields (description, keywords, etc.)...`
          );
        } else {
          throw error;
        }
      }
    }

    const versionsResponse = await this.listAppStoreVersions(appId, {
      platform: APP_STORE_PLATFORM,
      limit: DEFAULT_VERSIONS_FETCH_LIMIT,
    });

    const version = sortVersions(versionsResponse.data || [])[0];
    if (!version) throw new Error("App Store version not found.");

    const localizationsResponse = await this.listAppStoreVersionLocalizations(
      version.id,
      locale
    );

    let localizationId: string;

    if (localizationsResponse.data?.[0]) {
      localizationId = localizationsResponse.data[0].id;

      await this.updateAppStoreVersionLocalization(localizationId, {
        description: data.description,
        keywords: data.keywords,
        promotionalText: data.promotionalText,
        supportUrl: data.supportUrl,
        marketingUrl: data.marketingUrl,
      });
    } else {
      const createResponse = await this.createAppStoreVersionLocalization(
        version.id,
        locale,
        {
          description: data.description,
          keywords: data.keywords,
          promotionalText: data.promotionalText,
          supportUrl: data.supportUrl,
          marketingUrl: data.marketingUrl,
        }
      );

      localizationId = createResponse.data.id;
    }

    return failedFields.length > 0 ? { failedFields } : {};
  }

  async getAllVersions(limit = 50): Promise<AppStoreVersion[]> {
    const appId = await this.findAppId();

    const response = await this.listAppStoreVersions(appId, {
      platform: APP_STORE_PLATFORM,
      limit,
    });

    return sortVersions(response.data || []);
  }

  async getLatestVersion(): Promise<AppStoreVersion | null> {
    const versions = await this.getAllVersions();
    return versions[0] || null;
  }

  incrementVersion(versionString: string): string {
    const parts = versionString.split(".").map(Number);
    while (parts.length < 3) parts.push(0);
    parts[parts.length - 1] = (parts[parts.length - 1] || 0) + 1;
    return parts.join(".");
  }

  async createNewVersion(versionString: string): Promise<AppStoreVersion> {
    const appId = await this.findAppId();

    const versionsResponse = await this.listAppStoreVersions(appId, {
      platform: APP_STORE_PLATFORM,
      limit: 50,
    });

    const existing = versionsResponse.data?.find(
      (v) => v.attributes?.versionString === versionString
    );

    if (existing) {
      console.log(`⚠️  Version ${versionString} already exists.`);
      return existing;
    }

    const createResponse = await this.createAppStoreVersion(
      appId,
      versionString,
      APP_STORE_PLATFORM
    );

    console.log(`✅ Created new version: ${versionString}`);
    return createResponse.data;
  }

  async createNewVersionWithAutoIncrement(
    baseVersion?: string
  ): Promise<AppStoreVersion> {
    let newVersionString: string;

    if (baseVersion) {
      newVersionString = this.incrementVersion(baseVersion);
    } else {
      const latestVersion = await this.getLatestVersion();
      if (!latestVersion) {
        newVersionString = "1.0.0";
        console.log(
          `📦 No existing versions. Starting with ${newVersionString}`
        );
      } else {
        const latest = latestVersion.attributes?.versionString ?? "0.0.0";
        newVersionString = this.incrementVersion(latest);
        console.log(`📦 Latest: ${latest} → New: ${newVersionString}`);
      }
    }

    return this.createNewVersion(newVersionString);
  }

  async updateWhatsNew(options: {
    versionId: string;
    locale: string;
    whatsNew: string;
  }): Promise<void> {
    const { versionId, locale, whatsNew } = options;

    const localizationsResponse = await this.listAppStoreVersionLocalizations(
      versionId,
      locale
    );

    if (localizationsResponse.data?.[0]) {
      const localizationId = localizationsResponse.data[0].id;
      await this.updateAppStoreVersionLocalization(localizationId, {
        whatsNew,
      });
    } else {
      await this.createAppStoreVersionLocalization(versionId, locale, {
        whatsNew,
      });
    }

    console.log(`✅ Updated What's New for ${locale}`);
  }

  async pullReleaseNotes(): Promise<AppStoreReleaseNote[]> {
    const appId = await this.findAppId();

    const versionsResponse = await this.listAppStoreVersions(appId, {
      platform: APP_STORE_PLATFORM,
      limit: 50,
    });

    const releaseNotes: AppStoreReleaseNote[] = [];

    for (const version of versionsResponse.data || []) {
      const localizationsResponse = await this.listAppStoreVersionLocalizations(
        version.id
      );

      const releaseNote = convertToReleaseNote(
        version,
        localizationsResponse.data || []
      );

      if (releaseNote) {
        releaseNotes.push(releaseNote);
      }
    }

    return sortReleaseNotes(releaseNotes);
  }

  private normalizeNextLink(nextLink?: string | null): string | null {
    if (!nextLink) return null;
    return nextLink.replace(APP_STORE_API_BASE_URL, "");
  }

  private async listApps(
    nextUrl = `/apps?limit=${DEFAULT_APP_LIST_LIMIT}`
  ): Promise<ApiResponse<AppStoreApp[]>> {
    return this.requestCollection<AppsResponse>(nextUrl);
  }

  private async findAppByBundleId(
    bundleId: string
  ): Promise<ApiResponse<AppStoreApp[]>> {
    const appsApi = await this.getApi(AppsApi);

    try {
      return await appsApi.appsGetCollection({
        filterBundleId: [bundleId],
      });
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async getApp(appId: string): Promise<ApiResponse<AppStoreApp>> {
    const appsApi = await this.getApi(AppsApi);

    try {
      return await appsApi.appsGetInstance({ id: appId });
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async listAppInfos(appId: string): Promise<ApiResponse<AppInfo[]>> {
    const appsApi = await this.getApi(AppsApi);

    try {
      return await appsApi.appsAppInfosGetToManyRelated({
        id: appId,
        limit: 1,
      });
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async listAppInfoLocalizations(
    appInfoId: string,
    locale?: string
  ): Promise<ApiResponse<AppInfoLocalization[]>> {
    const appInfosApi = await this.getApi(AppInfosApi);

    try {
      return await appInfosApi.appInfosAppInfoLocalizationsGetToManyRelated({
        id: appInfoId,
        filterLocale: locale ? [locale] : undefined,
      });
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async updateAppInfoLocalization(
    localizationId: string,
    attributes: AppInfoLocalizationUpdateAttributes
  ): Promise<void> {
    const appInfoLocalizationsApi = await this.getApi(AppInfoLocalizationsApi);

    try {
      await appInfoLocalizationsApi.appInfoLocalizationsUpdateInstance({
        id: localizationId,
        appInfoLocalizationUpdateRequest: {
          data: {
            type: "appInfoLocalizations",
            id: localizationId,
            attributes,
          },
        },
      });
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async createAppInfoLocalization(
    appInfoId: string,
    locale: string,
    attributes: AppInfoLocalizationUpdateAttributes
  ): Promise<ApiResponse<AppInfoLocalization>> {
    const appInfoLocalizationsApi = await this.getApi(AppInfoLocalizationsApi);

    try {
      return await appInfoLocalizationsApi.appInfoLocalizationsCreateInstance({
        appInfoLocalizationCreateRequest: {
          data: {
            type: "appInfoLocalizations",
            attributes: { locale, ...attributes },
            relationships: {
              appInfo: {
                data: { type: "appInfos", id: appInfoId },
              },
            },
          },
        },
      });
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async listAppStoreVersions(
    appId: string,
    options: { platform?: string; state?: string; limit?: number } = {}
  ): Promise<ApiResponse<AppStoreVersion[]>> {
    const {
      platform = APP_STORE_PLATFORM,
      state,
      limit = DEFAULT_VERSIONS_FETCH_LIMIT,
    } = options;

    const appsApi = await this.getApi(AppsApi);

    try {
      return await appsApi.appsAppStoreVersionsGetToManyRelated({
        id: appId,
        filterPlatform: [
          platform as AppsAppStoreVersionsGetToManyRelatedFilterPlatformEnum,
        ],
        filterAppStoreState: state
          ? [
              state as AppsAppStoreVersionsGetToManyRelatedFilterAppStoreStateEnum,
            ]
          : undefined,
        limit,
      });
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async createAppStoreVersion(
    appId: string,
    versionString: string,
    platform = APP_STORE_PLATFORM
  ): Promise<ApiResponse<AppStoreVersion>> {
    const appStoreVersionsApi = await this.getApi(AppStoreVersionsApi);

    try {
      return await appStoreVersionsApi.appStoreVersionsCreateInstance({
        appStoreVersionCreateRequest: {
          data: {
            type: "appStoreVersions",
            attributes: {
              platform: platform as Platform,
              versionString,
            },
            relationships: {
              app: { data: { type: "apps", id: appId } },
            },
          },
        },
      });
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async listAppStoreVersionLocalizations(
    versionId: string,
    locale?: string
  ): Promise<ApiResponse<AppStoreLocalization[]>> {
    const appStoreVersionsApi = await this.getApi(AppStoreVersionsApi);

    try {
      const response =
        await appStoreVersionsApi.appStoreVersionsAppStoreVersionLocalizationsGetToManyRelated(
          {
            id: versionId,
          }
        );

      if (!locale) return response;

      return {
        ...response,
        data: (response.data || []).filter(
          (localization) => localization.attributes?.locale === locale
        ),
      };
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async getAppStoreVersionLocalization(
    localizationId: string
  ): Promise<ApiResponse<AppStoreLocalization>> {
    const appStoreVersionLocalizationsApi = await this.getApi(
      AppStoreVersionLocalizationsApi
    );

    try {
      return await appStoreVersionLocalizationsApi.appStoreVersionLocalizationsGetInstance(
        { id: localizationId }
      );
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async updateAppStoreVersionLocalization(
    localizationId: string,
    attributes: AppStoreVersionLocalizationUpdateAttributes
  ): Promise<void> {
    const appStoreVersionLocalizationsApi = await this.getApi(
      AppStoreVersionLocalizationsApi
    );

    try {
      await appStoreVersionLocalizationsApi.appStoreVersionLocalizationsUpdateInstance(
        {
          id: localizationId,
          appStoreVersionLocalizationUpdateRequest: {
            data: {
              type: "appStoreVersionLocalizations",
              id: localizationId,
              attributes,
            },
          },
        }
      );
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async createAppStoreVersionLocalization(
    versionId: string,
    locale: string,
    attributes: AppStoreVersionLocalizationUpdateAttributes
  ): Promise<ApiResponse<AppStoreLocalization>> {
    const appStoreVersionLocalizationsApi = await this.getApi(
      AppStoreVersionLocalizationsApi
    );

    try {
      return await appStoreVersionLocalizationsApi.appStoreVersionLocalizationsCreateInstance(
        {
          appStoreVersionLocalizationCreateRequest: {
            data: {
              type: "appStoreVersionLocalizations",
              attributes: { locale, ...attributes },
              relationships: {
                appStoreVersion: {
                  data: { type: "appStoreVersions", id: versionId },
                },
              },
            },
          },
        }
      );
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async listScreenshotSets(
    localizationId: string
  ): Promise<ApiResponse<AppStoreScreenshotSet[]>> {
    const appStoreVersionLocalizationsApi = await this.getApi(
      AppStoreVersionLocalizationsApi
    );

    try {
      return await appStoreVersionLocalizationsApi.appStoreVersionLocalizationsAppScreenshotSetsGetToManyRelated(
        { id: localizationId }
      );
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async listScreenshots(
    screenshotSetId: string
  ): Promise<ApiResponse<AppStoreScreenshot[]>> {
    const appScreenshotSetsApi = await this.getApi(AppScreenshotSetsApi);

    try {
      return await appScreenshotSetsApi.appScreenshotSetsAppScreenshotsGetToManyRelated(
        { id: screenshotSetId }
      );
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private async getApi<T extends BaseAPI>(apiClass: ApiClass<T>): Promise<T> {
    if (!this.apiCache.has(apiClass)) {
      this.apiCache.set(apiClass, this.sdk.create(apiClass));
    }

    return this.apiCache.get(apiClass)! as Promise<T>;
  }

  private normalizeEndpoint(endpoint: string): string {
    if (endpoint.startsWith("http")) return endpoint;
    if (endpoint.startsWith("/v1/")) return endpoint;
    if (endpoint.startsWith("/")) return `/v1${endpoint}`;
    return `/v1/${endpoint}`;
  }

  private async requestCollection<T>(endpoint: string): Promise<T> {
    try {
      const response = await this.sdk.request(
        endpoint.startsWith("http")
          ? { url: endpoint }
          : { path: this.normalizeEndpoint(endpoint) }
      );
      return (await response.json()) as T;
    } catch (error) {
      return await this.handleSdkError(error);
    }
  }

  private formatErrorPayload(payload: unknown): string {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }

  private async handleSdkError(error: unknown): Promise<never> {
    if (error instanceof ResponseError) {
      let errorBody: unknown = null;
      try {
        errorBody = await error.response.json();
      } catch {
        // ignore JSON parse errors for error bodies
      }

      if (error.response.status === 401) {
        throw new Error(
          `App Store Connect API authentication failed (401 Unauthorized)\n` +
            `Issuer ID: ${this.issuerId}\n` +
            `Key ID: ${this.keyId}\n` +
            `Error: ${this.formatErrorPayload(errorBody)}`
        );
      }

      if (error.response.status === 409) {
        const errorDetails = this.formatErrorPayload(errorBody);
        if (errorDetails.includes("STATE_ERROR")) {
          throw new Error(
            `App Store Connect API error: 409 Conflict (STATE_ERROR)\n` +
              `Metadata cannot be modified in current state. Please check app status.\n` +
              `Error: ${errorDetails}`
          );
        }
      }

      const statusText = error.response.statusText || "Unknown Error";
      throw new Error(
        `App Store Connect API error: ${error.response.status} ${statusText}\n${this.formatErrorPayload(errorBody)}`
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error(String(error));
  }
}
