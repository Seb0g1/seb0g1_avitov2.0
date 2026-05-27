import { describe, expect, it } from "vitest";
import {
  parseMoyskladSupplierUrl,
  resolveEffectiveSupplier,
  supplierToPrismaData,
  type SupplierOwner
} from "./moysklad";

const validUrl =
  "https://b2b.moysklad.ru/public/oWXBoG49bkuB/catalog?categoryId=bef702b5-965c-11f0-0a80-17d5001db421&productId=d434a985-965c-11f0-0a80-0066001d57e2";

function owner(patch: Partial<SupplierOwner>): SupplierOwner {
  return {
    supplierUrl: null,
    supplierName: null,
    supplierProductId: null,
    supplierCategoryId: null,
    supplierCatalogToken: null,
    supplierUpdatedAt: null,
    ...patch
  };
}

describe("MoySklad supplier links", () => {
  it("parses public B2B catalog product links", () => {
    expect(parseMoyskladSupplierUrl(validUrl)).toEqual({
      url: validUrl,
      catalogToken: "oWXBoG49bkuB",
      categoryId: "bef702b5-965c-11f0-0a80-17d5001db421",
      productId: "d434a985-965c-11f0-0a80-0066001d57e2"
    });
  });

  it("rejects unsafe or incomplete links", () => {
    expect(() => parseMoyskladSupplierUrl(validUrl.replace("https://", "http://"))).toThrow();
    expect(() => parseMoyskladSupplierUrl(validUrl.replace("b2b.moysklad.ru", "example.com"))).toThrow();
    expect(() => parseMoyskladSupplierUrl("https://b2b.moysklad.ru/public/token/catalog?productId=1")).toThrow();
  });

  it("resolves variant override before product supplier", () => {
    const product = owner({
      supplierUrl: "https://b2b.moysklad.ru/public/product/catalog?categoryId=cat&productId=parent",
      supplierName: "Parent",
      supplierProductId: "parent",
      supplierCategoryId: "cat",
      supplierCatalogToken: "product"
    });
    const variant = owner({
      supplierUrl: "https://b2b.moysklad.ru/public/variant/catalog?categoryId=cat&productId=child",
      supplierName: "Variant",
      supplierProductId: "child",
      supplierCategoryId: "cat",
      supplierCatalogToken: "variant"
    });

    expect(resolveEffectiveSupplier(product, variant)?.productId).toBe("child");
    expect(resolveEffectiveSupplier(product, owner({}))?.productId).toBe("parent");
  });

  it("clears parsed fields when supplier URL is empty", () => {
    expect(supplierToPrismaData({ supplierUrl: "", supplierName: "" })).toMatchObject({
      supplierUrl: null,
      supplierProductId: null,
      supplierCategoryId: null,
      supplierCatalogToken: null,
      supplierUpdatedAt: null
    });
  });
});
