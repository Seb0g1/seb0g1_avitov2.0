import { env } from "@/server/config/env";
import { getRedis } from "@/server/redis";

const TOKEN_CACHE_KEY = "avito:access-token";
let memoryToken: { token: string; expiresAt: number } | null = null;

type TokenResponse = {
  access_token: string;
  expires_in?: number;
  token_type?: string;
};

function endpoint(path: string) {
  return new URL(path, env.AVITO_BASE_URL).toString();
}

function assertCredentials() {
  if (!env.AVITO_CLIENT_ID || !env.AVITO_CLIENT_SECRET) {
    throw new Error("AVITO_CLIENT_ID и AVITO_CLIENT_SECRET не настроены.");
  }
}

async function readCachedToken() {
  if (memoryToken && memoryToken.expiresAt > Date.now()) {
    return memoryToken.token;
  }

  try {
    const cached = await getRedis().get(TOKEN_CACHE_KEY);
    return cached || null;
  } catch {
    return null;
  }
}

async function writeCachedToken(token: string, expiresIn = 3600) {
  const ttl = Math.max(expiresIn - 60, 60);
  memoryToken = { token, expiresAt: Date.now() + ttl * 1000 };

  try {
    await getRedis().set(TOKEN_CACHE_KEY, token, "EX", ttl);
  } catch {
    // Memory cache keeps local development usable when Redis is offline.
  }
}

export async function getAvitoAccessToken(forceRefresh = false) {
  assertCredentials();

  if (!forceRefresh) {
    const cached = await readCachedToken();
    if (cached) {
      return cached;
    }
  }

  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.AVITO_CLIENT_ID!,
    client_secret: env.AVITO_CLIENT_SECRET!
  });

  const response = await fetch(endpoint(env.AVITO_TOKEN_PATH), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: form
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Avito OAuth error ${response.status}: ${body.slice(0, 300)}`);
  }

  const payload = (await response.json()) as TokenResponse;
  if (!payload.access_token) {
    const errorPayload = payload as TokenResponse & {
      error?: string;
      error_description?: string;
    };
    const description = [errorPayload.error, errorPayload.error_description]
      .filter(Boolean)
      .join(": ");
    throw new Error(
      description
        ? `Avito OAuth did not return access_token: ${description}`
        : "Avito OAuth response does not contain access_token."
    );
  }

  await writeCachedToken(payload.access_token, payload.expires_in);
  return payload.access_token;
}

export async function clearAvitoTokenCache() {
  memoryToken = null;
  try {
    await getRedis().del(TOKEN_CACHE_KEY);
  } catch {
    // Best effort cache invalidation.
  }
}
