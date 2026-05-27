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

export async function createAvitoItem(payload: AvitoItemPayload) {
  const response = await avitoRequest<AvitoItemResponse>(env.AVITO_ITEMS_PATH, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return response.id ?? response.item_id ?? response.itemId ?? null;
}
