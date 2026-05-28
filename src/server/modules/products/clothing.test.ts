import { describe, expect, it } from "vitest";
import {
  buildVariantArticle,
  buildVariantDescription,
  clothingSizeOptions,
  footwearSizeOptions,
  sizeCode
} from "./clothing";

describe("clothing helpers", () => {
  it("keeps the fixed Avito clothing size grid", () => {
    expect(clothingSizeOptions.map((size) => size.value)).toEqual([
      "40 (XXS)",
      "42 (XS)",
      "44 (XS/S)",
      "46 (S)",
      "48 (M)",
      "50 (L)",
      "52 (L/XL)",
      "54 (XL)",
      "56 (XXL)",
      "58 (XXL)",
      "60 (3XL)",
      "62 (4XL)",
      "64 (5XL)",
      "66 (6XL)",
      "68 (7XL)",
      "70 (7XL)",
      "72 (8XL)",
      "74 (8XL)",
      "76 (9XL)",
      "78 (10XL)",
      "80 (10XL)",
      "82+ (10XL+)",
      "One size",
      "Без размера"
    ]);
  });

  it("keeps the fixed Avito footwear size grid", () => {
    expect(footwearSizeOptions.map((size) => size.value)).toEqual([
      "36",
      "36,5",
      "37",
      "37,5",
      "38",
      "38,5",
      "39",
      "39,5",
      "40",
      "40,5",
      "41",
      "41,5",
      "42",
      "42,5",
      "43",
      "43,5",
      "44",
      "44,5",
      "45",
      "45,5",
      "46",
      "46,5",
      "47",
      "47,5",
      "48+"
    ]);
    expect(sizeCode("36,5")).toBe("36_5");
    expect(sizeCode("48+")).toBe("48PLUS");
  });

  it("builds stable variant articles", () => {
    expect(buildVariantArticle("Футболка Ami Paris XP", "Белый", "48 (M)")).toBe(
      "AV-FUTBOLKAAMIPARISXP-BELYY-M"
    );
  });

  it("generates the Tochka Style description with variant parameters", () => {
    const description = buildVariantDescription({
      title: "Футболка Ami Paris XP",
      materials: ["Хлопок"],
      color: "Белый",
      size: "48 (M)",
      article: "AV-FUTBOLKAAMIPARISXP-BELYY-M",
      colors: ["Белый", "Черный"],
      sizes: ["48 (M)", "50 (L)"]
    });

    expect(description).toContain("Футболка Ami Paris XP — PREMIUM качество");
    expect(description).toContain("Материал: Хлопок");
    expect(description).toContain("Цвета: Белый, Черный");
    expect(description).toContain("Размер: 48 (M)");
    expect(description).toContain("Артикул: AV-FUTBOLKAAMIPARISXP-BELYY-M");
  });

  it("normalizes legacy material text to Avito material choices", () => {
    const description = buildVariantDescription({
      title: "Футболка",
      material: "100% Хлопок (Premium качество)",
      color: "Черный",
      size: "50 (L)",
      article: "AV-FUTBOLKA-CHERNYI-L",
      colors: ["Черный"],
      sizes: ["50 (L)"]
    });

    expect(description).toContain("Материал: Хлопок");
  });
});
