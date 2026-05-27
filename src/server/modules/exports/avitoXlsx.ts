import ExcelJS from "exceljs";
import { env } from "@/server/config/env";
import type { FeedRow } from "./feedRows";

export const avitoClothingSheetName = "Мужская одежда-Кофты и футболки";

const instructionTitle =
  "Личные вещи - Одежда, обувь, аксессуары - Мужская одежда - Кофты и футболки";

const headers = [
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
  "AvitoDateEnd",
  "AvitoStatus",
  "Почта",
  "Название компании"
] as const;

const requiredRow = [
  "Обязательный",
  "Необязательный",
  "Необязательный",
  "Необязательный",
  "Обязательный",
  "Обязательный",
  "Необязательный",
  "Обязательный",
  "Обязательный",
  "Обязательный",
  "Обязательный",
  "Обязательный",
  "Обязательный",
  "Обязательный",
  "Обязательный",
  "Может быть обязательным\r\nПодробнее",
  "Может быть обязательным\r\nПодробнее",
  "Необязательный",
  "Необязательный",
  "Необязательный",
  "Обязательный",
  "Обязательный",
  "Обязательный",
  "Необязательный",
  null,
  null,
  null,
  null
] as const;

const hintRow = [
  "Подробнее о параметре",
  "Одно значение из выпадающего списка в ячейке",
  "Подробнее о параметре",
  "Подробнее о параметре",
  "Подробнее о параметре",
  "Подробнее о параметре",
  "Одно значение из выпадающего списка в ячейке",
  "Подробнее о параметре",
  "Подробнее о параметре",
  "Одно значение из выпадающего списка в ячейке",
  "Целое число",
  "Одно значение из выпадающего списка в ячейке",
  "Одно значение из выпадающего списка в ячейке",
  "Одно значение из выпадающего списка в ячейке",
  "Одно значение из листа Спр-Мужская одежда-Кофты и футб",
  "Одно значение из выпадающего списка в ячейке",
  "Подробнее о параметре",
  "Одно или несколько значений из выпадающего списка в ячейке",
  "Одно значение из выпадающего списка в ячейке",
  "Подробнее о параметре",
  "Одно значение из выпадающего списка в ячейке",
  "Одно значение из выпадающего списка в ячейке",
  "Одно значение из выпадающего списка в ячейке",
  "Одно значение из выпадающего списка в ячейке",
  null,
  null,
  null,
  null
] as const;

function normalizeTemplateColor(color: string) {
  return color.trim().toLowerCase() === "черный" ? "Чёрный" : color;
}

function avitoAddress(row: FeedRow) {
  return row.address || row.city || row.region;
}

function avitoRow(row: FeedRow) {
  const color = normalizeTemplateColor(row.color);
  const manufacturerColor = normalizeTemplateColor(row.manufacturerColor);

  return [
    row.article,
    env.AVITO_FEED_PLACEMENT_TYPE,
    row.avitoItemId ?? "",
    "",
    avitoAddress(row),
    row.photos.join(" | "),
    env.AVITO_FEED_CONTACT_METHOD,
    row.multiItemName || row.title,
    row.description,
    row.category,
    Math.round(row.price),
    row.goodsType,
    row.condition,
    row.adType,
    row.brand ?? "",
    color,
    manufacturerColor,
    row.material ?? "",
    row.multiItem ? "Да" : "Нет",
    row.multiItemName,
    row.clothingItem,
    row.size,
    row.productSubtype,
    env.AVITO_FEED_TARGET_AUDIENCE,
    "",
    "",
    env.STORE_EMAIL,
    env.STORE_COMPANY_NAME
  ];
}

export async function buildAvitoXlsx(rows: FeedRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Avito Catalog Uploader";
  workbook.created = new Date();

  const instruction = workbook.addWorksheet("Инструкция");
  instruction.getCell("A1").value = "Инструкция";

  const sheet = workbook.addWorksheet(avitoClothingSheetName);
  sheet.addRow([instructionTitle]);
  sheet.addRow([...headers]);
  sheet.addRow([...requiredRow]);
  sheet.addRow([...hintRow]);

  for (const row of rows) {
    sheet.addRow(avitoRow(row));
  }

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(2).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(2).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" }
  };
  sheet.getRow(3).font = { italic: true };
  sheet.getRow(4).font = { italic: true, color: { argb: "FF475569" } };
  sheet.views = [{ state: "frozen", ySplit: 4 }];

  const widths = [34, 18, 22, 18, 24, 72, 18, 32, 72, 28, 12, 18, 20, 28, 18, 16, 22, 24, 24, 28, 20, 14, 18, 24, 16, 16, 28, 22];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.getColumn(6).alignment = { wrapText: true, vertical: "top" };
  sheet.getColumn(9).alignment = { wrapText: true, vertical: "top" };

  workbook.addWorksheet("Спр-Мужская одежда-Кофты и футб");

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
