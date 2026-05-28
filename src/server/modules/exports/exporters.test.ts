import { describe, expect, it } from "vitest";
import { VariantStatus } from "@prisma/client";
import ExcelJS from "exceljs";
import type { FeedRow } from "./feedRows";
import { avitoClothingSheetName, buildAvitoXlsx } from "./avitoXlsx";
import { buildAvitoCsv } from "./csv";
import { buildCatalogExcel } from "./excel";
import { buildAvitoXml } from "./xml";

const rows: FeedRow[] = [
  {
    externalId: "product-variant-black-m",
    productId: "product",
    variantId: "variant-black-m",
    title: "Nike Stussy Black M",
    description: "Black M description",
    brand: "Nike",
    category: "Одежда, обувь, аксессуары",
    goodsType: "Мужская одежда",
    condition: "Новое с биркой",
    material: "Хлопок",
    materials: ["Хлопок"],
    adType: "Товар приобретен на продажу",
    clothingItem: "Кофты и футболки",
    productSubtype: "Футболка",
    categorySpecificFields: [{ tag: "GoodsSubType", value: "Футболка" }],
    templateFields: [],
    multiItemName: "Nike Stussy",
    manufacturerColor: "Black",
    multiItem: true,
    multiItemGroup: "MI-NIKESTUSSY",
    article: "AV-NIKESTUSSY-BLACK-M",
    color: "Black",
    size: "48 (M)",
    price: 12990,
    quantity: 3,
    status: VariantStatus.READY,
    updatedAt: new Date("2026-05-27T10:00:00Z"),
    avitoItemId: null,
    photos: ["https://example.com/black-m.jpg"],
    videoUrl: null,
    region: "Москва",
    city: "Москва",
    address: "Россия, Москва, Тверская улица, 1",
    latitude: null,
    longitude: null,
    contactPhone: "+7 999 000-00-00",
    contactMethod: "В сообщениях",
    targetAudience: "Частные лица и бизнес",
    supplierName: "МойСклад",
    supplierUrl: "https://b2b.moysklad.ru/public/token/catalog?categoryId=category&productId=product",
    supplierProductId: "product",
    supplierCategoryId: "category"
  },
  {
    externalId: "product-variant-grey-l",
    productId: "product",
    variantId: "variant-grey-l",
    title: "Nike Stussy Grey L",
    description: "Grey L description",
    brand: "Nike",
    category: "Одежда, обувь, аксессуары",
    goodsType: "Мужская одежда",
    condition: "Новое с биркой",
    material: "Хлопок",
    materials: ["Хлопок"],
    adType: "Товар приобретен на продажу",
    clothingItem: "Кофты и футболки",
    productSubtype: "Футболка",
    categorySpecificFields: [{ tag: "GoodsSubType", value: "Футболка" }],
    templateFields: [],
    multiItemName: "Nike Stussy",
    manufacturerColor: "Grey",
    multiItem: true,
    multiItemGroup: "MI-NIKESTUSSY",
    article: "AV-NIKESTUSSY-GREY-L",
    color: "Grey",
    size: "50 (L)",
    price: 11990,
    quantity: 2,
    status: VariantStatus.READY,
    updatedAt: new Date("2026-05-27T10:00:00Z"),
    avitoItemId: null,
    photos: ["https://example.com/grey-l.jpg"],
    videoUrl: "https://example.com/grey-l.mov",
    region: "Москва",
    city: "Москва",
    address: "Россия, Москва, Тверская улица, 1",
    latitude: null,
    longitude: null,
    contactPhone: "+7 999 000-00-00",
    contactMethod: "В сообщениях",
    targetAudience: "Частные лица и бизнес",
    supplierName: "МойСклад",
    supplierUrl: "https://b2b.moysklad.ru/public/token/catalog?categoryId=category&productId=product",
    supplierProductId: "product",
    supplierCategoryId: "category"
  }
];

describe("Avito exporters", () => {
  it("creates one XML Ad per variant", () => {
    const xml = buildAvitoXml(rows);
    expect(xml.match(/<Ad>/g)).toHaveLength(2);
    expect(xml).toContain("<Id>product-variant-black-m</Id>");
    expect(xml).toContain("<Color>Grey</Color>");
    expect(xml).toContain("<ColorName>Grey</ColorName>");
    expect(xml).toContain("<Apparel>Кофты и футболки</Apparel>");
    expect(xml).toContain("<GoodsSubType>Футболка</GoodsSubType>");
    expect(xml).not.toContain("<ClothingType>");
    expect(xml).toContain("<Condition>Новое с биркой</Condition>");
    expect(xml).toContain("<Address>Россия, Москва, Тверская улица, 1</Address>");
    expect(xml).toContain("<Size>50 (L)</Size>");
    expect(xml).toContain("<MultiItem>Да</MultiItem>");
    expect(xml).toContain("<MultiName>Nike Stussy</MultiName>");
    expect(xml).toContain("<VideoFileURL>https://example.com/grey-l.mov</VideoFileURL>");
    expect(xml).not.toContain("����");
    expect(xml).not.toContain("Рњ");
  });

  it("uses category-specific XML fields from Avito clothing templates", () => {
    const xml = buildAvitoXml([
      {
        ...rows[0],
        externalId: "bomber-row",
        goodsType: "Верхняя одежда",
        clothingItem: "Бомберы",
        productSubtype: "Бомбер",
        categorySpecificFields: [{ tag: "ApparelType", value: "Бомбер" }]
      },
      {
        ...rows[0],
        externalId: "shorts-row",
        clothingItem: "Шорты",
        productSubtype: "Шорты",
        categorySpecificFields: [{ tag: "ShortsStyle", value: "Повседневные" }]
      },
      {
        ...rows[0],
        externalId: "jeans-row",
        clothingItem: "Джинсы",
        productSubtype: "Джинсы",
        categorySpecificFields: []
      }
    ]);

    expect(xml).toContain("<ApparelType>Бомбер</ApparelType>");
    expect(xml).toContain("<ShortsStyle>Повседневные</ShortsStyle>");
    expect(xml).toContain("<Apparel>Джинсы</Apparel>");
    expect(xml).not.toContain("<GoodsSubType>Джинсы</GoodsSubType>");
  });

  it("uses template fields for footwear and bags", () => {
    const xml = buildAvitoXml([
      {
        ...rows[0],
        externalId: "shoe-row",
        goodsType: "Мужская обувь",
        clothingItem: "Кроссовки",
        productSubtype: "Кроссовки",
        categorySpecificFields: [{ tag: "ApparelType", value: "Кроссовки" }],
        templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Color", "ColorName", "MaterialsOdezhda", "VideoFileURL", "MultiItem", "MultiName", "ApparelType", "Size", "TargetAudience"],
        size: "42"
      },
      {
        ...rows[0],
        externalId: "bag-row",
        goodsType: "Сумки, рюкзаки и чемоданы",
        clothingItem: "Сумки",
        productSubtype: "Сумки",
        categorySpecificFields: [
          { tag: "ApparelType", value: "Сумки" },
          { tag: "Material", value: "Текстиль" },
          { tag: "Gender", value: "Унисекс" }
        ],
        templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Model", "Color", "ColorName", "VideoFileURL", "MultiItem", "MultiName", "Apparel", "ApparelType", "Material", "Gender", "TargetAudience"],
        size: "Не указан"
      }
    ]);

    expect(xml).toContain("<ApparelType>Кроссовки</ApparelType>");
    expect(xml).toContain("<Size>42</Size>");
    expect(xml).not.toContain("<Apparel>Кроссовки</Apparel>");
    expect(xml).toContain("<Apparel>Сумки</Apparel>");
    expect(xml).toContain("<Material>Текстиль</Material>");
    expect(xml).not.toContain("<Size>Не указан</Size>");
  });

  it("creates one CSV row per variant plus header", () => {
    const csv = buildAvitoCsv(rows);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"Id";"Category"');
    expect(lines[1]).toContain('"Nike Stussy Black M"');
    expect(lines[1]).toContain('"Да";"MI-NIKESTUSSY"');
    expect(lines[0]).toContain('"Apparel"');
    expect(lines[1]).toContain('"Товар приобретен на продажу";"Кофты и футболки"');
  });

  it("creates an Avito clothing XLSX template", async () => {
    const buffer = await buildAvitoXlsx(rows);
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.getWorksheet(avitoClothingSheetName);

    expect(sheet?.getCell("A2").value).toBe("Уникальный идентификатор объявления");
    expect(sheet?.getCell("U2").value).toBe("Тип товара");
    expect(sheet?.getCell("W2").value).toBe("Подвид товара");
    expect(sheet?.getCell("A5").value).toBe("AV-NIKESTUSSY-BLACK-M");
    expect(sheet?.getCell("F5").value).toBe("https://example.com/black-m.jpg");
    expect(sheet?.getCell("S5").value).toBe("Да");
    expect(sheet?.getCell("U5").value).toBe("Кофты и футболки");
    expect(sheet?.getCell("W5").value).toBe("Футболка");
  });

  it("adds supplier columns to Excel export", async () => {
    const buffer = await buildCatalogExcel(rows);
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer;
    await workbook.xlsx.load(arrayBuffer);
    const sheet = workbook.getWorksheet("Catalog");
    const headers = sheet?.getRow(1).values;

    expect(headers).toContain("Поставщик");
    expect(headers).toContain("Ссылка поставщика");
    expect(headers).toContain("МойСклад productId");
    expect(headers).toContain("МойСклад categoryId");
  });
});
