import { describe, expect, it } from "vitest";
import {
  buildVariantArticle,
  buildVariantDescription,
  clothingSizeOptions
} from "./clothing";

describe("clothing helpers", () => {
  it("keeps the fixed Avito clothing size grid", () => {
    expect(clothingSizeOptions.map((size) => size.value)).toEqual([
      "46 (S)",
      "48 (M)",
      "50 (L)",
      "54 (XL)",
      "56 (2XL)"
    ]);
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
