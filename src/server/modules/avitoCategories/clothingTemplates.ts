import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { convert } from "xmlbuilder2";
import {
  type AvitoCategoryField,
  clothingCategoryOptions,
  clothingSizeValues,
  type ClothingCategoryOption
} from "@/lib/avitoOptions";

type StoredClothingCategoryOption = ClothingCategoryOption & {
  sourceFile?: string;
  sourceFields?: string[];
  importedAt?: string;
};

const dataDir = path.resolve(process.cwd(), "data");
const storagePath = path.join(dataDir, "avito-clothing-categories.json");

const commonAdTags = new Set([
  "Id",
  "DateBegin",
  "DateEnd",
  "ListingFee",
  "AdStatus",
  "AvitoId",
  "ManagerName",
  "ContactPhone",
  "Address",
  "Latitude",
  "Longitude",
  "SellerAddressID",
  "Images",
  "VideoURL",
  "ContactMethod",
  "Promo",
  "PromoAutoOptions",
  "PromoManualOptions",
  "Title",
  "Description",
  "Category",
  "InternetCalls",
  "CallsDevices",
  "Delivery",
  "WeightForDelivery",
  "LengthForDelivery",
  "HeightForDelivery",
  "WidthForDelivery",
  "ReturnPolicy",
  "TryOn",
  "DeliverySubsidy",
  "MinPreparationDays",
  "MaxPreparationDays",
  "Price",
  "GoodsType",
  "Condition",
  "AdType",
  "Brand",
  "Color",
  "ColorName",
  "MaterialsOdezhda",
  "VideoFileURL",
  "MultiItem",
  "MultiName",
  "Apparel",
  "Size",
  "TargetAudience"
]);

const defaultSubtypeByApparel: Record<string, string> = {
  "Кофты и футболки": "Футболка",
  "Шорты": "Повседневные",
  "Бомберы": "Бомбер",
  "Спортивные костюмы": "Спортивный костюм",
  "Джинсы": "Джинсы"
};

const commonCategoryFieldDefaults: Record<string, string> = {
  Gender: "Унисекс",
  Hood: "Нет",
  Material: "Текстиль",
  WomenJeansModel: "Прямые"
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    }
  }
  return null;
}

function nodeText(value: unknown) {
  if (typeof value === "string") {
    return value.trim() || null;
  }
  const record = asRecord(value);
  return firstText(record["#"], record["$"]);
}

function parseNameParts(fileName?: string | null) {
  const base = path
    .basename(fileName || "imported-category.xml")
    .replace(/\.[^.]+$/g, "")
    .replace(/\s+-\s+Шаблон.*$/i, "")
    .trim();
  const parts = base.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  return {
    goodsType: parts[0] ?? null,
    apparel: parts.at(-1) ?? parts[1] ?? parts[0] ?? null
  };
}

function optionKey(input: {
  goodsType: string;
  apparel: string;
  fields?: string[];
}) {
  const builtIn = clothingCategoryOptions.find(
    (option) =>
      option.goodsType.toLowerCase() === input.goodsType.toLowerCase() &&
      option.apparel.toLowerCase() === input.apparel.toLowerCase() &&
      (input.fields?.length
        ? JSON.stringify(option.templateFields ?? []) === JSON.stringify(input.fields)
        : true)
  );
  if (builtIn) {
    return builtIn.key;
  }

  const hash = crypto
    .createHash("sha1")
    .update(`${input.goodsType}:${input.apparel}:${(input.fields ?? []).join(",")}`)
    .digest("hex")
    .slice(0, 10);
  return `imported-${hash}` as ClothingCategoryOption["key"];
}

function defaultCategoryFieldValue(tag: string, input: {
  goodsType: string;
  apparel: string;
  productSubtype: string;
}) {
  if (tag === "GoodsSubType" || tag === "ApparelType" || tag === "TopType" || tag === "Model") {
    return input.productSubtype;
  }
  if (tag === "Gender") {
    if (/жен/i.test(input.goodsType)) return "Женский";
    if (/муж/i.test(input.goodsType)) return "Мужской";
  }
  return commonCategoryFieldDefaults[tag] ?? input.productSubtype;
}

function categoryFieldsFromTemplate(fields: string[], input: {
  ad: Record<string, unknown>;
  goodsType: string;
  apparel: string;
  productSubtype: string;
}): AvitoCategoryField[] {
  return fields
    .filter((field) => !commonAdTags.has(field))
    .map((tag) => ({
      tag,
      value:
        firstText(nodeText(input.ad[tag]), defaultCategoryFieldValue(tag, input)) ??
        input.productSubtype
    }));
}

function toStoredOption(option: ClothingCategoryOption): StoredClothingCategoryOption {
  return option as StoredClothingCategoryOption;
}

async function readStoredOptions() {
  try {
    const raw = await fs.readFile(storagePath, "utf8");
    const parsed = JSON.parse(raw) as StoredClothingCategoryOption[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeStoredOptions(options: StoredClothingCategoryOption[]) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(storagePath, JSON.stringify(options, null, 2), "utf8");
}

export async function listClothingCategoryOptions() {
  const merged = new Map<string, StoredClothingCategoryOption>();
  for (const option of clothingCategoryOptions) {
    merged.set(option.key, toStoredOption(option));
  }
  for (const option of await readStoredOptions()) {
    merged.set(option.key, option);
  }
  return [...merged.values()];
}

export function parseAvitoCategoryXmlTemplate(xml: string, fileName?: string | null) {
  const object = convert(xml, { format: "object" }) as Record<string, unknown>;
  const ad = asRecord(asRecord(object.Ads).Ad);
  const fields = Object.keys(ad);
  if (fields.length === 0 || !fields.includes("GoodsType")) {
    throw new Error("Это не похоже на XML-шаблон Avito: нужен тег GoodsType внутри Ads/Ad.");
  }

  const nameParts = parseNameParts(fileName);
  const templateCategoryFields = fields.filter((field) => !commonAdTags.has(field));
  const goodsType = firstText(nodeText(ad.GoodsType), nameParts.goodsType, "Мужская одежда") ?? "Мужская одежда";
  const apparel = firstText(nodeText(ad.Apparel), nameParts.apparel, goodsType) ?? goodsType;
  const productSubtype =
    firstText(
      templateCategoryFields[0] ? nodeText(ad[templateCategoryFields[0]]) : null,
      defaultSubtypeByApparel[apparel],
      apparel
    ) ?? apparel;
  const categorySpecificFields = categoryFieldsFromTemplate(fields, {
    ad,
    goodsType,
    apparel,
    productSubtype
  });
  const extraField = categorySpecificFields[0]?.tag;
  const extraValue = categorySpecificFields[0]?.value;

  const option: StoredClothingCategoryOption = {
    key: optionKey({ goodsType, apparel, fields: templateCategoryFields }),
    label: apparel,
    goodsType,
    apparel,
    productSubtype,
    extraField,
    extraValue,
    categorySpecificFields,
    templateFields: fields,
    sourceFile: fileName ?? undefined,
    sourceFields: fields,
    importedAt: new Date().toISOString()
  };

  return option;
}

export async function importClothingCategoryTemplate(input: {
  xml: string;
  fileName?: string | null;
}) {
  const option = parseAvitoCategoryXmlTemplate(input.xml, input.fileName);
  const stored = await readStoredOptions();
  const next = [
    ...stored.filter((item) => item.key !== option.key),
    option
  ].sort((left, right) => `${left.goodsType} ${left.label}`.localeCompare(`${right.goodsType} ${right.label}`, "ru"));
  await writeStoredOptions(next);

  return {
    category: option,
    categories: await listClothingCategoryOptions()
  };
}

export { clothingSizeValues };
