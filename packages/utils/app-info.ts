/**
 * 공용 앱 정보 조회 헬퍼 함수
 * App Store와 Google Play에서 앱 정보 및 지원 언어 정보를 가져옵니다.
 */

import { type AppStoreClient } from "@packages/app-store";
import { AppStoreService } from "@servers/mcp/core/services/app-store-service";
import { GooglePlayService } from "@servers/mcp/core/services/google-play-service";
import type {
  RegisteredAppStoreInfo,
  RegisteredGooglePlayInfo,
} from "./registered-apps";

export interface AppStoreAppInfo {
  found: boolean;
  appId?: string;
  name?: string;
  supportedLocales?: string[];
  error?: string;
}

export interface GooglePlayAppInfo {
  found: boolean;
  name?: string;
  supportedLocales?: string[];
  error?: string;
}

/**
 * App Store에서 앱 정보 및 지원 언어 정보 가져오기
 */
export async function fetchAppStoreAppInfo({
  bundleId,
  client,
}: {
  bundleId: string;
  client?: AppStoreClient;
}): Promise<AppStoreAppInfo> {
  const service = new AppStoreService();

  const result = await service.fetchAppInfo(bundleId, client);
  if (!result.found) {
    return { found: false, error: result.error };
  }

  return {
    found: true,
    appId: result.appId,
    name: result.name,
    supportedLocales: result.supportedLocales,
  };
}

/**
 * Google Play에서 앱 정보 및 지원 언어 정보 가져오기
 */
export async function fetchGooglePlayAppInfo({
  packageName,
}: {
  packageName: string;
}): Promise<GooglePlayAppInfo> {
  const service = new GooglePlayService();

  const result = await service.fetchAppInfo(packageName);
  if (!result.found) {
    return { found: false, error: result.error };
  }

  return {
    found: true,
    name: result.name,
    supportedLocales: result.supportedLocales,
  };
}

/**
 * App Store 정보를 RegisteredAppStoreInfo 형식으로 변환
 */
export function toRegisteredAppStoreInfo({
  bundleId,
  appInfo,
}: {
  bundleId: string;
  appInfo: AppStoreAppInfo;
}): RegisteredAppStoreInfo | undefined {
  if (!appInfo.found) {
    return undefined;
  }

  return {
    bundleId,
    appId: appInfo.appId,
    name: appInfo.name,
    supportedLocales: appInfo.supportedLocales,
  };
}

/**
 * Google Play 정보를 RegisteredGooglePlayInfo 형식으로 변환
 */
export function toRegisteredGooglePlayInfo({
  packageName,
  appInfo,
}: {
  packageName: string;
  appInfo: GooglePlayAppInfo;
}): RegisteredGooglePlayInfo | undefined {
  if (!appInfo.found) {
    return undefined;
  }

  return {
    packageName,
    name: appInfo.name,
    supportedLocales: appInfo.supportedLocales,
  };
}
