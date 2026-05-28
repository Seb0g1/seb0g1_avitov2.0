import { describe, expect, it } from "vitest";
import {
  getClothingCategoryOption,
  materialOptionsForCategory,
  normalizeAvitoColor,
  normalizeMaterialsForCategory
} from "./avitoOptions";

describe("Avito options", () => {
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
});
