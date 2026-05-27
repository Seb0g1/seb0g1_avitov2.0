import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import { clearAvitoTokenCache, getAvitoAccessToken } from "./tokenService";

type AvitoRequestOptions = RequestInit & {
  skipAuthRefresh?: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function urlFor(path: string) {
  return new URL(path, env.AVITO_BASE_URL).toString();
}

function redact(value: string) {
  let redacted = value;
  if (env.AVITO_CLIENT_ID) {
    redacted = redacted.replaceAll(env.AVITO_CLIENT_ID, "[client_id]");
  }
  if (env.AVITO_CLIENT_SECRET) {
    redacted = redacted.replaceAll(env.AVITO_CLIENT_SECRET, "[client_secret]");
  }
  return redacted;
}

export async function avitoRequest<T>(path: string, options: AvitoRequestOptions = {}): Promise<T> {
  const maxAttempts = 3;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const token = await getAvitoAccessToken();
      const headers = new Headers(options.headers);
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("Accept", "application/json");
      if (options.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(urlFor(path), {
        ...options,
        headers
      });

      if (response.status === 401 && !options.skipAuthRefresh) {
        await clearAvitoTokenCache();
        return avitoRequest<T>(path, { ...options, skipAuthRefresh: true });
      }

      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < maxAttempts) {
        await sleep(400 * 2 ** (attempt - 1));
        continue;
      }

      if (!response.ok) {
        const body = redact(await response.text());
        throw new Error(`Avito API error ${response.status}: ${body.slice(0, 600)}`);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(400 * 2 ** (attempt - 1));
        continue;
      }
    }
  }

  const message = lastError instanceof Error ? redact(lastError.message) : "Unknown Avito request error";
  await prisma.errorLog.create({
    data: {
      source: "avitoApi",
      message,
      details: { path }
    }
  });
  throw new Error(message);
}
