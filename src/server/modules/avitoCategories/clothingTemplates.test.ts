import { describe, expect, it } from "vitest";
import { parseAvitoCategoryXmlTemplate } from "./clothingTemplates";

function xmlWith(fields: string[]) {
  return `<Ads formatVersion="3" target="Avito.ru"><Ad>${fields
    .map((field) => `<${field}></${field}>`)
    .join("")}</Ad></Ads>`;
}

describe("Avito clothing XML category templates", () => {
  it("imports shirts template metadata from Avito XML", () => {
    const option = parseAvitoCategoryXmlTemplate(
      xmlWith(["GoodsType", "Apparel", "GoodsSubType", "Size"]),
      "Мужская одежда - Кофты и футболки - Шаблон 27-05-2026.xml"
    );

    expect(option.goodsType).toBe("Мужская одежда");
    expect(option.apparel).toBe("Кофты и футболки");
    expect(option.extraField).toBe("GoodsSubType");
    expect(option.extraValue).toBe("Футболка");
  });

  it("imports category-specific fields from templates", () => {
    const shorts = parseAvitoCategoryXmlTemplate(
      xmlWith(["GoodsType", "Apparel", "ShortsStyle", "Size"]),
      "Мужская одежда - Шорты - Шаблон 27-05-2026.xml"
    );
    const bomber = parseAvitoCategoryXmlTemplate(
      xmlWith(["GoodsType", "Apparel", "ApparelType", "Size"]),
      "Верхняя одежда - Бомберы - Шаблон 27-05-2026.xml"
    );
    const jeans = parseAvitoCategoryXmlTemplate(
      xmlWith(["GoodsType", "Apparel", "Size"]),
      "Мужская одежда - Джинсы - Шаблон 27-05-2026.xml"
    );

    expect(shorts.apparel).toBe("Шорты");
    expect(shorts.extraField).toBe("ShortsStyle");
    expect(shorts.extraValue).toBe("Повседневные");
    expect(bomber.goodsType).toBe("Верхняя одежда");
    expect(bomber.extraField).toBe("ApparelType");
    expect(bomber.extraValue).toBe("Бомбер");
    expect(jeans.apparel).toBe("Джинсы");
    expect(jeans.extraField).toBeUndefined();
  });
});
