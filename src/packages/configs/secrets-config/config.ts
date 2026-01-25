import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { ERROR_CODES } from "@/packages/common/errors/error-codes";
import { HTTP_STATUS } from "@/packages/common/errors/status-codes";
import { ConfigError } from "./errors";
import { DATA_DIR_ENV_KEY } from "./constants";
import { appStoreSchema, playStoreSchema } from "./schemas";
import type { EnvConfig } from "./types";

// Config paths
const CONFIG_DIR = join(homedir(), ".config", "pabal-store-api-mcp");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

// Security: recommended permissions
const RECOMMENDED_DIR_MODE = 0o700; // drwx------
const RECOMMENDED_FILE_MODE = 0o600; // -rw-------

/**
 * Check file/directory permissions and warn if too permissive
 */
function checkPermissions(path: string, isDirectory: boolean): void {
  try {
    const stats = statSync(path);
    const mode = stats.mode & 0o777;
    const recommended = isDirectory
      ? RECOMMENDED_DIR_MODE
      : RECOMMENDED_FILE_MODE;

    // Check if "group" or "others" have any permissions
    const groupOthersPerms = mode & 0o077;
    if (groupOthersPerms !== 0) {
      const typeLabel = isDirectory ? "directory" : "file";
      const recommendedStr = recommended.toString(8);
      console.error(
        `[Security] ⚠️  Warning: ${typeLabel} "${path}" has permissive permissions (${mode.toString(8)})`
      );
      console.error(`[Security]    Run: chmod ${recommendedStr} "${path}"`);
    }
  } catch {
    // Ignore permission check errors
  }
}

/**
 * Check all config files for secure permissions
 */
function checkConfigSecurity(configDir: string): void {
  // Check directory permissions
  checkPermissions(configDir, true);

  // Check all files in config directory
  const sensitiveFiles = [
    "config.json",
    "app-store-key.p8",
    "google-play-service-account.json",
    "registered-apps.json",
  ];

  for (const file of sensitiveFiles) {
    const filePath = join(configDir, file);
    if (existsSync(filePath)) {
      checkPermissions(filePath, false);
    }
  }
}

/**
 * Get config directory path: ~/.config/pabal-mcp/
 */
export function getConfigDir(): string {
  return CONFIG_DIR;
}

/**
 * Get config file path: ~/.config/pabal-mcp/config.json
 */
export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function readConfigFile(): any {
  const configPath = getConfigPath();

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
  const configDir = getConfigDir();

  console.error(`[Config] 🔍 Checking data directory config...`);

  // 1. Check config file first
  const config = readConfigFile();
  if (config?.dataDir && typeof config.dataDir === "string") {
    const normalized = config.dataDir.trim();
    if (normalized) {
      const resultDir = isAbsolute(normalized)
        ? normalized
        : resolve(configDir, normalized);
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
      : resolve(configDir, normalized);
    console.error(`[Config]   ✅ Using environment variable: ${resultDir}`);
    return resultDir;
  }

  // 3. Default to config directory
  console.error(`[Config]   ✅ Using default (config dir): ${configDir}`);
  return configDir;
}

export function loadConfig(): EnvConfig {
  const configDir = getConfigDir();

  // Security check: warn if permissions are too permissive
  checkConfigSecurity(configDir);

  const config = readConfigFile();

  if (!config) {
    const configPath = getConfigPath();
    throw new ConfigError(
      `Config file not found: ${configPath}\n` +
        `Please create ~/.config/pabal-mcp/config.json`,
      { status: HTTP_STATUS.NOT_FOUND, code: ERROR_CODES.CONFIG_NOT_FOUND }
    );
  }

  try {
    const result: EnvConfig = {};

    if (config.appStore) {
      const { issuerId, keyId, privateKeyPath } = config.appStore;
      if (issuerId && keyId && privateKeyPath) {
        const keyPath = isAbsolute(privateKeyPath)
          ? privateKeyPath
          : resolve(configDir, privateKeyPath);
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

    if (config.googlePlay?.serviceAccountKeyPath) {
      const serviceAccountPath = config.googlePlay.serviceAccountKeyPath;
      const jsonPath = isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : resolve(configDir, serviceAccountPath);
      const json = readFileSafe(jsonPath);
      if (json) {
        result.playStore = playStoreSchema.parse({
          serviceAccountJson: json,
        });
      }
    }

    if (!result.appStore && !result.playStore) {
      throw new ConfigError(
        "Config file does not contain App Store or Play Store authentication information.",
        {
          status: HTTP_STATUS.UNAUTHORIZED,
          code: ERROR_CODES.CONFIG_AUTH_NOT_FOUND,
        }
      );
    }

    return result;
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error;
    }
    throw new ConfigError(
      `Error reading config file: ${
        error instanceof Error ? error.message : String(error)
      }`,
      {
        status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
        code: ERROR_CODES.CONFIG_READ_FAILED,
        cause: error,
      }
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
