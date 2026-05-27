import { VariantStatus } from "@prisma/client";
import { getClothingCategoryOption, normalizeAvitoColor } from "@/lib/avitoOptions";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import {
  buildVariantArticle,
  buildVariantDescription,
  clothingSizeOptions,
  formatClothingMaterials,
  normalizeClothingMaterials,
  uniqueValues
} from "@/server/modules/products/clothing";
import { resolveEffectiveSupplier } from "@/server/modules/suppliers/moysklad";
import type { FeedDiagnosticsDto, FeedSkipDto, FeedSkipReason } from "@/types/catalog";
import { clothingFeedDefaults, clothingFeedFieldMap } from "./fieldMap";

export type FeedRow = {
  externalId: string;
  productId: string;
  variantId: string;
  title: string;
  description: string;
  brand?: string | null;
  category: string;
  goodsType: string;
  condition: string;
  material: string | null;
  materials: string[];
  adType: string;
  clothingItem: string;
  productSubtype: string;
  categorySpecificFields: Array<{ tag: string; value: string }>;
  multiItemName: string;
  manufacturerColor: string;
  multiItem: boolean;
  multiItemGroup: string;
  article: string;
  color: string;
  size: string;
  price: number;
  quantity: number;
  status: VariantStatus;
  updatedAt: Date;
  avitoItemId?: string | null;
  photos: string[];
  region: string;
  city: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  contactPhone: string;
  contactMethod: string;
  targetAudience: string;
  supplierName: string | null;
  supplierUrl: string | null;
  supplierProductId: string | null;
  supplierCategoryId: string | null;
};

const defaultFeedStatuses: VariantStatus[] = [
  VariantStatus.READY,
  VariantStatus.UPLOADED,
  VariantStatus.MODERATION,
  VariantStatus.PUBLISHED
];

const damagedTextMarker = "\uFFFD";

const safeFallbacks = {
  region: "Москва",
  city: "Москва",
  address: "г.Москва"
};

const feedSkipReasons: FeedSkipReason[] = [
  "нет фото",
  "неподдерживаемый размер",
  "нет гео",
  "битая кодировка",
  "нет цены",
  "нулевой остаток",
  "дубль цвет+размер"
];

const actionableFeedStatuses = new Set<VariantStatus>([
  VariantStatus.DRAFT,
  VariantStatus.READY
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function hasDamagedText(value: unknown) {
  const text = String(value ?? "");
  return text.includes(damagedTextMarker);
}

function safeText(value: unknown, fallback: string, placeholders: string[] = []) {
  const text = String(value ?? "").trim();
  if (!text || hasDamagedText(text) || placeholders.includes(text)) {
    return fallback;
  }

  return text;
}

export function normalizeFeedSize(size: string): string | null {
  const text = size.trim();
  const exact = clothingSizeOptions.find((option) => option.value === text);
  if (exact) {
    return exact.value;
  }

  const code = text.match(/\(([^)]+)\)/)?.[1] ?? text;
  const compactCode = code.trim().toUpperCase().replace(/\s+/g, "");
  const aliases: Record<string, string> = {
    "2XL": "XXL",
    ONE: "ONESIZE",
    OS: "ONESIZE",
    "БЕЗРАЗМЕРА": "NOSIZE",
    "БЕЗРАЗМЕР": "NOSIZE"
  };
  const normalizedCode = aliases[compactCode] ?? compactCode;
  const byCode = clothingSizeOptions.find((option) => option.code.toUpperCase() === normalizedCode);
  return byCode?.value ?? null;
}

function isString(value: string | null): value is string {
  return typeof value === "string";
}

function uniqueFeedSizes(sizes: string[]) {
  return uniqueValues(sizes.map(normalizeFeedSize).filter(isString));
}

function validCoordinate(value: string | undefined, min: number, max: number) {
  if (!value?.trim()) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? value.trim() : null;
}

function getFeedGeo(overrides?: Record<string, unknown>) {
  const latitude = validCoordinate(String(overrides?.latitude ?? env.STORE_LATITUDE ?? ""), -90, 90);
  const longitude = validCoordinate(String(overrides?.longitude ?? env.STORE_LONGITUDE ?? ""), -180, 180);
  const hasCoordinates = Boolean(latitude && longitude);
  const addressOverride = overrides?.address;
  const cityOverride = overrides?.city;
  const regionOverride = overrides?.region;
  const region = safeText(regionOverride ?? env.STORE_REGION, safeFallbacks.region);
  const city = safeText(cityOverride ?? env.STORE_CITY, safeFallbacks.city);
  const address = safeText(addressOverride ?? env.STORE_ADDRESS, safeFallbacks.address);
  const addressIsUsable =
    Boolean(address) &&
    !address.includes("<") &&
    !/пример/i.test(address);

  return {
    ok: Boolean(region && city && (addressIsUsable || hasCoordinates)),
    region,
    city,
    address,
    latitude,
    longitude
  };
}

function normalizeContactPhone(value: unknown) {
  const text = String(value ?? "").trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
  }
  return text;
}

function emptySummary(): Record<FeedSkipReason, number> {
  return Object.fromEntries(feedSkipReasons.map((reason) => [reason, 0])) as Record<
    FeedSkipReason,
    number
  >;
}

function summarizeSkipped(skipped: FeedSkipDto[]) {
  const summary = emptySummary();
  for (const item of skipped) {
    for (const reason of item.reasons) {
      summary[reason] += 1;
    }
  }
  return summary;
}

export function isActionableFeedStatus(status: VariantStatus) {
  return actionableFeedStatuses.has(status);
}

export function getFeedValidationReasons(input: {
  size: string;
  photos: string[];
  price: number;
  quantity: number;
  geoReady: boolean;
  damagedValues?: unknown[];
  duplicate?: boolean;
}) {
  const reasons: FeedSkipReason[] = [];
  if (!normalizeFeedSize(input.size)) {
    reasons.push("неподдерживаемый размер");
  }
  if (input.photos.length === 0) {
    reasons.push("нет фото");
  }
  if (!input.geoReady) {
    reasons.push("нет гео");
  }
  if (!Number.isFinite(input.price) || input.price <= 0) {
    reasons.push("нет цены");
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    reasons.push("нулевой остаток");
  }
  if (input.duplicate) {
    reasons.push("дубль цвет+размер");
  }
  if ((input.damagedValues ?? []).some(hasDamagedText)) {
    reasons.push("битая кодировка");
  }
  return reasons;
}

export async function getFeedRowsWithDiagnostics(options?: {
  variantIds?: string[];
  statuses?: VariantStatus[];
}): Promise<FeedDiagnosticsDto & { rows: FeedRow[] }> {
  const variants = await prisma.variant.findMany({
    where: {
      ...(options?.variantIds?.length ? { id: { in: options.variantIds } } : {}),
      status: { in: options?.statuses ?? defaultFeedStatuses }
    },
    include: {
      product: {
        include: {
          variants: {
            select: {
              color: true,
              size: true,
              quantity: true
            }
          }
        }
      },
      photos: { orderBy: { sortOrder: "asc" } }
    },
    orderBy: [{ product: { title: "asc" } }, { color: "asc" }, { size: "asc" }]
  });

  const seenVariantKeys = new Set<string>();
  const skipped: FeedSkipDto[] = [];
  const rows = variants.flatMap<FeedRow>((variant) => {
    const attributes = asRecord(variant.product.avitoAttributes);
    const geo = getFeedGeo(attributes);
    const categoryOption = getClothingCategoryOption(attributes.clothingCategory);
    const materials = normalizeClothingMaterials(attributes.materials, attributes.material);
    const material = formatClothingMaterials(materials);
    const manufacturerColors = asRecord(attributes.manufacturerColors);
    const size = normalizeFeedSize(variant.size);
    const color = normalizeAvitoColor(variant.color);
    const multiItemGroup = String(attributes.multiItemGroup ?? variant.productId);
    const variantKey = size
      ? `${multiItemGroup}:${color.trim().toLowerCase()}:${size}`
      : "";
    const photos = variant.photos
      .map((photo) => photo.publicUrl)
      .filter((photo) => photo && !hasDamagedText(photo));
    const price = Number(variant.price);
    const reasons = getFeedValidationReasons({
      size: variant.size,
      photos,
      price,
      quantity: variant.quantity,
      geoReady: geo.ok,
      duplicate: Boolean(variantKey && seenVariantKeys.has(variantKey)),
      damagedValues: [
        variant.title,
        color,
        variant.product.title,
        variant.product.baseCategory,
        variant.product.brand,
        geo.region,
        geo.city,
        geo.address
      ]
    });

    if (reasons.length > 0 || !size) {
      skipped.push({
        productId: variant.productId,
        variantId: variant.id,
        title: variant.title,
        color: variant.color,
        size: variant.size,
        status: variant.status,
        reasons
      });
      return [];
    }
    seenVariantKeys.add(variantKey);

    const article = buildVariantArticle(variant.product.title, color, size);
    const availableVariants = variant.product.variants
      .filter((productVariant) => productVariant.quantity > 0)
      .map((productVariant) => ({
        color: normalizeAvitoColor(productVariant.color),
        size: normalizeFeedSize(productVariant.size)
      }))
      .filter(
        (productVariant): productVariant is { color: string; size: string } =>
          isString(productVariant.size)
      );
    const colors = uniqueValues(
      availableVariants.map((productVariant) => productVariant.color)
    );
    const sizes = uniqueFeedSizes(availableVariants.map((productVariant) => productVariant.size));
    const supplier = resolveEffectiveSupplier(variant.product, variant);
    const category = safeText(variant.product.baseCategory, clothingFeedFieldMap.category);
    const goodsType = safeText(attributes.goodsType, categoryOption.goodsType, ["GoodsType"]);
    const condition = safeText(
      attributes.condition ?? env.DEFAULT_CONDITION,
      clothingFeedDefaults.condition,
      ["Condition"]
    );
    const adType = safeText(attributes.adType, clothingFeedDefaults.adType, ["AdType"]);
    const clothingItem = safeText(attributes.apparel, categoryOption.apparel, [
      "ClothingType",
      "Apparel"
    ]);
    const productSubtype = safeText(
      attributes.productSubtype ?? attributes.clothingSubtype ?? attributes.clothingItem,
      categoryOption.productSubtype || clothingFeedDefaults.productSubtype,
      ["Subtype"]
    );
    const categoryExtraField = safeText(attributes.categoryExtraField, categoryOption.extraField ?? "");
    const categoryExtraValue = safeText(
      attributes.categoryExtraValue,
      categoryOption.extraValue ?? productSubtype
    );
    const categorySpecificFields =
      categoryExtraField && categoryExtraValue
        ? [{ tag: categoryExtraField, value: categoryExtraValue }]
        : [];

    return [{
      externalId: `${variant.productId}-${variant.id}`,
      productId: variant.productId,
      variantId: variant.id,
      title: variant.title,
      description:
        variant.description ??
        variant.product.baseDescription ??
        buildVariantDescription({
          title: variant.product.title,
          materials,
          color,
          size,
          article,
          colors,
          sizes
        }),
      brand: variant.product.brand,
      category,
      goodsType,
      condition,
      adType,
      clothingItem,
      productSubtype,
      categorySpecificFields,
      multiItemName: String(attributes.multiItemName ?? variant.product.title),
      manufacturerColor: normalizeAvitoColor(
        manufacturerColors[variant.color] ?? manufacturerColors[color] ?? color
      ),
      material,
      materials,
      multiItem: true,
      multiItemGroup,
      article,
      color,
      size,
      price: Number(variant.price),
      quantity: variant.quantity,
      status: variant.status,
      updatedAt: variant.updatedAt,
      avitoItemId: variant.avitoItemId,
      photos,
      region: geo.region,
      city: geo.city,
      address: geo.address,
      latitude: geo.latitude,
      longitude: geo.longitude,
      contactPhone: normalizeContactPhone(attributes.contactPhone ?? env.STORE_PHONE),
      contactMethod: env.AVITO_FEED_CONTACT_METHOD,
      targetAudience: String(attributes.targetAudience ?? env.AVITO_FEED_TARGET_AUDIENCE),
      supplierName: supplier?.name ?? null,
      supplierUrl: supplier?.url ?? null,
      supplierProductId: supplier?.productId ?? null,
      supplierCategoryId: supplier?.categoryId ?? null
    }];
  });

  const actionableSkipped = skipped.filter((item) => isActionableFeedStatus(item.status));

  return {
    rows,
    totalVariants: variants.length,
    readyRows: rows.length,
    exportSkippedRows: skipped.length,
    actionableSkippedRows: actionableSkipped.length,
    summary: summarizeSkipped(skipped),
    actionableSummary: summarizeSkipped(actionableSkipped),
    skipped,
    actionableSkipped
  };
}

export async function getFeedRows(options?: {
  variantIds?: string[];
  statuses?: VariantStatus[];
}) {
  const diagnostics = await getFeedRowsWithDiagnostics(options);
  return diagnostics.rows;
}
