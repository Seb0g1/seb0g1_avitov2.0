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

export function parseMoyskladSupplierUrl(value: unknown) {
  if (value == null || String(value).trim() === "") {
    return null;
  }

  let url: URL;
  try {
    url = new URL(String(value).trim());
  } catch {
    throw new Error("Вставьте публичную ссылку МойСклад B2B с productId и categoryId.");
  }

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
    url: url.toString(),
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

  const parsed = parseMoyskladSupplierUrl(input.supplierUrl);

  if (!parsed) {
    return {
      supplierUrl: null,
      supplierName: name,
      supplierProductId: null,
      supplierCategoryId: null,
      supplierCatalogToken: null,
      supplierUpdatedAt: null
    };
  }

  return {
    supplierUrl: parsed.url,
    supplierName: name,
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
