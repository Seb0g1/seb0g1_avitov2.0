import { VariantStatus } from "@prisma/client";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import {
  buildVariantArticle,
  buildVariantDescription,
  formatClothingMaterials,
  normalizeClothingMaterials,
  uniqueValues
} from "@/server/modules/products/clothing";
import { resolveEffectiveSupplier } from "@/server/modules/suppliers/moysklad";
import { clothingFeedFieldMap } from "./fieldMap";

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
  address: string;
  contactPhone: string;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getFeedRows(options?: {
  variantIds?: string[];
  statuses?: VariantStatus[];
}) {
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

  return variants.map<FeedRow>((variant) => {
    const attributes = asRecord(variant.product.avitoAttributes);
    const materials = normalizeClothingMaterials(attributes.materials, attributes.material);
    const material = formatClothingMaterials(materials);
    const manufacturerColors = asRecord(attributes.manufacturerColors);
    const article = buildVariantArticle(variant.product.title, variant.color, variant.size);
    const colors = uniqueValues(
      variant.product.variants
        .filter((productVariant) => productVariant.quantity > 0)
        .map((productVariant) => productVariant.color)
    );
    const sizes = uniqueValues(
      variant.product.variants
        .filter((productVariant) => productVariant.quantity > 0)
        .map((productVariant) => productVariant.size)
    );
    const multiItemGroup = String(attributes.multiItemGroup ?? variant.productId);
    const supplier = resolveEffectiveSupplier(variant.product, variant);
    return {
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
          color: variant.color,
          size: variant.size,
          article,
          colors,
          sizes
        }),
      brand: variant.product.brand,
      category: variant.product.baseCategory || clothingFeedFieldMap.category,
      goodsType: String(attributes.goodsType ?? clothingFeedFieldMap.goodsType),
      condition: String(attributes.condition ?? clothingFeedFieldMap.condition),
      adType: String(attributes.adType ?? clothingFeedFieldMap.adType),
      clothingItem: String(attributes.clothingItem ?? clothingFeedFieldMap.clothingItem),
      multiItemName: String(attributes.multiItemName ?? variant.product.title),
      manufacturerColor: String(manufacturerColors[variant.color] ?? variant.color),
      material,
      materials,
      multiItem: true,
      multiItemGroup,
      article,
      color: variant.color,
      size: variant.size,
      price: Number(variant.price),
      quantity: variant.quantity,
      status: variant.status,
      updatedAt: variant.updatedAt,
      avitoItemId: variant.avitoItemId,
      photos: variant.photos.map((photo) => photo.publicUrl),
      region: env.STORE_REGION,
      address: env.STORE_ADDRESS,
      contactPhone: env.STORE_PHONE,
      supplierName: supplier?.name ?? null,
      supplierUrl: supplier?.url ?? null,
      supplierProductId: supplier?.productId ?? null,
      supplierCategoryId: supplier?.categoryId ?? null
    };
  });
}
