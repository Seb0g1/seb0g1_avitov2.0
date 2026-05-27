import type { ActionLog, ErrorLog, Product, PublicationJob, Variant, Photo } from "@prisma/client";
import {
  ownerSupplier,
  resolveEffectiveSupplier,
  type SupplierLink
} from "@/server/modules/suppliers/moysklad";
import type { ActionLogDto, ErrorLogDto, JobDto, ProductDto, SupplierDto, VariantDto } from "@/types/catalog";

type VariantWithPhotos = Variant & { photos: Photo[] };
type ProductWithVariants = Product & { variants: VariantWithPhotos[] };

function serializeSupplier(supplier: SupplierLink | null): SupplierDto | null {
  if (!supplier) {
    return null;
  }

  return {
    url: supplier.url,
    name: supplier.name,
    productId: supplier.productId,
    categoryId: supplier.categoryId,
    catalogToken: supplier.catalogToken,
    updatedAt:
      supplier.updatedAt instanceof Date
        ? supplier.updatedAt.toISOString()
        : supplier.updatedAt ?? null
  };
}

export function serializeVariant(variant: VariantWithPhotos, product?: Product): VariantDto {
  const supplier = serializeSupplier(ownerSupplier(variant));
  const effectiveSupplier = serializeSupplier(product ? resolveEffectiveSupplier(product, variant) : ownerSupplier(variant));

  return {
    id: variant.id,
    productId: variant.productId,
    title: variant.title,
    color: variant.color,
    size: variant.size,
    price: variant.price.toString(),
    quantity: variant.quantity,
    description: variant.description,
    status: variant.status,
    avitoItemId: variant.avitoItemId,
    lastError: variant.lastError,
    lastPublishedAt: variant.lastPublishedAt?.toISOString() ?? null,
    lastSyncedAt: variant.lastSyncedAt?.toISOString() ?? null,
    updatedAt: variant.updatedAt.toISOString(),
    supplier,
    effectiveSupplier,
    photos: variant.photos.map((photo) => ({
      id: photo.id,
      publicUrl: photo.publicUrl,
      sortOrder: photo.sortOrder
    }))
  };
}

export function serializeProduct(product: ProductWithVariants): ProductDto {
  const avitoAttributes =
    product.avitoAttributes && typeof product.avitoAttributes === "object" && !Array.isArray(product.avitoAttributes)
      ? (product.avitoAttributes as Record<string, unknown>)
      : null;

  const supplier = serializeSupplier(ownerSupplier(product));

  return {
    id: product.id,
    title: product.title,
    brand: product.brand,
    baseCategory: product.baseCategory,
    baseDescription: product.baseDescription,
    avitoAttributes,
    supplier,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    variants: product.variants.map((variant) => serializeVariant(variant, product))
  };
}

export function serializeJob(job: PublicationJob): JobDto {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    mode: job.mode,
    attempts: job.attempts,
    error: job.error,
    queuedAt: job.queuedAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null
  };
}

export function serializeActionLog(log: ActionLog): ActionLogDto {
  return {
    id: log.id,
    level: log.level,
    message: log.message,
    createdAt: log.createdAt.toISOString()
  };
}

export function serializeErrorLog(log: ErrorLog): ErrorLogDto {
  return {
    id: log.id,
    source: log.source,
    message: log.message,
    createdAt: log.createdAt.toISOString()
  };
}
