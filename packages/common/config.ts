import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { ConfigError } from "@packages/common/errors";

export const DATA_DIR_ENV_KEY = "PABAL_MCP_DATA_DIR";

// Find project root path
// From packages/common/config.ts, go up 2 levels to reach project root
export const getProjectRoot = (): string => {
  try {
    // For ES modules
    if (typeof import.meta !== "undefined" && import.meta.url) {
      const currentFile = fileURLToPath(import.meta.url);
      return resolve(dirname(currentFile), "../..");
    }
  } catch {
    // For CommonJS or when import.meta is not available
  }
  // fallback: use process.cwd()
  return process.cwd();
};

function readConfigFile(): any {
  const projectRoot = getProjectRoot();
  const configPath = resolve(projectRoot, "secrets/aso-config.json");

  if (!existsSync(configPath)) {
    return null;
  }

  try {
    const configContent = readFileSync(configPath, "utf-8");
    return JSON.parse(configContent);
  } catch (error) {
    console.error(
      `[Config]   ⚠️  Failed to read config file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}

export function getDataDir(): string {
  const projectRoot = getProjectRoot();

  console.error(`[Config] 🔍 Checking data directory config...`);
  console.error(`[Config]   Project Root: ${projectRoot}`);

  // 1. Check config file first
  const config = readConfigFile();
  if (config?.dataDir && typeof config.dataDir === "string") {
    const normalized = config.dataDir.trim();
    if (normalized) {
      const resultDir = isAbsolute(normalized)
        ? normalized
        : resolve(projectRoot, normalized);
      console.error(`[Config]   ✅ Using config file dataDir: ${resultDir}`);
      return resultDir;
    }
  }

  // 2. Check environment variable
  const override = process.env[DATA_DIR_ENV_KEY];
  if (override && override.trim()) {
    const normalized = override.trim();
    const resultDir = isAbsolute(normalized)
      ? normalized
      : resolve(projectRoot, normalized);
    console.error(`[Config]   ✅ Using environment variable: ${resultDir}`);
    return resultDir;
  }

  // 3. Default to project root
  console.error(`[Config]   ✅ Using default (project root): ${projectRoot}`);
  return projectRoot;
}

const appStoreSchema = z.object({
  keyId: z.string().min(1),
  issuerId: z.string().min(1),
  privateKey: z.string().min(1), // PEM format string
});

const playStoreSchema = z.object({
  serviceAccountJson: z.string().min(1), // JSON string
});

export type AppStoreConfig = z.infer<typeof appStoreSchema>;
export type PlayStoreConfig = z.infer<typeof playStoreSchema>;

export type EnvConfig = {
  appStore?: AppStoreConfig;
  playStore?: PlayStoreConfig;
};

export function loadConfig(): EnvConfig {
  // Read secrets/aso-config.json file relative to project root
  const projectRoot = getProjectRoot();
  const config = readConfigFile();

  if (!config) {
    const configPath = resolve(projectRoot, "secrets/aso-config.json");
    throw new ConfigError(
      `secrets/aso-config.json file not found or failed to parse: ${configPath}`
    );
  }

  try {
    const result: EnvConfig = {};

    // Load App Store configuration
    if (config.appStore) {
      const { issuerId, keyId, privateKeyPath } = config.appStore;
      if (issuerId && keyId && privateKeyPath) {
        // Resolve relative path relative to project root
        const keyPath = resolve(projectRoot, privateKeyPath);
        const privateKey = readFileSafe(keyPath);
        if (privateKey) {
          result.appStore = appStoreSchema.parse({
            keyId,
            issuerId,
            privateKey: normalizePrivateKey(privateKey),
          });
        }
      }
    }

    // Load Play Store configuration
    if (config.googlePlay?.serviceAccountKeyPath) {
      // Resolve relative path relative to project root
      const jsonPath = resolve(
        projectRoot,
        config.googlePlay.serviceAccountKeyPath
      );
      const json = readFileSafe(jsonPath);
      if (json) {
        result.playStore = playStoreSchema.parse({
          serviceAccountJson: json,
        });
      }
    }

    if (!result.appStore && !result.playStore) {
      throw new ConfigError(
        "secrets/aso-config.json file does not contain App Store or Play Store authentication information."
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(
      `Error reading secrets/aso-config.json file: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function readFileSafe(path: string): string | undefined {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return undefined;
  }
}

// Restore line breaks in PEM key
function normalizePrivateKey(raw: string): string {
  if (raw.includes("-----BEGIN")) {
    return raw;
  }
  const restored = raw.replace(/\\n/g, "\n");
  return restored;
}
