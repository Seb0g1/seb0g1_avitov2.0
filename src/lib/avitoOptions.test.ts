import { describe, expect, it } from "vitest";
import {
  getClothingCategoryOption,
  materialOptionsForCategory,
  defaultAvitoBaseCategory,
  normalizeAvitoColor,
  normalizeAvitoBaseCategory,
  normalizeMaterialsForCategory
} from "./avitoOptions";

describe("Avito options", () => {
  it("falls back from empty or punctuation-only Avito categories", () => {
    expect(normalizeAvitoBaseCategory("")).toBe(defaultAvitoBaseCategory);
    expect(normalizeAvitoBaseCategory(", ,")).toBe(defaultAvitoBaseCategory);
    expect(normalizeAvitoBaseCategory("Одежда, обувь, аксессуары")).toBe(defaultAvitoBaseCategory);
  });

  it("normalizes color spelling to Avito values", () => {
    expect(normalizeAvitoColor("Черный")).toBe("Чёрный");
    expect(normalizeAvitoColor("Желтый")).toBe("Жёлтый");
    expect(normalizeAvitoColor("Зеленый")).toBe("Зелёный");
    expect(normalizeAvitoColor("Белый")).toBe("Белый");
  });

  it("uses Avito footwear materials for shoe categories", () => {
    const sneakers = getClothingCategoryOption("men-sneakers");
    expect(materialOptionsForCategory(sneakers)).toContain("Полиуретан");
    expect(materialOptionsForCategory(sneakers)).toContain("ЭВА");
    expect(normalizeMaterialsForCategory(["Полиэстер", "кожа"], null, sneakers)).toEqual([
      "Полиэфир",
      "Натуральная кожа"
    ]);
    expect(normalizeMaterialsForCategory(["Непонятный материал"], null, sneakers)).toEqual([
      "Синтетический"
    ]);
  });

  it("uses Avito jeans materials for jeans categories", () => {
    const jeans = getClothingCategoryOption("women-jeans");
    expect(materialOptionsForCategory(jeans)).toContain("Джинса/деним");
    expect(materialOptionsForCategory(jeans)).toContain("Полиэстер");
    expect(materialOptionsForCategory(jeans)).toContain("Эластан");
    expect(normalizeMaterialsForCategory(["деним", "спандекс"], null, jeans)).toEqual([
      "Джинса/деним",
      "Спандекс"
    ]);
    expect(normalizeMaterialsForCategory(["Непонятный материал"], null, jeans)).toEqual([
      "Джинса/деним"
    ]);
  });

  it("uses Avito bag material values for bags", () => {
    const bags = getClothingCategoryOption("bags");
    expect(materialOptionsForCategory(bags)).toEqual([
      "Натуральная кожа",
      "Искусственная кожа",
      "Другой"
    ]);
    expect(normalizeMaterialsForCategory(["экокожа"], null, bags)).toEqual(["Искусственная кожа"]);
    expect(normalizeMaterialsForCategory(["полиэстер"], null, bags)).toEqual(["Другой"]);
    expect(normalizeMaterialsForCategory([], null, bags)).toEqual(["Натуральная кожа"]);
  });
});
