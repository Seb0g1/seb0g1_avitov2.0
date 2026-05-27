import { env } from "@/server/config/env";
import { avitoRequest } from "./client";

export type AvitoItemPayload = {
  title: string;
  description: string;
  price: number;
  category: string;
  address: string;
  contactPhone: string;
  attributes: Record<string, unknown>;
  images: string[];
  externalId: string;
};

export type AvitoItemResponse = {
  id?: string;
  item_id?: string;
  itemId?: string;
};

type AvitoRecord = Record<string, unknown>;

function record(value: unknown): AvitoRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AvitoRecord) : {};
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

export function buildAvitoItemPath(template: string, input: { itemId: string; accountId?: string | null }) {
  return template
    .replaceAll("{item_id}", encodeURIComponent(input.itemId))
    .replaceAll("{itemId}", encodeURIComponent(input.itemId))
    .replaceAll("{account_id}", encodeURIComponent(input.accountId ?? ""))
    .replaceAll("{accountId}", encodeURIComponent(input.accountId ?? ""));
}

async function fetchSelfAccountId() {
  if (!env.AVITO_ITEM_UNPUBLISH_PATH.includes("{account_id}") && !env.AVITO_ITEM_UNPUBLISH_PATH.includes("{accountId}")) {
    return null;
  }

  const self = record(await avitoRequest<unknown>("/core/v1/accounts/self", { method: "GET" }));
  return firstString(self.id, self.user_id, self.account_id);
}

export async function createAvitoItem(payload: AvitoItemPayload) {
  const response = await avitoRequest<AvitoItemResponse>(env.AVITO_ITEMS_PATH, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return response.id ?? response.item_id ?? response.itemId ?? null;
}

export async function unpublishAvitoItem(itemId: string) {
  const accountId = await fetchSelfAccountId();
  const path = buildAvitoItemPath(env.AVITO_ITEM_UNPUBLISH_PATH, { itemId, accountId });
  await avitoRequest<unknown>(path, {
    method: env.AVITO_ITEM_UNPUBLISH_METHOD
  });
}
