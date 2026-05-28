import { VariantStatus } from "@prisma/client";
import { getClothingCategoryOption, isFootwearCategory, normalizeAvitoColor } from "@/lib/avitoOptions";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import {
  buildVariantArticle,
  buildVariantDescription,
  clothingSizeOptions,
  footwearSizeOptions,
  formatMaterialsForCategory,
  normalizeMaterialsForCategory,
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
  templateFields: string[];
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
  videoUrl: string | null;
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

function repairText(value: unknown) {
  return String(value ?? "")
    .replaceAll(damagedTextMarker, "")
    .replace(/\s+/g, " ")
    .trim();
}

function repairLongText(value: unknown) {
  return String(value ?? "")
    .replaceAll(damagedTextMarker, "")
    .trim();
}

function safeText(value: unknown, fallback: string, placeholders: string[] = []) {
  const text = repairText(value);
  if (!text || placeholders.includes(text)) {
    return fallback;
  }

  return text;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function categoryFields(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const record = asRecord(item);
    const tag = String(record.tag ?? "").trim();
    const fieldValue = String(record.value ?? "").trim();
    return tag && fieldValue && !hasDamagedText(tag) && !hasDamagedText(fieldValue)
      ? [{ tag, value: fieldValue }]
      : [];
  });
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

const footwearSizeValueSet = new Set<string>(footwearSizeOptions.map((option) => option.value));

function normalizeFootwearSize(size: string) {
  const text = size.trim().replace(".", ",");
  return footwearSizeValueSet.has(text) ? text : null;
}

export function normalizeFeedSizeForCategory(input: {
  size: string;
  goodsType: string;
  sizeRequired: boolean;
}) {
  if (!input.sizeRequired) {
    return input.size.trim() || "Без размера";
  }

  if (isFootwearCategory({ goodsType: input.goodsType })) {
    return normalizeFootwearSize(input.size) ?? normalizeFeedSize(input.size);
  }

  return normalizeFeedSize(input.size);
}

function isString(value: string | null): value is string {
  return typeof value === "string";
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

export function normalizeContactPhone(value: unknown) {
  const text = String(value ?? "").trim();
  const digits = text.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return digits.startsWith("8") ? `+7${digits.slice(1)}` : `+${digits}`;
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
  normalizedSize?: string | null;
  sizeRequired?: boolean;
  photos: string[];
  price: number;
  quantity: number;
  geoReady: boolean;
  damagedValues?: unknown[];
  duplicate?: boolean;
}) {
  const reasons: FeedSkipReason[] = [];
  if (input.sizeRequired !== false && !input.normalizedSize && !normalizeFeedSize(input.size)) {
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
  const storeContactPhone = normalizeContactPhone(env.STORE_PHONE);
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
      photos: { orderBy: { sortOrder: "asc" } },
      videos: { orderBy: { sortOrder: "asc" } }
    },
    orderBy: [{ product: { title: "asc" } }, { color: "asc" }, { size: "asc" }]
  });

  const seenVariantKeys = new Set<string>();
  const skipped: FeedSkipDto[] = [];
  const rows = variants.flatMap<FeedRow>((variant) => {
    const attributes = asRecord(variant.product.avitoAttributes);
    const geo = getFeedGeo(attributes);
    const categoryOption = getClothingCategoryOption(attributes.clothingCategory);
    const materials = normalizeMaterialsForCategory(attributes.materials, attributes.material, categoryOption);
    const material = formatMaterialsForCategory(attributes.materials, attributes.material, categoryOption);
    const manufacturerColors = asRecord(attributes.manufacturerColors);
    const templateFields = stringArray(attributes.categoryTemplateFields);
    const sizeRequired = templateFields.length === 0 || templateFields.includes("Size");
    const category = safeText(variant.product.baseCategory, clothingFeedFieldMap.category);
    const brand = repairText(variant.product.brand) || null;
    const goodsType = safeText(attributes.goodsType, categoryOption.goodsType, ["GoodsType"]);
    const rawSize = repairText(variant.size);
    const size = normalizeFeedSizeForCategory({
      size: rawSize,
      goodsType,
      sizeRequired
    });
    const productTitle = repairText(variant.product.title) || "Товар";
    const variantTitle = repairText(variant.title) || productTitle;
    const color = normalizeAvitoColor(repairText(variant.color) || "Не указан");
    const multiItemGroup = String(attributes.multiItemGroup ?? variant.productId);
    const variantKey = sizeRequired
      ? size
        ? `${multiItemGroup}:${color.trim().toLowerCase()}:${size}`
        : ""
      : `${multiItemGroup}:${color.trim().toLowerCase()}:nosize`;
    const photos = variant.photos
      .map((photo) => photo.publicUrl)
      .filter((photo) => photo && !hasDamagedText(photo));
    const videoUrl = variant.videos.find((video) => video.publicUrl && !hasDamagedText(video.publicUrl))?.publicUrl ?? null;
    const price = Number(variant.price);
    const reasons = getFeedValidationReasons({
      size: rawSize,
      normalizedSize: size,
      sizeRequired,
      photos,
      price,
      quantity: variant.quantity,
      geoReady: geo.ok,
      duplicate: Boolean(variantKey && seenVariantKeys.has(variantKey)),
      damagedValues: [
        variantTitle,
        color,
        productTitle,
        category,
        brand,
        geo.region,
        geo.city,
        geo.address
      ]
    });

    if (reasons.length > 0 || (sizeRequired && !size)) {
      skipped.push({
        productId: variant.productId,
        variantId: variant.id,
        title: variantTitle,
        color,
        size: rawSize,
        status: variant.status,
        reasons
      });
      return [];
    }
    seenVariantKeys.add(variantKey);

    const safeSize = size ?? rawSize;
    const article = buildVariantArticle(productTitle, color, safeSize);
    const availableVariants = variant.product.variants
      .filter((productVariant) => productVariant.quantity > 0)
      .map((productVariant) => ({
        color: normalizeAvitoColor(repairText(productVariant.color) || "Не указан"),
        size: normalizeFeedSizeForCategory({
          size: repairText(productVariant.size),
          goodsType,
          sizeRequired
        })
      }))
      .filter(
        (productVariant): productVariant is { color: string; size: string } =>
          isString(productVariant.size)
      );
    const colors = uniqueValues(
      availableVariants.map((productVariant) => productVariant.color)
    );
    const sizes = uniqueValues(availableVariants.map((productVariant) => productVariant.size));
    const supplier = resolveEffectiveSupplier(variant.product, variant);
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
    const configuredCategoryFields = categoryFields(attributes.categorySpecificFields);
    const categoryExtraField = safeText(attributes.categoryExtraField, categoryOption.extraField ?? "");
    const categoryExtraValue = safeText(attributes.categoryExtraValue, categoryOption.extraValue ?? productSubtype);
    const categorySpecificFields = configuredCategoryFields.length > 0
      ? configuredCategoryFields
      : categoryExtraField && categoryExtraValue
        ? [{ tag: categoryExtraField, value: categoryExtraValue }]
        : [];

    return [{
      externalId: `${variant.productId}-${variant.id}`,
      productId: variant.productId,
      variantId: variant.id,
      title: variantTitle,
      description:
        repairLongText(variant.description) ||
        repairLongText(variant.product.baseDescription) ||
        buildVariantDescription({
          title: productTitle,
          materials,
          color,
          size: safeSize,
          article,
          colors,
          sizes
        }),
      brand,
      category,
      goodsType,
      condition,
      adType,
      clothingItem,
      productSubtype,
      categorySpecificFields,
      templateFields,
      multiItemName: safeText(attributes.multiItemName, productTitle),
      manufacturerColor: normalizeAvitoColor(
        repairText(manufacturerColors[variant.color] ?? manufacturerColors[color] ?? color) || color
      ),
      material,
      materials,
      multiItem: true,
      multiItemGroup,
      article,
      color,
      size: safeSize,
      price: Number(variant.price),
      quantity: variant.quantity,
      status: variant.status,
      updatedAt: variant.updatedAt,
      avitoItemId: variant.avitoItemId,
      photos,
      videoUrl,
      region: geo.region,
      city: geo.city,
      address: geo.address,
      latitude: geo.latitude,
      longitude: geo.longitude,
      contactPhone: storeContactPhone,
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
