import type { FeedRow } from "./feedRows";
import { clothingFeedFieldMap } from "./fieldMap";

const columns = [
  "Id",
  "Category",
  "GoodsType",
  clothingFeedFieldMap.adType,
  clothingFeedFieldMap.clothingItem,
  "Title",
  "Description",
  "Price",
  "Condition",
  clothingFeedFieldMap.material,
  clothingFeedFieldMap.multiItem,
  clothingFeedFieldMap.multiItemGroup,
  clothingFeedFieldMap.multiItemName,
  clothingFeedFieldMap.article,
  "Region",
  "Address",
  "ContactPhone",
  "Brand",
  clothingFeedFieldMap.color,
  clothingFeedFieldMap.manufacturerColor,
  clothingFeedFieldMap.size,
  clothingFeedFieldMap.quantity,
  "Images"
] as const;

function escapeCsv(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildAvitoCsv(rows: FeedRow[]) {
  const lines = [columns.map(escapeCsv).join(";")];

  for (const row of rows) {
    lines.push(
      [
        row.externalId,
        row.category,
        row.goodsType,
        row.adType,
        row.clothingItem,
        row.title,
        row.description,
        Math.round(row.price),
        row.condition,
        row.material ?? "",
        row.multiItem ? "Да" : "Нет",
        row.multiItemGroup,
        row.multiItemName,
        row.article,
        row.region,
        row.address,
        row.contactPhone,
        row.brand ?? "",
        row.color,
        row.manufacturerColor,
        row.size,
        row.quantity,
        row.photos.join(",")
      ]
        .map(escapeCsv)
        .join(";")
    );
  }

  return `${lines.join("\n")}\n`;
}
