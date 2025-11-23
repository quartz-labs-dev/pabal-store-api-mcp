/**
 * 등록된 앱 관리
 * secrets/registered-apps.json 파일을 통해 앱 목록 관리
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getProjectRoot } from "./config";

// ============================================================================
// 타입 정의
// ============================================================================

export interface RegisteredAppStoreInfo {
  bundleId: string;
  appId?: string;
  name?: string;
}

export interface RegisteredGooglePlayInfo {
  packageName: string;
  name?: string;
}

export interface RegisteredApp {
  /** 앱 식별자 (사용자 정의, 고유해야 함) */
  slug: string;
  /** 표시 이름 */
  name: string;
  /** App Store 정보 */
  appStore?: RegisteredAppStoreInfo;
  /** Google Play 정보 */
  googlePlay?: RegisteredGooglePlayInfo;
}

export interface RegisteredAppsConfig {
  apps: RegisteredApp[];
}

// ============================================================================
// 파일 경로
// ============================================================================

function getRegisteredAppsPath(): string {
  return resolve(getProjectRoot(), "secrets", "registered-apps.json");
}

// ============================================================================
// CRUD 함수
// ============================================================================

/**
 * 등록된 앱 목록 로드
 */
export function loadRegisteredApps(): RegisteredAppsConfig {
  const filePath = getRegisteredAppsPath();

  if (!existsSync(filePath)) {
    return { apps: [] };
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as RegisteredAppsConfig;
  } catch (error) {
    console.error("❌ Failed to load registered apps:", error);
    return { apps: [] };
  }
}

/**
 * 등록된 앱 목록 저장
 */
export function saveRegisteredApps(config: RegisteredAppsConfig): void {
  const filePath = getRegisteredAppsPath();

  try {
    writeFileSync(filePath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error("❌ Failed to save registered apps:", error);
    throw error;
  }
}

/**
 * 앱 등록
 */
export function registerApp(app: RegisteredApp): RegisteredApp {
  const config = loadRegisteredApps();

  // 중복 체크
  const existing = config.apps.find((a) => a.slug === app.slug);
  if (existing) {
    throw new Error(`App with slug "${app.slug}" already exists`);
  }

  config.apps.push(app);
  saveRegisteredApps(config);

  return app;
}

/**
 * 앱 조회 (slug, bundleId, packageName으로 검색)
 */
export function findApp(identifier: string): RegisteredApp | undefined {
  const config = loadRegisteredApps();

  return config.apps.find(
    (app) =>
      app.slug === identifier ||
      app.appStore?.bundleId === identifier ||
      app.googlePlay?.packageName === identifier
  );
}
