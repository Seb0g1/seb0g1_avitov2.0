import crypto from "node:crypto";
import { Prisma, VariantStatus } from "@prisma/client";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import { supplierToPrismaData } from "@/server/modules/suppliers/moysklad";
import {
  buildMultiItemGroup,
  buildVariantArticle,
  buildVariantDescription,
  clothingSizeValues,
  uniqueValues
} from "./clothing";
import {
  bulkStatusSchema,
  createProductSchema,
  createProductWithVariantsSchema,
  createVariantSchema,
  productListQuerySchema,
  updateProductSchema,
  updateVariantSchema
} from "./schemas";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function productAttributes(input: {
  title: string;
  material?: string | null;
  avitoAttributes?: Record<string, unknown> | null;
}) {
  const existing = asRecord(input.avitoAttributes);
  const material = input.material?.trim();
  const seed = crypto.randomUUID();
  return {
    ...existing,
    ...(material ? { material } : {}),
    sizeGrid: clothingSizeValues,
    multiItemGroup: String(existing.multiItemGroup ?? buildMultiItemGroup(input.title, seed))
  };
}

export async function listProducts(input: unknown) {
  const query = productListQuerySchema.parse(input);
  const variantWhere: Prisma.VariantWhereInput = {
    ...(query.color ? { color: { contains: query.color, mode: "insensitive" } } : {}),
    ...(query.size ? { size: { contains: query.size, mode: "insensitive" } } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.withoutSupplier ? { supplierUrl: null } : {})
  };

  return prisma.product.findMany({
    where: {
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: "insensitive" } },
              { brand: { contains: query.search, mode: "insensitive" } },
              { variants: { some: { title: { contains: query.search, mode: "insensitive" } } } }
            ]
          }
        : {}),
      ...(Object.keys(variantWhere).length ? { variants: { some: variantWhere } } : {}),
      ...(query.withoutSupplier ? { supplierUrl: null } : {})
    },
    include: {
      variants: {
        where: Object.keys(variantWhere).length ? variantWhere : undefined,
        include: { photos: { orderBy: { sortOrder: "asc" } } },
        orderBy: { updatedAt: "desc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function getProduct(id: string) {
  return prisma.product.findUniqueOrThrow({
    where: { id },
    include: {
      variants: {
        include: { photos: { orderBy: { sortOrder: "asc" } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });
}

export async function createProduct(input: unknown) {
  const data = createProductSchema.parse(input);
  const { avitoAttributes, supplierUrl, supplierName, ...productData } = data;
  const product = await prisma.product.create({
    data: {
      ...productData,
      ...supplierToPrismaData({ supplierUrl, supplierName }),
      avitoAttributes:
        avitoAttributes === null
          ? Prisma.JsonNull
          : (avitoAttributes as Prisma.InputJsonValue | undefined)
    }
  });
  await prisma.actionLog.create({
    data: { message: "Product created", context: { productId: product.id } }
  });
  return product;
}

export async function createProductWithVariants(input: unknown) {
  const data = createProductWithVariantsSchema.parse(input);
  const supplierData = supplierToPrismaData({
    supplierUrl: data.supplierUrl,
    supplierName: data.supplierName
  });
  const attributes = productAttributes({
    title: data.title,
    material: data.material,
    avitoAttributes: data.avitoAttributes
  });
  const material = String(attributes.material ?? "");
  const colorGroups = data.colorGroups ?? [];
  const colors = uniqueValues(colorGroups.map((group) => group.color));
  const sizes = uniqueValues(colorGroups.flatMap((group) => group.sizes));
  const variants =
    colorGroups.length > 0
      ? colorGroups.flatMap((group) =>
          group.sizes.map((size) => {
            const title = `${data.title} (${group.color})`;
            const article = buildVariantArticle(data.title, group.color, size);
            return {
              title,
              color: group.color,
              size,
              price: data.price ?? "0",
              quantity: data.quantity,
              description: buildVariantDescription({
                title: data.title,
                material,
                color: group.color,
                size,
                article,
                colors,
                sizes
              }),
              status: VariantStatus.DRAFT
            };
          })
        )
      : (data.variants ?? []).map((variant) => {
          const { supplierUrl, supplierName, ...variantData } = variant;
          return {
            ...variantData,
            ...supplierToPrismaData({ supplierUrl, supplierName }),
            status: variant.status ?? VariantStatus.DRAFT
          };
        });

  const product = await prisma.$transaction(async (tx) => {
    const createdProduct = await tx.product.create({
      data: {
        title: data.title,
        brand: data.brand,
        baseCategory: data.baseCategory,
        baseDescription: data.baseDescription,
        ...supplierData,
        avitoAttributes: attributes as Prisma.InputJsonValue,
        variants: {
          create: variants
        }
      },
      include: {
        variants: {
          include: { photos: { orderBy: { sortOrder: "asc" } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    await tx.actionLog.create({
      data: {
        message: "Product with variants created",
        context: {
          productId: createdProduct.id,
          variantCount: createdProduct.variants.length
        }
      }
    });

    return createdProduct;
  });

  return product;
}

export async function updateProduct(id: string, input: unknown) {
  const data = updateProductSchema.parse(input);
  const { avitoAttributes, supplierUrl, supplierName, ...productData } = data;
  const existing = await prisma.product.findUnique({ where: { id }, select: { avitoAttributes: true } });
  const mergedAttributes =
    avitoAttributes === undefined
      ? undefined
      : avitoAttributes === null
        ? Prisma.JsonNull
        : ({
            ...asRecord(existing?.avitoAttributes),
            ...asRecord(avitoAttributes)
          } as Prisma.InputJsonValue);
  const supplierData = supplierToPrismaData({ supplierUrl, supplierName });
  const product = await prisma.product.update({
    where: { id },
    data: {
      ...productData,
      ...supplierData,
      avitoAttributes: mergedAttributes
    }
  });
  await prisma.actionLog.create({
    data: { message: "Product updated", context: { productId: product.id } }
  });
  if ("supplierUrl" in data || "supplierName" in data) {
    await prisma.actionLog.create({
      data: { message: "Product supplier link updated", context: { productId: product.id } }
    });
  }
  return product;
}

export async function listAvitoCategories() {
  const categories = await prisma.product.findMany({
    distinct: ["baseCategory"],
    select: { baseCategory: true },
    orderBy: { baseCategory: "asc" }
  });

  return uniqueValues([env.DEFAULT_AVITO_CATEGORY, ...categories.map((category) => category.baseCategory)]);
}

export async function regenerateProductDescriptions(id: string) {
  const product = await prisma.product.findUniqueOrThrow({
    where: { id },
    include: { variants: true }
  });
  const attributes = asRecord(product.avitoAttributes);
  const material = String(attributes.material ?? "");
  const colors = uniqueValues(product.variants.map((variant) => variant.color));
  const sizes = uniqueValues(product.variants.map((variant) => variant.size));

  await prisma.$transaction(
    product.variants.map((variant) =>
      prisma.variant.update({
        where: { id: variant.id },
        data: {
          description: buildVariantDescription({
            title: product.title,
            material,
            color: variant.color,
            size: variant.size,
            article: buildVariantArticle(product.title, variant.color, variant.size),
            colors,
            sizes
          })
        }
      })
    )
  );

  await prisma.actionLog.create({
    data: { message: "Variant descriptions regenerated", context: { productId: id } }
  });

  return getProduct(id);
}

export async function deleteProduct(id: string) {
  await prisma.product.delete({ where: { id } });
  await prisma.actionLog.create({
    data: { message: "Product deleted", context: { productId: id } }
  });
}

export async function createVariant(productId: string, input: unknown) {
  const data = createVariantSchema.parse(input);
  const { supplierUrl, supplierName, ...variantData } = data;
  const variant = await prisma.variant.create({
    data: { ...variantData, ...supplierToPrismaData({ supplierUrl, supplierName }), productId },
    include: { photos: true }
  });
  await prisma.actionLog.create({
    data: { message: "Variant created", context: { productId, variantId: variant.id } }
  });
  return variant;
}

export async function updateVariant(id: string, input: unknown) {
  const data = updateVariantSchema.parse(input);
  const { supplierUrl, supplierName, ...variantData } = data;
  const supplierData = supplierToPrismaData({ supplierUrl, supplierName });
  const variant = await prisma.variant.update({
    where: { id },
    data: { ...variantData, ...supplierData },
    include: { photos: { orderBy: { sortOrder: "asc" } } }
  });
  await prisma.actionLog.create({
    data: { message: "Variant updated", context: { variantId: variant.id } }
  });
  if ("supplierUrl" in data || "supplierName" in data) {
    await prisma.actionLog.create({
      data: { message: "Variant supplier link updated", context: { variantId: variant.id } }
    });
  }
  return variant;
}

export async function deleteVariant(id: string) {
  await prisma.variant.delete({ where: { id } });
  await prisma.actionLog.create({
    data: { message: "Variant deleted", context: { variantId: id } }
  });
}

export async function duplicateVariant(id: string) {
  const variant = await prisma.variant.findUniqueOrThrow({
    where: { id },
    include: { photos: { orderBy: { sortOrder: "asc" } } }
  });

  const duplicated = await prisma.variant.create({
    data: {
      productId: variant.productId,
      title: `${variant.title} copy`,
      color: variant.color,
      size: variant.size,
      price: variant.price,
      quantity: variant.quantity,
      description: variant.description,
      status: VariantStatus.DRAFT,
      supplierUrl: variant.supplierUrl,
      supplierName: variant.supplierName,
      supplierProductId: variant.supplierProductId,
      supplierCategoryId: variant.supplierCategoryId,
      supplierCatalogToken: variant.supplierCatalogToken,
      supplierUpdatedAt: variant.supplierUpdatedAt,
      photos: {
        create: variant.photos.map((photo) => ({
          path: photo.path,
          publicUrl: photo.publicUrl,
          sortOrder: photo.sortOrder
        }))
      }
    },
    include: { photos: { orderBy: { sortOrder: "asc" } } }
  });

  await prisma.actionLog.create({
    data: {
      message: "Variant duplicated",
      context: { sourceVariantId: id, variantId: duplicated.id }
    }
  });

  return duplicated;
}

export async function bulkUpdateVariantStatus(input: unknown) {
  const data = bulkStatusSchema.parse(input);
  const result = await prisma.variant.updateMany({
    where: { id: { in: data.variantIds } },
    data: { status: data.status }
  });

  await prisma.actionLog.create({
    data: {
      message: "Variant statuses updated",
      context: { count: result.count, status: data.status }
    }
  });

  return result;
}
