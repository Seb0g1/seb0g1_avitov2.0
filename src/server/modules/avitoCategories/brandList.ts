import fs from "node:fs/promises";
import path from "node:path";
import { convert } from "xmlbuilder2";

const brandCatalogUrl = "https://www.avito.ru/web/1/catalogs/content/feed/brendy_fashion.xml";
const dataDir = path.resolve(process.cwd(), "data");
const storagePath = path.join(dataDir, "avito-fashion-brands.json");
const fallbackBrands = ["Nike", "Adidas", "Puma", "Acne Studios", "Balenciaga", "Ami", "Y-3"];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)));
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.replace(/\u00a0/g, " ").trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "ru"));
}

export function parseAvitoFashionBrandXml(xml: string) {
  const object = convert(xml, { format: "object" }) as Record<string, unknown>;
  const root = asRecord(object.Brendy_fashion);
  const brandNodes = Array.isArray(root.brand) ? root.brand : [root.brand];
  return uniqueSorted(
    brandNodes
      .map((node) => asRecord(node)["@name"])
      .filter((name): name is string => typeof name === "string")
      .map(decodeXmlEntities)
  );
}

async function readCachedBrands() {
  try {
    const raw = await fs.readFile(storagePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? uniqueSorted(parsed.map((item) => String(item))) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeCachedBrands(brands: string[]) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(storagePath, JSON.stringify(brands, null, 2), "utf8");
}

export async function listAvitoFashionBrands() {
  try {
    const response = await fetch(brandCatalogUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) {
      throw new Error(`Avito brand catalog responded with ${response.status}`);
    }

    const brands = parseAvitoFashionBrandXml(await response.text());
    if (brands.length > 0) {
      await writeCachedBrands(brands);
      return brands;
    }
  } catch {
    const cached = await readCachedBrands();
    if (cached.length > 0) {
      return cached;
    }
  }

  return fallbackBrands;
}
