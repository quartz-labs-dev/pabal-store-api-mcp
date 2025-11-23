import { SignJWT, importPKCS8 } from "jose";
import type { AppStoreConfig } from "../core/config";

type JwtOptions = {
  now?: number; // seconds
  expirationSeconds?: number; // default 600, capped at 1200
};

const AUDIENCE = "appstoreconnect-v1";
const MAX_EXP_SECONDS = 60 * 20;
const DEFAULT_EXP_SECONDS = 60 * 10;

export async function createAppStoreJWT(
  config: AppStoreConfig,
  options: JwtOptions = {}
): Promise<string> {
  const nowSeconds = options.now ?? Math.floor(Date.now() / 1000);
  const expSeconds = Math.min(
    options.expirationSeconds ?? DEFAULT_EXP_SECONDS,
    MAX_EXP_SECONDS
  );

  // Private key 정규화
  const normalizedKey = config.privateKey.replace(/\\n/g, "\n").trim();

  // PKCS8 형식의 private key를 import
  const privateKey = await importPKCS8(normalizedKey, "ES256");

  // JWT 생성 (App Store Connect API는 iat를 요구하지 않음)
  const jwt = await new SignJWT({
    iss: config.issuerId,
    aud: AUDIENCE,
  })
    .setProtectedHeader({
      alg: "ES256",
      kid: config.keyId,
      typ: "JWT",
    })
    .setExpirationTime(nowSeconds + expSeconds)
    .sign(privateKey);

  return jwt;
}

export function decodeJwt(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
} {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    throw new Error("Invalid JWT format");
  }
  return {
    header: JSON.parse(Buffer.from(header, "base64url").toString("utf-8")),
    payload: JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")),
    signature,
  };
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
