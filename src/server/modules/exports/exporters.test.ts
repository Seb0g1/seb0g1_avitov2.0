import { describe, expect, it } from "vitest";
import { VariantStatus } from "@prisma/client";
import ExcelJS from "exceljs";
import type { FeedRow } from "./feedRows";
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
    condition: "Новое",
    material: "Хлопок",
    materials: ["Хлопок"],
    adType: "Товар приобретён на продажу",
    clothingItem: "Футболка",
    multiItemName: "Nike Stussy",
    manufacturerColor: "Black",
    multiItem: true,
    multiItemGroup: "MI-NIKESTUSSY",
    article: "AV-NIKESTUSSY-BLACK-M",
    color: "Black",
    size: "M",
    price: 12990,
    quantity: 3,
    status: VariantStatus.READY,
    updatedAt: new Date("2026-05-27T10:00:00Z"),
    avitoItemId: null,
    photos: ["https://example.com/black-m.jpg"],
    region: "Москва",
    address: "Москва",
    contactPhone: "+7 999 000-00-00",
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
    condition: "Новое",
    material: "Хлопок",
    materials: ["Хлопок"],
    adType: "Товар приобретён на продажу",
    clothingItem: "Футболка",
    multiItemName: "Nike Stussy",
    manufacturerColor: "Grey",
    multiItem: true,
    multiItemGroup: "MI-NIKESTUSSY",
    article: "AV-NIKESTUSSY-GREY-L",
    color: "Grey",
    size: "L",
    price: 11990,
    quantity: 2,
    status: VariantStatus.READY,
    updatedAt: new Date("2026-05-27T10:00:00Z"),
    avitoItemId: null,
    photos: ["https://example.com/grey-l.jpg"],
    region: "Москва",
    address: "Москва",
    contactPhone: "+7 999 000-00-00",
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
    expect(xml).toContain("<ManufacturerColor>Grey</ManufacturerColor>");
    expect(xml).toContain("<MultiItem>Да</MultiItem>");
    expect(xml).toContain("<MultiItemGroup>MI-NIKESTUSSY</MultiItemGroup>");
    expect(xml).toContain("<MultiItemName>Nike Stussy</MultiItemName>");
  });

  it("creates one CSV row per variant plus header", () => {
    const csv = buildAvitoCsv(rows);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('"Id";"Category"');
    expect(lines[1]).toContain('"Nike Stussy Black M"');
    expect(lines[1]).toContain('"Да";"MI-NIKESTUSSY"');
    expect(lines[1]).toContain('"Товар приобретён на продажу";"Футболка"');
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
