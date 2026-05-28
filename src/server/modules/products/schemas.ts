import { VariantStatus } from "@prisma/client";
import { z } from "zod";
import { avitoMaterialValues, avitoSizeValues, maxClothingMaterials } from "@/lib/avitoOptions";

const decimalInput = z.union([z.string(), z.number()]).transform((value) => String(value));
const materialValues = [...avitoMaterialValues] as [string, ...string[]];
const booleanFilter = z.preprocess(
  (value) => value === true || value === "true" || value === "1",
  z.boolean()
);
const statusFilter = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : value),
  z.nativeEnum(VariantStatus).optional()
);

export const createProductSchema = z.object({
  title: z.string().min(2),
  brand: z.string().optional().nullable(),
  baseCategory: z.string().min(2),
  baseDescription: z.string().optional().nullable(),
  supplierUrl: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  avitoAttributes: z.record(z.unknown()).optional().nullable()
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  search: z.string().optional(),
  color: z.string().optional(),
  size: z.string().optional(),
  category: z.string().optional(),
  supplier: z.string().optional(),
  status: statusFilter,
  withoutSupplier: booleanFilter,
  withoutPhotos: booleanFilter,
  xmlIssues: booleanFilter
});

export const createVariantSchema = z.object({
  title: z.string().min(2),
  color: z.string().min(1),
  size: z.string().min(1),
  price: decimalInput,
  quantity: z.coerce.number().int().min(0).default(0),
  description: z.string().optional().nullable(),
  supplierUrl: z.string().optional().nullable(),
  supplierName: z.string().optional().nullable(),
  status: z.nativeEnum(VariantStatus).default(VariantStatus.DRAFT)
});

const colorGroupSchema = z.object({
  color: z.string().min(1),
  manufacturerColor: z.string().optional().nullable(),
  sizes: z.array(z.enum(avitoSizeValues as [string, ...string[]])).min(1)
});

export const createProductWithVariantsSchema = createProductSchema
  .extend({
    material: z.string().optional().nullable(),
    materials: z
      .array(z.enum(materialValues))
      .max(maxClothingMaterials)
      .optional(),
    adType: z.string().optional().nullable(),
    condition: z.string().optional().nullable(),
    clothingItem: z.string().optional().nullable(),
    multiItemName: z.string().optional().nullable(),
    price: decimalInput.optional(),
    quantity: z.coerce.number().int().min(0).default(1),
    colorGroups: z.array(colorGroupSchema).optional(),
    variants: z.array(createVariantSchema).optional()
  })
  .superRefine((data, context) => {
    if (!data.colorGroups?.length && !data.variants?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Добавьте хотя бы один цвет с размером.",
        path: ["colorGroups"]
      });
    }
    if (data.colorGroups?.length && !data.price) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Укажите цену для мультиобъявления.",
        path: ["price"]
      });
    }
    if (data.colorGroups?.length && data.quantity < 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Количество должно быть больше 0.",
        path: ["quantity"]
      });
    }
  });

export const updateVariantSchema = createVariantSchema.partial().extend({
  avitoItemId: z.string().optional().nullable(),
  lastError: z.string().optional().nullable()
});

export const bulkStatusSchema = z.object({
  variantIds: z.array(z.string()).min(1),
  status: z.nativeEnum(VariantStatus)
});

export const expandVariantSizesSchema = z.object({
  sizes: z.array(z.enum(avitoSizeValues as [string, ...string[]])).min(1)
});
