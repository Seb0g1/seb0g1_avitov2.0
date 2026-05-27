import crypto from "node:crypto";
import { Prisma, VariantStatus } from "@prisma/client";
import ExcelJS from "exceljs";
import {
  defaultAdType,
  defaultClothingCondition,
  defaultClothingItem,
  getClothingCategoryOption,
  normalizeClothingMaterials
} from "@/lib/avitoOptions";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import { buildMultiItemGroup } from "@/server/modules/products/clothing";
import { normalizeFeedSize } from "@/server/modules/exports/feedRows";

type CellValue = string | number | boolean | Date | null;

export type ParsedAvitoXlsxRow = {
  sourceRow: number;
  sheetName: string;
  externalId: string | null;
  avitoItemId: string | null;
  title: string;
  description: string | null;
  category: string;
  price: number;
  goodsType: string;
  condition: string;
  adType: string;
  brand: string | null;
  color: string;
  manufacturerColor: string;
  materials: string[];
  multiItem: boolean;
  multiItemName: string;
  apparel: string;
  productSubtype: string;
  size: string;
  normalizedSize: string | null;
  targetAudience: string | null;
  status: VariantStatus;
  photos: string[];
  address: string | null;
  region: string | null;
  city: string | null;
  contactPhone: string | null;
  email: string | null;
  companyName: string | null;
};

export type AvitoXlsxParseResult = {
  rows: ParsedAvitoXlsxRow[];
  skippedRows: Array<{ sheetName: string; row: number; reason: string }>;
};

export type AvitoXlsxImportResult = AvitoXlsxParseResult & {
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  photosAttached: number;
};

const DATA_START_ROW = 5;

const headerAliases: Record<string, string[]> = {
  externalId: ["id", "уникальный идентификатор объявления", "уникальныйидентификаторобъявления"],
  placementType: ["способ размещения", "способразмещения"],
  avitoItemId: ["avitoid", "номер объявления на авито", "номеробъявлениянаавито"],
  contactPhone: ["contactphone", "номер телефона", "номертелефона", "телефон"],
  address: ["address", "адрес"],
  photos: ["imageurls", "images", "ссылки на фото", "ссылкинафото", "фото", "фотографии"],
  contactMethod: ["способ связи", "способсвязи"],
  title: ["title", "название объявления", "названиеобъявления"],
  description: ["description", "описание объявления", "описаниеобъявления"],
  category: ["category", "категория"],
  price: ["price", "цена"],
  goodsType: ["goodstype", "вид одежды", "видодежды"],
  condition: ["condition", "состояние"],
  adType: ["adtype", "вид объявления", "видобъявления"],
  brand: ["brand", "бренд одежды", "брендодежды", "бренд"],
  color: ["color", "цвет"],
  manufacturerColor: ["colorname", "manufacturercolor", "цвет от производителя", "цветотпроизводителя"],
  materials: ["material", "materials", "материал основной части", "материалосновнойчасти"],
  multiItem: [
    "multiitem",
    "соединять это объявление с другими объявлениями",
    "соединятьэтообъявлениесдругимиобъявлениями"
  ],
  multiItemName: ["multiname", "multiitemname", "название мультиобъявления", "названиемультиобъявления"],
  apparel: ["apparel", "тип товара", "типтовара"],
  size: ["size", "размер"],
  productSubtype: ["goodssubtype", "appareltype", "shortsstyle", "подвид товара", "подвидтовара"],
  targetAudience: ["targetaudience", "целевая аудитория", "целеваяаудитория"],
  avitoStatus: ["avitostatus", "статус", "статус авито"],
  companyName: ["название компании", "названиекомпании", "companyname"],
  email: ["email", "почта"],
  region: ["region", "регион"],
  city: ["city", "город"]
};

const aliasToField = new Map<string, string>(
  Object.entries(headerAliases).flatMap(([field, aliases]) =>
    aliases.map((alias) => [normalizeHeader(alias), field])
  )
);

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, "");
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.text === "string") return record.text.trim();
    if (typeof record.hyperlink === "string") return record.hyperlink.trim();
    if (typeof record.result === "string" || typeof record.result === "number") {
      return String(record.result).trim();
    }
    if (Array.isArray(record.richText)) {
      return record.richText
        .map((part) => cellToString((part as Record<string, unknown>).text))
        .join("")
        .trim();
    }
  }
  return "";
}

function compactText(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstText(...values: Array<string | null | undefined>) {
  return values.map(compactText).find(Boolean) ?? null;
}

function parseNumber(value: string | null | undefined) {
  const text = compactText(value).replace(",", ".").replace(/[^\d.]/g, "");
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMaterials(value: string | null | undefined) {
  const materials = compactText(value)
    .split(/\s*\|\s*|\s*,\s*/)
    .map(compactText)
    .filter(Boolean);
  return normalizeClothingMaterials(materials);
}

function parsePhotos(...values: Array<string | null | undefined>) {
  const urls = new Set<string>();
  for (const value of values) {
    const text = String(value ?? "");
    const matches = text.match(/https?:\/\/[^\s|,;"']+/gi) ?? [];
    for (const match of matches) {
      urls.add(match.trim());
    }
  }
  return [...urls].slice(0, 10);
}

function parseBooleanYes(value: string | null | undefined) {
  const text = compactText(value).toLowerCase();
  return !["нет", "no", "false", "0"].includes(text);
}

function normalizeStatus(value: string | null | undefined, avitoItemId: string | null) {
  const text = compactText(value).toLowerCase();
  if (["активно", "active", "published", "online"].includes(text)) return VariantStatus.PUBLISHED;
  if (text.includes("модерац") || ["moderation", "pending"].includes(text)) {
    return VariantStatus.MODERATION;
  }
  if (text.includes("снят") || text.includes("закрыт") || ["removed", "closed"].includes(text)) {
    return VariantStatus.REMOVED;
  }
  if (text.includes("ошиб") || text.includes("отклон") || ["error", "failed", "rejected"].includes(text)) {
    return VariantStatus.ERROR;
  }
  return avitoItemId ? VariantStatus.PUBLISHED : VariantStatus.READY;
}

function normalizeColor(value: string | null | undefined) {
  const text = compactText(value);
  return text.replace(/^Чёрный$/i, "Черный");
}

function cleanProductTitle(title: string, multiItemName: string | null) {
  const source = firstText(multiItemName, title) ?? title;
  return source
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupKey(row: ParsedAvitoXlsxRow) {
  return [
    row.category,
    row.goodsType,
    row.apparel,
    row.brand ?? "",
    row.multiItemName || cleanProductTitle(row.title, null)
  ]
    .join(":")
    .toLowerCase();
}

function stableProductId(row: ParsedAvitoXlsxRow) {
  const hash = crypto.createHash("sha1").update(groupKey(row)).digest("hex").slice(0, 16);
  return `xlsx-group-${hash}`;
}

function stableMultiItemGroup(row: ParsedAvitoXlsxRow) {
  return buildMultiItemGroup(row.multiItemName || row.title, groupKey(row)).slice(0, 100);
}

function rowValue(row: ExcelJS.Row, column?: number) {
  if (!column) return null;
  return cellToString(row.getCell(column).value as CellValue);
}

function findHeaderRow(sheet: ExcelJS.Worksheet) {
  const max = Math.min(sheet.actualRowCount || sheet.rowCount, 30);
  for (let rowNumber = 1; rowNumber <= max; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const headers = new Map<string, number>();
    row.eachCell((cell, column) => {
      const normalized = normalizeHeader(cellToString(cell.value));
      const field = aliasToField.get(normalized);
      if (field && !headers.has(field)) {
        headers.set(field, column);
      }
    });
    if (headers.has("title") && headers.has("price") && headers.has("size")) {
      return { rowNumber, headers };
    }
  }
  return null;
}

function parseSheet(sheet: ExcelJS.Worksheet): AvitoXlsxParseResult {
  const header = findHeaderRow(sheet);
  if (!header) {
    return { rows: [], skippedRows: [] };
  }

  const rows: ParsedAvitoXlsxRow[] = [];
  const skippedRows: AvitoXlsxParseResult["skippedRows"] = [];
  const startRow = Math.max(header.rowNumber + 1, DATA_START_ROW);
  const maxRow = sheet.actualRowCount || sheet.rowCount;

  for (let rowNumber = startRow; rowNumber <= maxRow; rowNumber += 1) {
    const xlsxRow = sheet.getRow(rowNumber);
    const get = (field: string) => rowValue(xlsxRow, header.headers.get(field));
    const title = compactText(get("title"));
    const externalId = firstText(get("externalId"));
    const avitoItemId = firstText(get("avitoItemId"));
    if (!title && !externalId && !avitoItemId) {
      continue;
    }
    if (!title) {
      skippedRows.push({ sheetName: sheet.name, row: rowNumber, reason: "нет названия" });
      continue;
    }

    const apparel = firstText(get("apparel"), env.AVITO_FEED_APPAREL) ?? defaultClothingItem;
    const categoryOption = getClothingCategoryOption(apparel);
    const productSubtype = firstText(get("productSubtype"), categoryOption.productSubtype, env.AVITO_FEED_PRODUCT_SUBTYPE) ?? defaultClothingItem;
    const size = firstText(get("size")) ?? "";
    const normalizedSize = normalizeFeedSize(size);
    const color = normalizeColor(firstText(get("color")) ?? "Не указан");
    const manufacturerColor = normalizeColor(firstText(get("manufacturerColor"), color) ?? color);
    const multiItemName = firstText(get("multiItemName"), cleanProductTitle(title, null)) ?? title;
    const photos = parsePhotos(get("photos"));
    const contactPhone = firstText(get("contactPhone"));
    const address = firstText(get("address"));

    rows.push({
      sourceRow: rowNumber,
      sheetName: sheet.name,
      externalId,
      avitoItemId,
      title,
      description: firstText(get("description")),
      category: firstText(get("category"), env.DEFAULT_AVITO_CATEGORY) ?? env.DEFAULT_AVITO_CATEGORY,
      price: parseNumber(get("price")),
      goodsType: firstText(get("goodsType"), categoryOption.goodsType, env.AVITO_FEED_GOODS_TYPE) ?? categoryOption.goodsType,
      condition: firstText(get("condition"), env.AVITO_FEED_CONDITION, defaultClothingCondition) ?? defaultClothingCondition,
      adType: firstText(get("adType"), env.AVITO_FEED_AD_TYPE, defaultAdType) ?? defaultAdType,
      brand: firstText(get("brand")),
      color,
      manufacturerColor,
      materials: parseMaterials(get("materials")),
      multiItem: parseBooleanYes(get("multiItem")),
      multiItemName,
      apparel,
      productSubtype,
      size,
      normalizedSize,
      targetAudience: firstText(get("targetAudience"), env.AVITO_FEED_TARGET_AUDIENCE),
      status: normalizeStatus(get("avitoStatus"), avitoItemId),
      photos,
      address,
      region: firstText(get("region"), address),
      city: firstText(get("city"), address),
      contactPhone,
      email: firstText(get("email")),
      companyName: firstText(get("companyName"))
    });
  }

  return { rows, skippedRows };
}

export async function parseAvitoXlsx(buffer: Buffer): Promise<AvitoXlsxParseResult> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
  await workbook.xlsx.load(arrayBuffer, {
    ignoreNodes: [
      "sheetPr",
      "dimension",
      "sheetViews",
      "sheetFormatPr",
      "cols",
      "autoFilter",
      "mergeCells",
      "rowBreaks",
      "hyperlinks",
      "pageMargins",
      "dataValidations",
      "pageSetup",
      "headerFooter",
      "printOptions",
      "picture",
      "drawing",
      "sheetProtection",
      "tableParts",
      "conditionalFormatting",
      "extLst"
    ]
  });

  const parsed = workbook.worksheets.map(parseSheet);
  return {
    rows: parsed.flatMap((result) => result.rows),
    skippedRows: parsed.flatMap((result) => result.skippedRows)
  };
}

function productAttributes(
  row: ParsedAvitoXlsxRow,
  existing: Record<string, unknown>
): Prisma.InputJsonValue {
  const categoryOption = getClothingCategoryOption(row.apparel);
  const manufacturerColors = {
    ...((existing.manufacturerColors && typeof existing.manufacturerColors === "object"
      ? existing.manufacturerColors
      : {}) as Record<string, string>),
    [row.color]: row.manufacturerColor
  };

  return {
    ...existing,
    importSource: "avito-xlsx",
    sourceSheet: row.sheetName,
    category: row.category,
    goodsType: row.goodsType,
    adType: row.adType,
    condition: row.condition,
    clothingCategory: categoryOption.key,
    apparel: row.apparel || categoryOption.apparel,
    clothingItem: row.productSubtype || categoryOption.productSubtype,
    productSubtype: row.productSubtype || categoryOption.productSubtype,
    categoryExtraField: categoryOption.extraField ?? "",
    categoryExtraValue: categoryOption.extraValue ?? row.productSubtype,
    multiItemName: row.multiItemName,
    multiItemGroup: String(existing.multiItemGroup ?? stableMultiItemGroup(row)),
    manufacturerColors,
    materials: row.materials,
    material: row.materials.join(", "),
    address: row.address ?? existing.address ?? env.STORE_ADDRESS,
    region: row.region ?? existing.region ?? env.STORE_REGION,
    city: row.city ?? existing.city ?? env.STORE_CITY,
    contactPhone: row.contactPhone ?? existing.contactPhone ?? env.STORE_PHONE,
    email: row.email ?? existing.email ?? env.STORE_EMAIL,
    companyName: row.companyName ?? existing.companyName ?? env.STORE_COMPANY_NAME,
    targetAudience: row.targetAudience ?? existing.targetAudience ?? env.AVITO_FEED_TARGET_AUDIENCE
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function findProductId(row: ParsedAvitoXlsxRow) {
  if (row.avitoItemId) {
    const existingVariant = await prisma.variant.findUnique({
      where: { avitoItemId: row.avitoItemId },
      select: { productId: true }
    });
    if (existingVariant) {
      return existingVariant.productId;
    }
  }

  const stableId = stableProductId(row);
  const stableProduct = await prisma.product.findUnique({
    where: { id: stableId },
    select: { id: true }
  });
  if (stableProduct) {
    return stableProduct.id;
  }

  const candidates = await prisma.product.findMany({
    where: {
      OR: [
        { title: { equals: cleanProductTitle(row.title, row.multiItemName), mode: "insensitive" } },
        { title: { equals: row.multiItemName, mode: "insensitive" } }
      ]
    },
    include: { variants: { select: { color: true, size: true } } },
    take: 20
  });
  const match = candidates.find((product) => {
    const attributes = asRecord(product.avitoAttributes);
    return (
      String(attributes.multiItemName ?? "").toLowerCase() === row.multiItemName.toLowerCase() ||
      product.variants.some(
        (variant) =>
          variant.color.toLowerCase() === row.color.toLowerCase() &&
          normalizeFeedSize(variant.size) === row.normalizedSize
      )
    );
  });

  return match?.id ?? stableId;
}

async function upsertImportRow(row: ParsedAvitoXlsxRow) {
  const productId = await findProductId(row);
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
    include: { variants: { select: { id: true, color: true, size: true, avitoItemId: true } } }
  });
  const productTitle = cleanProductTitle(row.title, row.multiItemName);
  const productData = {
    title: productTitle,
    brand: row.brand,
    baseCategory: row.category,
    baseDescription: row.description,
    avitoAttributes: productAttributes(row, asRecord(existingProduct?.avitoAttributes))
  };

  const product = existingProduct
    ? await prisma.product.update({
        where: { id: existingProduct.id },
        data: productData
      })
    : await prisma.product.create({
        data: {
          id: productId,
          ...productData
        }
      });

  const existingVariant =
    (row.avitoItemId
      ? await prisma.variant.findUnique({ where: { avitoItemId: row.avitoItemId } })
      : null) ??
    existingProduct?.variants.find(
      (variant) =>
        variant.color.toLowerCase() === row.color.toLowerCase() &&
        normalizeFeedSize(variant.size) === row.normalizedSize
    ) ??
    null;

  const variantData = {
    productId: product.id,
    title: row.title,
    color: row.color,
    size: row.normalizedSize ?? row.size,
    price: row.price,
    quantity: row.price > 0 ? 1 : 0,
    description: row.description,
    status: row.status,
    avitoItemId: row.avitoItemId,
    lastSyncedAt: new Date(),
    lastError: null
  };

  const variant = existingVariant
    ? await prisma.variant.update({
        where: { id: existingVariant.id },
        data: {
          ...variantData,
          avitoItemId: row.avitoItemId ?? existingVariant.avitoItemId
        }
      })
    : await prisma.variant.create({
        data: variantData
      });

  let photosAttached = 0;
  if (row.photos.length > 0) {
    await prisma.photo.deleteMany({ where: { variantId: variant.id } });
    await prisma.photo.createMany({
      data: row.photos.map((url, index) => ({
        variantId: variant.id,
        path: url,
        publicUrl: url,
        sortOrder: index
      }))
    });
    photosAttached = row.photos.length;
  }

  return {
    productId: product.id,
    variantId: variant.id,
    productCreated: !existingProduct,
    variantCreated: !existingVariant,
    photosAttached
  };
}

export async function importAvitoXlsx(buffer: Buffer): Promise<AvitoXlsxImportResult> {
  const parsed = await parseAvitoXlsx(buffer);
  const createdProducts = new Set<string>();
  const updatedProducts = new Set<string>();
  const result: AvitoXlsxImportResult = {
    ...parsed,
    productsCreated: 0,
    productsUpdated: 0,
    variantsCreated: 0,
    variantsUpdated: 0,
    photosAttached: 0
  };

  for (const row of parsed.rows) {
    const imported = await upsertImportRow(row);
    if (imported.productCreated) {
      createdProducts.add(imported.productId);
    } else {
      updatedProducts.add(imported.productId);
    }
    if (imported.variantCreated) {
      result.variantsCreated += 1;
    } else {
      result.variantsUpdated += 1;
    }
    result.photosAttached += imported.photosAttached;
  }

  result.productsCreated = createdProducts.size;
  result.productsUpdated = updatedProducts.size;

  await prisma.actionLog.create({
    data: {
      message: "Avito XLSX imported",
      context: {
        rows: result.rows.length,
        skippedRows: result.skippedRows.length,
        productsCreated: result.productsCreated,
        productsUpdated: result.productsUpdated,
        variantsCreated: result.variantsCreated,
        variantsUpdated: result.variantsUpdated,
        photosAttached: result.photosAttached
      }
    }
  });

  return result;
}
