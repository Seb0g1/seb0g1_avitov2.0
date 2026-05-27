-- Add MoySklad B2B supplier links to products and variant-level overrides.
ALTER TABLE "Product"
ADD COLUMN "supplierUrl" TEXT,
ADD COLUMN "supplierName" TEXT,
ADD COLUMN "supplierProductId" TEXT,
ADD COLUMN "supplierCategoryId" TEXT,
ADD COLUMN "supplierCatalogToken" TEXT,
ADD COLUMN "supplierUpdatedAt" TIMESTAMP(3);

ALTER TABLE "Variant"
ADD COLUMN "supplierUrl" TEXT,
ADD COLUMN "supplierName" TEXT,
ADD COLUMN "supplierProductId" TEXT,
ADD COLUMN "supplierCategoryId" TEXT,
ADD COLUMN "supplierCatalogToken" TEXT,
ADD COLUMN "supplierUpdatedAt" TIMESTAMP(3);

CREATE INDEX "Product_supplierProductId_idx" ON "Product"("supplierProductId");
CREATE INDEX "Variant_supplierProductId_idx" ON "Variant"("supplierProductId");
