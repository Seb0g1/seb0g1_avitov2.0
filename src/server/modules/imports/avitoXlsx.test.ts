import { describe, expect, it } from "vitest";
import { VariantStatus } from "@prisma/client";
import ExcelJS from "exceljs";
import { parseAvitoXlsx } from "./avitoXlsx";

async function makeWorkbookBuffer() {
  const workbook = new ExcelJS.Workbook();
  const instruction = workbook.addWorksheet("Инструкция");
  instruction.addRow(["Инструкция"]);

  const sheet = workbook.addWorksheet("Мужская одежда-Кофты и футболки");
  sheet.addRow(["Личные вещи - Одежда, обувь, аксессуары - Мужская одежда - Кофты и футболки"]);
  sheet.addRow([
    "Уникальный идентификатор объявления",
    "Способ размещения",
    "Номер объявления на Авито",
    "Номер телефона",
    "Адрес",
    "Ссылки на фото",
    "Способ связи",
    "Название объявления",
    "Описание объявления",
    "Категория",
    "Цена",
    "Вид одежды",
    "Состояние",
    "Вид объявления",
    "Бренд одежды",
    "Цвет",
    "Цвет от производителя",
    "Материал основной части",
    "Соединять это объявление с другими объявлениями",
    "Название мультиобъявления",
    "Тип товара",
    "Размер",
    "Подвид товара",
    "Целевая аудитория",
    "AvitoStatus",
    "Название компании",
    "AvitoDateEnd",
    "Почта"
  ]);
  sheet.addRow(["Обязательный"]);
  sheet.addRow(["Подробнее о параметре"]);
  sheet.addRow([
    "AV-FUTBOLKANIKEXSTUSSY-CHERNYI-L",
    "Package",
    "8193531423",
    "79778274540",
    "Москва",
    "http://avito.ru/autoload/1/items-to-feed/images?imageSlug=/image/a.jpg | https://example.com/b.jpg",
    "В сообщениях",
    "Футболка Nike x Stussy (Черный)",
    "<p>Описание</p>",
    "Одежда, обувь, аксессуары",
    "2199",
    "Мужская одежда",
    "Новое с биркой",
    "Товар приобретен на продажу",
    "Nike",
    "Чёрный",
    "Черный",
    "Хлопок",
    "Да",
    "Футболка nike x stussy",
    "Кофты и футболки",
    "50 (L)",
    "Футболка",
    "Частные лица и бизнес",
    "Активно",
    "Точка Стиля",
    "2026-06-25T17:00:51+03:00",
    "seboggame@gmail.com"
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

describe("Avito XLSX import parser", () => {
  it("parses Avito template rows with photos and active Avito IDs", async () => {
    const result = await parseAvitoXlsx(await makeWorkbookBuffer());

    expect(result.skippedRows).toHaveLength(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      externalId: "AV-FUTBOLKANIKEXSTUSSY-CHERNYI-L",
      avitoItemId: "8193531423",
      title: "Футболка Nike x Stussy (Черный)",
      brand: "Nike",
      color: "Чёрный",
      manufacturerColor: "Чёрный",
      normalizedSize: "50 (L)",
      status: VariantStatus.PUBLISHED,
      address: "Москва",
      contactPhone: "79778274540",
      companyName: "Точка Стиля",
      email: "seboggame@gmail.com"
    });
    expect(result.rows[0].photos).toEqual([
      "http://avito.ru/autoload/1/items-to-feed/images?imageSlug=/image/a.jpg",
      "https://example.com/b.jpg"
    ]);
  });
});
