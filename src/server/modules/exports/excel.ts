import ExcelJS from "exceljs";
import type { FeedRow } from "./feedRows";

export async function buildCatalogExcel(rows: FeedRow[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Avito Catalog Uploader";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Catalog");
  sheet.columns = [
    { header: "ID товара", key: "productId", width: 28 },
    { header: "Название", key: "title", width: 32 },
    { header: "Цвет", key: "color", width: 16 },
    { header: "Размер", key: "size", width: 12 },
    { header: "Цена", key: "price", width: 12 },
    { header: "Количество", key: "quantity", width: 14 },
    { header: "Статус публикации", key: "status", width: 18 },
    { header: "Дата последнего обновления", key: "updatedAt", width: 24 },
    { header: "Ссылка на фото", key: "photoUrl", width: 42 },
    { header: "Avito item ID", key: "avitoItemId", width: 22 },
    { header: "Поставщик", key: "supplierName", width: 24 },
    { header: "Ссылка поставщика", key: "supplierUrl", width: 56 },
    { header: "МойСклад productId", key: "supplierProductId", width: 40 },
    { header: "МойСклад categoryId", key: "supplierCategoryId", width: 40 }
  ];

  for (const row of rows) {
    sheet.addRow({
      productId: row.productId,
      title: row.title,
      color: row.color,
      size: row.size,
      price: row.price,
      quantity: row.quantity,
      status: row.status,
      updatedAt: row.updatedAt,
      photoUrl: row.photos[0] ?? "",
      avitoItemId: row.avitoItemId ?? "",
      supplierName: row.supplierName ?? "",
      supplierUrl: row.supplierUrl ?? "",
      supplierProductId: row.supplierProductId ?? "",
      supplierCategoryId: row.supplierCategoryId ?? ""
    });
  }

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" }
  };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: "A1",
    to: "N1"
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
