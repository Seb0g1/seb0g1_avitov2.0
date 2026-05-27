import path from "node:path";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  NEXTAUTH_SECRET: z.string().min(24).default("dev-secret-change-me-change-me"),
  ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  AVITO_CLIENT_ID: z.string().optional(),
  AVITO_CLIENT_SECRET: z.string().optional(),
  AVITO_BASE_URL: z.string().url().default("https://api.avito.ru"),
  AVITO_TOKEN_PATH: z.string().default("/token"),
  AVITO_ITEMS_PATH: z.string().default("/items"),
  AVITO_ITEMS_LIST_PATH: z.string().default("/core/v1/items"),
  AVITO_ITEM_DETAIL_PATH: z.string().default("/items/v2/item/{item_id}"),
  AVITO_ITEM_UNPUBLISH_PATH: z.string().default("/core/v1/accounts/{account_id}/items/{item_id}/unpublish"),
  AVITO_ITEM_UNPUBLISH_METHOD: z
    .enum(["POST", "DELETE", "PATCH", "PUT"])
    .default("POST"),
  AVITO_IMPORT_FETCH_DETAILS: z
    .string()
    .default("false")
    .transform((value) => value === "true"),
  AVITO_STATUS_PATH: z.string().optional(),
  AVITO_REPORT_URL: z.string().optional(),
  APP_PUBLIC_URL: z.string().url().default("http://localhost:3433"),
  UPLOAD_DIR: z.string().default("./uploads"),
  EXPORT_DIR: z.string().default("./exports"),
  FEED_PUBLIC_TOKEN: z.string().default("dev-feed-token"),
  STORE_REGION: z.string().default("Москва"),
  STORE_ADDRESS: z.string().default("Москва, ул. Примерная, 1"),
  STORE_PHONE: z.string().default("+7 999 000-00-00"),
  DEFAULT_AVITO_CATEGORY: z.string().default("Одежда, обувь, аксессуары"),
  DEFAULT_CONDITION: z.string().default("Новое")
});

export const env = envSchema.parse(process.env);

export function resolveUploadDir() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.UPLOAD_DIR);
}

export function resolveExportDir() {
  return path.resolve(/* turbopackIgnore: true */ process.cwd(), env.EXPORT_DIR);
}
