CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Video_variantId_idx" ON "Video"("variantId");

ALTER TABLE "Video"
ADD CONSTRAINT "Video_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "Variant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
