export * from "./auth";
export * from "./verify-auth";
export * from "./client";
export { AppStoreClient } from "./client";
export type { AppStoreClientConfig } from "./client";
import { AppStoreClient } from "./client";
import type { AppStoreConfig } from "../core/config";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getProjectRoot } from "../core/config";

/**
 * AppStoreClient 생성 헬퍼 함수
 * AppStoreConfig에서 AppStoreClient 인스턴스를 생성합니다.
 */
export function getAppStoreClient(config: AppStoreConfig & { bundleId: string }): AppStoreClient {
  if (!config) {
    throw new Error("App Store configuration is missing.");
  }

  let privateKey = config.privateKey;

  if (!privateKey) {
    throw new Error("App Store Private Key is required.");
  }

  if (typeof privateKey === "string" && !privateKey.includes("BEGIN PRIVATE KEY")) {
    throw new Error("Invalid Private Key format. PEM format private key is required.");
  }

  return new AppStoreClient({
    bundleId: config.bundleId,
    issuerId: config.issuerId,
    keyId: config.keyId,
    privateKey: privateKey as string,
  });
}
