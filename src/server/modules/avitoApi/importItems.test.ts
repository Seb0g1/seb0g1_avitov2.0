import { describe, expect, it } from "vitest";
import { buildImportedProductGroupKey } from "./importItems";

describe("Avito import grouping", () => {
  it("uses explicit multi-listing group keys when Avito returns them", () => {
    const first = buildImportedProductGroupKey({
      title: "Футболка Acne Studios (Черный)",
      brand: "Acne Studios",
      category: "Одежда, обувь, аксессуары",
      raw: { multiItemGroup: "acne-shirt-2026" }
    });
    const second = buildImportedProductGroupKey({
      title: "Футболка Acne Studios (Белый)",
      brand: "Acne Studios",
      category: "Одежда, обувь, аксессуары",
      raw: { multi_item_group: "acne-shirt-2026" }
    });

    expect(first?.key).toBe(second?.key);
    expect(first?.source).toBe("explicit");
  });

  it("normalizes autoload ids by removing color and size suffixes", () => {
    const first = buildImportedProductGroupKey({
      title: "Футболка Ami Paris XP (Белый)",
      brand: "Ami",
      category: "Одежда, обувь, аксессуары",
      raw: { autoload_item_id: "AV-FUTBOLKAAMIPARISXP-BELYY-M" }
    });
    const second = buildImportedProductGroupKey({
      title: "Футболка Ami Paris XP (Черный)",
      brand: "Ami",
      category: "Одежда, обувь, аксессуары",
      raw: { autoload_item_id: "AV-FUTBOLKAAMIPARISXP-CHERNYI-L" }
    });

    expect(first?.key).toBe(second?.key);
    expect(first?.source).toBe("autoload");
  });

  it("does not group unsafe imported items without brand and group data", () => {
    expect(
      buildImportedProductGroupKey({
        title: "Футболка",
        category: "Одежда, обувь, аксессуары",
        raw: {}
      })
    ).toBeNull();
  });
});
