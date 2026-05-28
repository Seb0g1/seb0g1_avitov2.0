import type { VariantStatus } from "@prisma/client";
import type { ProductDto, SupplierDto, VariantDto } from "@/types/catalog";

const statusOrder: VariantStatus[] = [
  "ERROR",
  "MODERATION",
  "PUBLISHED",
  "UPLOADED",
  "READY",
  "DRAFT",
  "REMOVED"
];

function uniqueFilled(values: Array<string | null | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function priceNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveRowSupplier(product: ProductDto, variants: VariantDto[]): SupplierDto | null {
  return (
    product.supplier ??
    variants.find((variant) => variant.effectiveSupplier)?.effectiveSupplier ??
    null
  );
}

export type CatalogProductRow = {
  product: ProductDto;
  variants: VariantDto[];
  variantIds: string[];
  colors: string[];
  sizes: string[];
  minPrice: number;
  maxPrice: number;
  totalQuantity: number;
  photoCount: number;
  videoCount: number;
  avitoItemIds: string[];
  statusCounts: Array<{ status: VariantStatus; count: number }>;
  supplier: SupplierDto | null;
  description: string | null;
};

export function buildCatalogProductRows(products: ProductDto[]): CatalogProductRow[] {
  return products.map((product) => {
    const variants = product.variants;
    const prices = variants.map((variant) => priceNumber(variant.price));
    const statusCounts = statusOrder
      .map((status) => ({
        status,
        count: variants.filter((variant) => variant.status === status).length
      }))
      .filter((entry) => entry.count > 0);

    return {
      product,
      variants,
      variantIds: variants.map((variant) => variant.id),
      colors: uniqueFilled(variants.map((variant) => variant.color)),
      sizes: uniqueFilled(variants.map((variant) => variant.size)),
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      totalQuantity: variants.reduce((sum, variant) => sum + variant.quantity, 0),
      photoCount: variants.reduce((sum, variant) => sum + variant.photos.length, 0),
      videoCount: variants.reduce((sum, variant) => sum + variant.videos.length, 0),
      avitoItemIds: uniqueFilled(variants.map((variant) => variant.avitoItemId)),
      statusCounts,
      supplier: resolveRowSupplier(product, variants),
      description:
        product.baseDescription ??
        variants.find((variant) => variant.description)?.description ??
        null
    };
  });
}

export function variantIdsForSelectedProducts(products: ProductDto[], selectedProductIds: Iterable<string>) {
  const selected = new Set(selectedProductIds);
  return products
    .filter((product) => selected.has(product.id))
    .flatMap((product) => product.variants.map((variant) => variant.id));
}
