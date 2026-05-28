export type SupplierLink = {
  url: string | null;
  name: string | null;
  productId: string | null;
  categoryId: string | null;
  catalogToken: string | null;
  updatedAt?: Date | string | null;
};

export type SupplierOwner = {
  supplierUrl: string | null;
  supplierName: string | null;
  supplierProductId: string | null;
  supplierCategoryId: string | null;
  supplierCatalogToken: string | null;
  supplierUpdatedAt?: Date | null;
};

const moyskladHost = "b2b.moysklad.ru";
const telegramHosts = new Set(["t.me", "telegram.me", "telegram.dog"]);
const safeSupplierProtocols = new Set(["http:", "https:", "tg:"]);
const supplierUrlError =
  "Вставьте ссылку поставщика: Telegram, сайт или публичную ссылку МойСклад B2B.";

function isMoyskladUrl(url: URL) {
  return url.protocol === "https:" && url.hostname === moyskladHost;
}

function isTelegramUrl(url: URL) {
  return url.protocol === "tg:" || telegramHosts.has(url.hostname.toLowerCase());
}

function withSupplierProtocol(value: string) {
  if (value.startsWith("@")) {
    return `https://t.me/${value.slice(1)}`;
  }
  if (/^(https?:|tg:)/i.test(value)) {
    return value;
  }
  if (/^(t\.me|telegram\.me|telegram\.dog)\//i.test(value)) {
    return `https://${value}`;
  }
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:?#]|$)/i.test(value)) {
    return `https://${value}`;
  }
  return value;
}

export function normalizeSupplierUrl(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(withSupplierProtocol(text));
  } catch {
    throw new Error(supplierUrlError);
  }

  if (!safeSupplierProtocols.has(url.protocol)) {
    throw new Error(supplierUrlError);
  }

  return url.toString();
}

function inferredSupplierName(url: string, name: string | null) {
  if (name) {
    return name;
  }

  const parsed = new URL(url);
  if (isMoyskladUrl(parsed)) {
    return "МойСклад";
  }
  if (isTelegramUrl(parsed)) {
    return "Telegram";
  }
  return "Поставщик";
}

export function parseMoyskladSupplierUrl(value: unknown) {
  const normalizedUrl = normalizeSupplierUrl(value);
  if (!normalizedUrl) {
    return null;
  }

  const url = new URL(normalizedUrl);

  const [, publicSegment, catalogToken, catalogSegment] = url.pathname.split("/");
  const productId = url.searchParams.get("productId")?.trim() ?? "";
  const categoryId = url.searchParams.get("categoryId")?.trim() ?? "";

  if (
    url.protocol !== "https:" ||
    url.hostname !== moyskladHost ||
    publicSegment !== "public" ||
    !catalogToken ||
    catalogSegment !== "catalog" ||
    !productId ||
    !categoryId
  ) {
    throw new Error("Вставьте публичную ссылку МойСклад B2B с productId и categoryId.");
  }

  return {
    url: normalizedUrl,
    productId,
    categoryId,
    catalogToken
  };
}

export function supplierToPrismaData(input: {
  supplierUrl?: unknown;
  supplierName?: unknown;
}) {
  if (input.supplierUrl === undefined && input.supplierName === undefined) {
    return {};
  }

  const name =
    typeof input.supplierName === "string" && input.supplierName.trim()
      ? input.supplierName.trim()
      : null;

  if (input.supplierUrl === undefined) {
    return { supplierName: name };
  }

  const normalizedUrl = normalizeSupplierUrl(input.supplierUrl);

  if (!normalizedUrl) {
    return {
      supplierUrl: null,
      supplierName: name,
      supplierProductId: null,
      supplierCategoryId: null,
      supplierCatalogToken: null,
      supplierUpdatedAt: null
    };
  }

  const supplierName = inferredSupplierName(normalizedUrl, name);
  const parsedUrl = new URL(normalizedUrl);

  if (!isMoyskladUrl(parsedUrl)) {
    return {
      supplierUrl: normalizedUrl,
      supplierName,
      supplierProductId: null,
      supplierCategoryId: null,
      supplierCatalogToken: null,
      supplierUpdatedAt: new Date()
    };
  }

  const parsed = parseMoyskladSupplierUrl(normalizedUrl);
  if (!parsed) {
    throw new Error(supplierUrlError);
  }

  return {
    supplierUrl: parsed.url,
    supplierName,
    supplierProductId: parsed.productId,
    supplierCategoryId: parsed.categoryId,
    supplierCatalogToken: parsed.catalogToken,
    supplierUpdatedAt: new Date()
  };
}

export function ownerSupplier(owner: SupplierOwner): SupplierLink | null {
  if (!owner.supplierUrl) {
    return null;
  }

  return {
    url: owner.supplierUrl,
    name: owner.supplierName,
    productId: owner.supplierProductId,
    categoryId: owner.supplierCategoryId,
    catalogToken: owner.supplierCatalogToken,
    updatedAt: owner.supplierUpdatedAt ?? null
  };
}

export function resolveEffectiveSupplier(product: SupplierOwner, variant?: SupplierOwner) {
  return ownerSupplier(variant ?? product) ?? ownerSupplier(product);
}
