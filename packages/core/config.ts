import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { ConfigError } from "./errors";

const appStoreSchema = z.object({
  keyId: z.string().min(1),
  issuerId: z.string().min(1),
  privateKey: z.string().min(1), // PEM 포맷 문자열
});

const playStoreSchema = z.object({
  serviceAccountJson: z.string().min(1), // JSON 문자열
});

export type AppStoreConfig = z.infer<typeof appStoreSchema>;
export type PlayStoreConfig = z.infer<typeof playStoreSchema>;

export type EnvConfig = {
  appStore?: AppStoreConfig;
  playStore?: PlayStoreConfig;
};

export function loadConfig(env = process.env): EnvConfig {
  const appStoreEnv =
    env.APPLE_KEY_ID && env.APPLE_ISSUER_ID && env.APPLE_PRIVATE_KEY
      ? appStoreSchema.parse({
          keyId: env.APPLE_KEY_ID,
          issuerId: env.APPLE_ISSUER_ID,
          privateKey: normalizePrivateKey(env.APPLE_PRIVATE_KEY),
        })
      : undefined;

  const playStoreEnv = resolvePlayServiceAccount(env);

  if (!appStoreEnv && !playStoreEnv) {
    throw new ConfigError(
      "환경변수에 App Store 또는 Play Store 인증 정보가 없습니다.",
    );
  }

  return {
    appStore: appStoreEnv,
    playStore: playStoreEnv,
  };
}

function resolvePlayServiceAccount(
  env: NodeJS.ProcessEnv,
): PlayStoreConfig | undefined {
  if (env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return playStoreSchema.parse({
      serviceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
    });
  }

  if (env.GOOGLE_SERVICE_ACCOUNT_PATH) {
    const path = resolve(env.GOOGLE_SERVICE_ACCOUNT_PATH);
    const json = readFileSafe(path);
    if (json) {
      return playStoreSchema.parse({
        serviceAccountJson: json,
      });
    }
  }

  return undefined;
}

function readFileSafe(path: string): string | undefined {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return undefined;
  }
}

// 환경 변수에 PEM이 단일 라인으로 들어있을 때 줄바꿈 복원
function normalizePrivateKey(raw: string): string {
  if (raw.includes("-----BEGIN")) {
    return raw;
  }
  const restored = raw.replace(/\\n/g, "\n");
  return restored;
}
