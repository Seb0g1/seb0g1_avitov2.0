import { describe, expect, it } from "vitest";
import type { ProductDto } from "@/types/catalog";
import { buildCatalogProductRows, variantIdsForSelectedProducts } from "./catalogRows";

const product: ProductDto = {
  id: "product-1",
  title: "Футболка Acne Studios",
  brand: "Acne Studios",
  baseCategory: "Одежда, обувь, аксессуары",
  baseDescription: "Описание товара",
  avitoAttributes: null,
  supplier: null,
  createdAt: "2026-05-27T10:00:00.000Z",
  updatedAt: "2026-05-27T10:00:00.000Z",
  variants: [
    {
      id: "variant-white-m",
      productId: "product-1",
      title: "Футболка Acne Studios (Белый)",
      color: "Белый",
      size: "48 (M)",
      price: "2199",
      quantity: 2,
      description: "Белый M",
      status: "READY",
      avitoItemId: "111",
      lastError: null,
      lastPublishedAt: null,
      lastSyncedAt: null,
      updatedAt: "2026-05-27T10:00:00.000Z",
      supplier: null,
      effectiveSupplier: null,
      photos: [{ id: "photo-1", publicUrl: "https://example.com/1.jpg", sortOrder: 0 }]
    },
    {
      id: "variant-black-l",
      productId: "product-1",
      title: "Футболка Acne Studios (Черный)",
      color: "Черный",
      size: "50 (L)",
      price: "2499",
      quantity: 3,
      description: "Черный L",
      status: "PUBLISHED",
      avitoItemId: "222",
      lastError: null,
      lastPublishedAt: null,
      lastSyncedAt: null,
      updatedAt: "2026-05-27T10:00:00.000Z",
      supplier: null,
      effectiveSupplier: null,
      photos: []
    }
  ]
};

describe("catalog row aggregation", () => {
  it("aggregates a multi-listing product into one catalog row", () => {
    const [row] = buildCatalogProductRows([product]);

    expect(row.colors).toEqual(["Белый", "Черный"]);
    expect(row.sizes).toEqual(["48 (M)", "50 (L)"]);
    expect(row.minPrice).toBe(2199);
    expect(row.maxPrice).toBe(2499);
    expect(row.totalQuantity).toBe(5);
    expect(row.photoCount).toBe(1);
    expect(row.avitoItemIds).toEqual(["111", "222"]);
    expect(row.statusCounts).toContainEqual({ status: "PUBLISHED", count: 1 });
  });

  it("resolves selected product ids to all child variant ids", () => {
    expect(variantIdsForSelectedProducts([product], ["product-1"])).toEqual([
      "variant-white-m",
      "variant-black-l"
    ]);
  });
});
