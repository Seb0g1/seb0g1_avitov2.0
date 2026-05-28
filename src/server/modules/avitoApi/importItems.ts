import crypto from "node:crypto";
import { Prisma, VariantStatus } from "@prisma/client";
import { clothingColorOptions, normalizeAvitoColor } from "@/lib/avitoOptions";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import { avitoRequest } from "./client";

type AvitoRecord = Record<string, unknown>;

type NormalizedAvitoItem = {
  avitoItemId: string;
  sourceExternalId: string | null;
  localExternalId: LocalFeedExternalId | null;
  title: string;
  productTitle: string;
  productGroupKey: string | null;
  productGroupSource: "explicit" | "autoload" | "title" | null;
  description: string | null;
  price: number;
  quantity: number;
  status: VariantStatus;
  category: string;
  brand: string | null;
  color: string;
  size: string;
  photos: string[];
  url: string | null;
  raw: AvitoRecord;
};

type LocalFeedExternalId = {
  productId: string;
  variantId: string;
};

type ExistingImportMatch = {
  variant: Awaited<ReturnType<typeof findVariantByAvitoId>> | null;
  duplicateVariant: Awaited<ReturnType<typeof findVariantByAvitoId>> | null;
};

const sizeTokens = new Set([
  "XXS",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
  "2XL",
  "3XL",
  "4XL",
  "5XL",
  "ONE",
  "OS"
]);

const translitColors: Record<string, string> = {
  BELYY: "Белый",
  BELYI: "Белый",
  BELIY: "Белый",
  BELYJ: "Белый",
  WHITE: "Белый",
  CHERNYI: "Черный",
  CHERNIY: "Черный",
  CHERNYY: "Черный",
  CHERNIYI: "Черный",
  BLACK: "Черный",
  SERYI: "Серый",
  SERYY: "Серый",
  GREY: "Серый",
  GRAY: "Серый",
  ZELENYI: "Зеленый",
  ZELENYY: "Зеленый",
  GREEN: "Зеленый",
  KRASNYY: "Красный",
  KRASNYI: "Красный",
  RED: "Красный",
  SINIY: "Синий",
  SINYY: "Синий",
  BLUE: "Синий",
  BEZHEVYY: "Бежевый",
  BEZHEVYI: "Бежевый",
  BEIGE: "Бежевый",
  KORICHNEVYY: "Коричневый",
  BROWN: "Коричневый",
  ROZOVYY: "Розовый",
  PINK: "Розовый",
  FIOLETOVYY: "Фиолетовый",
  PURPLE: "Фиолетовый",
  ORANZHEVYY: "Оранжевый",
  ORANGE: "Оранжевый",
  GOLOBOY: "Голубой"
};

const russianColors = new Set([
  ...clothingColorOptions,
  "Черный",
  "Зеленый",
  "Желтый"
]);

const knownBrands = [
  "Acne Studios",
  "Stone Island",
  "New Balance",
  "Louis Vuitton",
  "Ralph Lauren",
  "Palm Angels",
  "Comme des Garcons",
  "Nike x Stussy",
  "Nike",
  "Stussy",
  "Balenciaga",
  "Adidas",
  "Supreme",
  "Carhartt",
  "Arc'teryx",
  "Arcteryx",
  "Patagonia",
  "Jordan",
  "Puma",
  "Reebok"
];

const UNKNOWN_VALUE = "Не указан";
const localIdPattern = /^c[a-z0-9]{10,}$/i;

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

function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(",", ".").replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    const valueRecord = record(value);
    if (typeof valueRecord.value === "number") {
      return valueRecord.value;
    }
  }
  return 0;
}

export function parseLocalFeedExternalId(value: unknown): LocalFeedExternalId | null {
  const text = firstString(value);
  if (!text) {
    return null;
  }

  const separatorIndex = text.lastIndexOf("-");
  if (separatorIndex <= 0 || separatorIndex === text.length - 1) {
    return null;
  }

  const productId = text.slice(0, separatorIndex);
  const variantId = text.slice(separatorIndex + 1);
  if (!localIdPattern.test(productId) || !localIdPattern.test(variantId)) {
    return null;
  }

  return { productId, variantId };
}

function getNested(source: AvitoRecord, path: string) {
  return path.split(".").reduce<unknown>((current, key) => record(current)[key], source);
}

function attribute(source: AvitoRecord, names: string[]) {
  const attrs = [
    source.attributes,
    source.params,
    source.properties,
    source.characteristics,
    source.item
  ].map(record);

  for (const name of names) {
    const direct = firstString(source[name], source[name.toLowerCase()]);
    if (direct) {
      return direct;
    }

    for (const attrRecord of attrs) {
      const directAttr = firstString(attrRecord[name], attrRecord[name.toLowerCase()]);
      if (directAttr) {
        return directAttr;
      }
    }
  }

  const arrayAttrs = [source.attributes, source.params, source.properties, source.characteristics].filter(Array.isArray);
  for (const array of arrayAttrs as unknown[][]) {
    for (const item of array) {
      const itemRecord = record(item);
      const key = firstString(itemRecord.name, itemRecord.title, itemRecord.code, itemRecord.slug);
      if (!key) {
        continue;
      }
      if (names.some((name) => key.toLowerCase() === name.toLowerCase())) {
        const value = firstString(itemRecord.value, itemRecord.text, itemRecord.values);
        if (value) {
          return value;
        }
      }
    }
  }

  return null;
}

function externalId(source: AvitoRecord) {
  const nestedItem = record(source.item);
  return firstString(
    source.autoload_item_id,
    source.autoloadItemId,
    source.autoloadId,
    source.autoload_id,
    source.external_id,
    source.externalId,
    source.xml_id,
    source.xmlId,
    nestedItem.autoload_item_id,
    nestedItem.autoloadItemId,
    nestedItem.autoloadId,
    nestedItem.autoload_id,
    nestedItem.external_id,
    nestedItem.externalId,
    nestedItem.xml_id,
    nestedItem.xmlId
  );
}

function parseAutoloadAttributes(source: AvitoRecord) {
  const autoloadId = externalId(source);
  if (!autoloadId) {
    return {};
  }

  const tokens = autoloadId
    .split(/[-_]/)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
  const size = [...tokens].reverse().find((token) => sizeTokens.has(token));
  const sizeIndex = size ? tokens.lastIndexOf(size) : -1;
  const colorToken =
    sizeIndex > 0
      ? tokens
          .slice(0, sizeIndex)
          .reverse()
          .find((token) => translitColors[token])
      : tokens.find((token) => translitColors[token]);

  return {
    autoloadId,
    color: colorToken ? translitColors[colorToken] : undefined,
    size,
    groupKey: buildAutoloadGroupKey(autoloadId)
  };
}

function buildAutoloadGroupKey(autoloadId: string) {
  const tokens = autoloadId
    .split(/[-_]/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length <= 2) {
    return autoloadId;
  }

  const upper = tokens.map((token) => token.toUpperCase());
  const size = [...upper].reverse().find((token) => sizeTokens.has(token));
  const sizeIndex = size ? upper.lastIndexOf(size) : -1;
  if (sizeIndex > 0) {
    const beforeSize = upper[sizeIndex - 1];
    if (translitColors[beforeSize]) {
      return tokens.slice(0, sizeIndex - 1).join("-");
    }
    return tokens.slice(0, sizeIndex).join("-");
  }

  return autoloadId;
}

function inferColorFromTitle(title: string) {
  const match = title.match(/\(([^)]+)\)/);
  const value = match?.[1]?.trim();
  return value && russianColors.has(value) ? normalizeAvitoColor(value) : null;
}

function inferBrandFromTitle(title: string) {
  const cleaned = title
    .replace(/\([^)]*\)/g, "")
    .replace(/^(футболка|худи|толстовка|кофта|штаны|джинсы|кроссовки|кеды|куртка|лонгслив|свитшот)\s+/i, "")
    .trim();
  const lower = cleaned.toLowerCase();
  const known = knownBrands.find((brand) => lower.startsWith(brand.toLowerCase()));
  if (known) {
    return known;
  }

  return cleaned.split(/\s+/)[0] || null;
}

function normalizeProductTitle(title: string) {
  return title
    .replace(/\([^)]*\)/g, "")
    .replace(/\b(XXS|XS|S|M|L|XL|XXL|XXXL|2XL|3XL|4XL|5XL)\b/gi, "")
    .replace(/\b(46|48|50|52|54|56)\s*\((S|M|L|XL|XXL|2XL)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stableProductId(groupKey: string) {
  const hash = crypto.createHash("sha1").update(groupKey).digest("hex").slice(0, 16);
  return `avito-group-${hash}`;
}

export function buildImportedProductGroupKey(item: {
  title: string;
  brand?: string | null;
  category?: string | null;
  raw?: AvitoRecord | null;
}) {
  const raw = record(item.raw);
  const nestedItem = record(raw.item);
  const explicit = firstString(
    raw.multiItemGroup,
    raw.multi_item_group,
    raw.group_id,
    raw.multi_item_id,
    raw.multiItemId,
    raw.multi_group_id,
    nestedItem.multiItemGroup,
    nestedItem.multi_item_group,
    attribute(raw, ["multiItemGroup", "multi_item_group", "group_id", "multi_item_id"])
  );
  if (explicit) {
    return {
      key: `explicit:${explicit}`,
      title: normalizeProductTitle(item.title) || item.title,
      source: "explicit" as const
    };
  }

  const autoloadId = externalId(raw);
  if (autoloadId) {
    return {
      key: `autoload:${buildAutoloadGroupKey(autoloadId)}`,
      title: normalizeProductTitle(item.title) || item.title,
      source: "autoload" as const
    };
  }

  const normalizedTitle = normalizeProductTitle(item.title);
  if (normalizedTitle && item.brand && item.category) {
    return {
      key: `title:${item.category}:${item.brand}:${normalizedTitle.toLowerCase()}`,
      title: normalizedTitle,
      source: "title" as const
    };
  }

  return null;
}

function normalizeStatus(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  if (["active", "published", "online", "activated"].includes(text)) return VariantStatus.PUBLISHED;
  if (["moderation", "on_moderation", "on moderation", "pending"].includes(text)) return VariantStatus.MODERATION;
  if (["removed", "closed", "stopped", "archived"].includes(text)) return VariantStatus.REMOVED;
  if (["rejected", "blocked", "error", "failed"].includes(text)) return VariantStatus.ERROR;
  if (["draft"].includes(text)) return VariantStatus.DRAFT;
  return VariantStatus.UPLOADED;
}

function collectPhotos(source: AvitoRecord) {
  const candidates = [
    source.images,
    source.photos,
    source.image_urls,
    source.imageUrls,
    source.pictures,
    getNested(source, "item.images"),
    getNested(source, "item.photos")
  ];

  const urls = new Set<string>();
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) {
      continue;
    }

    for (const image of candidate) {
      const imageRecord = record(image);
      const url = firstString(
        image,
        imageRecord.url,
        imageRecord.href,
        imageRecord.link,
        imageRecord.preview,
        imageRecord["640x480"],
        imageRecord["1280x960"]
      );
      if (url) {
        urls.add(url);
      }
    }
  }

  return [...urls];
}

function extractItems(payload: unknown): AvitoRecord[] {
  const payloadRecord = record(payload);
  const candidates = [
    payload,
    payloadRecord.items,
    payloadRecord.resources,
    payloadRecord.ads,
    payloadRecord.data,
    getNested(payloadRecord, "result.items"),
    getNested(payloadRecord, "data.items"),
    getNested(payloadRecord, "data.resources")
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(record).filter((item) => Object.keys(item).length > 0);
    }
  }

  return [];
}

function normalizeItem(source: AvitoRecord): NormalizedAvitoItem | null {
  const nestedItem = record(source.item);
  const itemId = firstString(
    source.id,
    source.item_id,
    source.itemId,
    source.avito_id,
    source.avitoId,
    nestedItem.id,
    nestedItem.item_id
  );
  if (!itemId) {
    return null;
  }

  const title = firstString(source.title, source.name, nestedItem.title, nestedItem.name) ?? `Avito item ${itemId}`;
  const description = firstString(source.description, source.desc, nestedItem.description);
  const categoryRecord = record(source.category);
  const nestedCategoryRecord = record(nestedItem.category);
  const category =
    firstString(
      categoryRecord.name,
      nestedCategoryRecord.name,
      source.category,
      source.category_name,
      source.categoryName,
      nestedItem.category
    ) ??
    env.DEFAULT_AVITO_CATEGORY;
  const autoloadAttributes = parseAutoloadAttributes(source);
  const sourceExternalId = autoloadAttributes.autoloadId ?? null;
  const localExternalId = parseLocalFeedExternalId(sourceExternalId);
  const brand = attribute(source, ["brand", "бренд"]) ?? inferBrandFromTitle(title);
  const color =
    normalizeAvitoColor(
      attribute(source, ["color", "цвет"]) ??
        inferColorFromTitle(title) ??
        autoloadAttributes.color ??
        UNKNOWN_VALUE
    ) || UNKNOWN_VALUE;
  const size = attribute(source, ["size", "размер"]) ?? autoloadAttributes.size ?? UNKNOWN_VALUE;
  const price = firstNumber(source.price, source.price_value, nestedItem.price);
  const status = normalizeStatus(source.status ?? source.state ?? nestedItem.status ?? nestedItem.state);
  const group = buildImportedProductGroupKey({
    title,
    brand,
    category,
    raw: source
  });

  return {
    avitoItemId: itemId,
    sourceExternalId,
    localExternalId,
    title,
    productTitle: group?.title ?? title,
    productGroupKey: group?.key ?? null,
    productGroupSource: group?.source ?? null,
    description,
    price,
    quantity: Math.max(1, Math.trunc(firstNumber(source.quantity, source.count, nestedItem.quantity) || 1)),
    status,
    category,
    brand,
    color,
    size,
    photos: collectPhotos(source),
    url: firstString(source.url, source.uri, nestedItem.url),
    raw: {
      ...source,
      inferred: {
        brand,
        color,
        size,
        autoloadItemId: autoloadAttributes.autoloadId,
        localProductId: localExternalId?.productId,
        localVariantId: localExternalId?.variantId,
        autoloadGroupKey: autoloadAttributes.groupKey,
        productGroupKey: group?.key,
        productGroupSource: group?.source
      }
    }
  };
}

function withQuery(path: string, page: number, perPage: number) {
  const url = new URL(path, "https://placeholder.local");
  if (!url.searchParams.has("page")) url.searchParams.set("page", String(page));
  if (!url.searchParams.has("per_page")) url.searchParams.set("per_page", String(perPage));
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", String(perPage));
  return `${url.pathname}${url.search}`;
}

async function fetchSelfAccountId() {
  try {
    const self = record(await avitoRequest<unknown>("/core/v1/accounts/self", { method: "GET" }));
    return firstString(self.id, self.user_id, self.account_id);
  } catch (error) {
    await prisma.errorLog.create({
      data: {
        source: "avitoImport",
        message: error instanceof Error ? error.message : "Could not fetch Avito account",
        details: {}
      }
    });
    return null;
  }
}

async function fetchDetail(itemId: string, accountId?: string | null) {
  const path = accountId
    ? `/core/v1/accounts/${encodeURIComponent(accountId)}/items/${encodeURIComponent(itemId)}`
    : env.AVITO_ITEM_DETAIL_PATH.replace("{item_id}", encodeURIComponent(itemId));
  try {
    return record(await avitoRequest<unknown>(path, { method: "GET" }));
  } catch (error) {
    await prisma.errorLog.create({
      data: {
        source: "avitoImport",
        message: error instanceof Error ? error.message : "Could not fetch Avito item detail",
        details: { itemId }
      }
    });
    return null;
  }
}

function findVariantByAvitoId(avitoItemId: string) {
  return prisma.variant.findUnique({
    where: { avitoItemId },
    include: { product: true }
  });
}

function findVariantByLocalExternalId(localExternalId: LocalFeedExternalId | null) {
  if (!localExternalId) {
    return null;
  }

  return prisma.variant.findFirst({
    where: {
      id: localExternalId.variantId,
      productId: localExternalId.productId
    },
    include: { product: true }
  });
}

async function findExistingImportMatch(item: NormalizedAvitoItem): Promise<ExistingImportMatch> {
  const [variantByAvitoId, variantByLocalExternalId] = await Promise.all([
    findVariantByAvitoId(item.avitoItemId),
    findVariantByLocalExternalId(item.localExternalId)
  ]);

  if (variantByLocalExternalId) {
    return {
      variant: variantByLocalExternalId,
      duplicateVariant:
        variantByAvitoId && variantByAvitoId.id !== variantByLocalExternalId.id
          ? variantByAvitoId
          : null
    };
  }

  return { variant: variantByAvitoId, duplicateVariant: null };
}

async function deleteDuplicateImportedVariant(match: ExistingImportMatch) {
  if (!match.duplicateVariant || !match.variant) {
    return;
  }

  const duplicateProductId = match.duplicateVariant.productId;
  await prisma.variant.delete({ where: { id: match.duplicateVariant.id } });
  if (duplicateProductId !== match.variant.productId) {
    const remainingVariants = await prisma.variant.count({ where: { productId: duplicateProductId } });
    if (remainingVariants === 0 && duplicateProductId.startsWith("avito-")) {
      await prisma.product.delete({ where: { id: duplicateProductId } });
    }
  }
}

async function importOne(item: NormalizedAvitoItem) {
  const match = await findExistingImportMatch(item);
  await deleteDuplicateImportedVariant(match);

  const existingVariant = match.variant;

  const previousProductId = existingVariant?.productId;
  const productId = previousProductId ?? (item.productGroupKey
    ? stableProductId(item.productGroupKey)
    : `avito-${item.avitoItemId}`);
  const product = await prisma.product.upsert({
    where: { id: productId },
    create: {
      id: productId,
      title: item.productTitle,
      brand: item.brand,
      baseCategory: item.category,
      baseDescription: item.description,
      avitoAttributes: item.raw as Prisma.InputJsonValue
    },
    update: {
      title: item.productTitle,
      brand: item.brand ?? undefined,
      baseCategory: item.category,
      baseDescription: item.description ?? undefined,
      avitoAttributes: item.raw as Prisma.InputJsonValue
    }
  });

  const lastError = item.status === VariantStatus.ERROR ? "Imported Avito item has error/rejected status" : null;
  const lastSyncedAt = new Date();
  const createData = {
    productId: product.id,
    title: product.title,
    color: item.color,
    size: item.size,
    price: item.price,
    quantity: item.quantity,
    description: item.description ?? undefined,
    status: item.status,
    avitoItemId: item.avitoItemId,
    lastSyncedAt,
    lastError
  };
  const updateData = {
    productId: product.id,
    title: product.title,
    color: item.color === UNKNOWN_VALUE ? undefined : item.color,
    size: item.size === UNKNOWN_VALUE ? undefined : item.size,
    price: item.price,
    quantity: item.quantity,
    description: item.description ?? undefined,
    status: item.status,
    avitoItemId: item.avitoItemId,
    lastSyncedAt,
    lastError
  };
  const variant = existingVariant
    ? await prisma.variant.update({
        where: { id: existingVariant.id },
        data: updateData
      })
    : await prisma.variant.upsert({
        where: { avitoItemId: item.avitoItemId },
        create: createData,
        update: updateData
      });

  if (item.photos.length > 0) {
    await prisma.photo.deleteMany({
      where: {
        variantId: variant.id,
        path: { startsWith: "https://" }
      }
    });

    await prisma.photo.createMany({
      data: item.photos.map((url, index) => ({
        variantId: variant.id,
        path: url,
        publicUrl: url,
        sortOrder: index
      })),
      skipDuplicates: true
    });
  }

  if (previousProductId && previousProductId !== product.id && previousProductId.startsWith("avito-")) {
    const remainingVariants = await prisma.variant.count({ where: { productId: previousProductId } });
    if (remainingVariants === 0) {
      await prisma.product.delete({ where: { id: previousProductId } });
    }
  }

  return { productId: product.id, variantId: variant.id, avitoItemId: item.avitoItemId };
}

export async function importAvitoItems() {
  const perPage = 100;
  const maxPages = 20;
  const imported = [];
  const accountId = await fetchSelfAccountId();
  let received = 0;
  let missingDescriptions = 0;
  let missingPhotos = 0;
  let incompleteAttributes = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const listPath = withQuery(env.AVITO_ITEMS_LIST_PATH, page, perPage);
    const payload = await avitoRequest<unknown>(listPath, { method: "GET" });
    const items = extractItems(payload);
    received += items.length;

    for (const source of items) {
      let normalized = normalizeItem(source);
      if (normalized && (accountId || env.AVITO_IMPORT_FETCH_DETAILS)) {
        const detail = await fetchDetail(normalized.avitoItemId, accountId);
        if (detail) {
          normalized = normalizeItem({ ...source, ...detail }) ?? normalized;
        }
      }
      if (normalized) {
        if (!normalized.description) {
          missingDescriptions += 1;
        }
        if (normalized.photos.length === 0) {
          missingPhotos += 1;
        }
        if (normalized.color === UNKNOWN_VALUE || normalized.size === UNKNOWN_VALUE) {
          incompleteAttributes += 1;
        }
        imported.push(await importOne(normalized));
      }
    }

    if (items.length < perPage) {
      break;
    }
  }

  await prisma.actionLog.create({
    data: {
      message: "Avito items imported",
      context: { received, imported: imported.length, missingDescriptions, missingPhotos, incompleteAttributes }
    }
  });

  return { received, imported: imported.length, missingDescriptions, missingPhotos, incompleteAttributes };
}
