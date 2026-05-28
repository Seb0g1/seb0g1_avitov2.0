import { create } from "xmlbuilder2";
import type { FeedRow } from "./feedRows";
import { clothingFeedFieldMap } from "./fieldMap";
import { sanitizeAvitoDescription } from "./description";

function hasTemplateField(row: FeedRow, field: string) {
  return row.templateFields.length === 0 || row.templateFields.includes(field);
}

export function buildAvitoXml(rows: FeedRow[]) {
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("Ads", {
    formatVersion: "3",
    target: "Avito.ru"
  });

  for (const row of rows) {
    const ad = root.ele("Ad");
    ad.ele("Id").txt(row.externalId);
    ad.ele("ContactPhone").txt(row.contactPhone);
    ad.ele("Address").txt(row.address);
    if (row.latitude && row.longitude) {
      ad.ele("Latitude").txt(row.latitude);
      ad.ele("Longitude").txt(row.longitude);
    }

    const images = ad.ele("Images");
    for (const photo of row.photos.slice(0, 10)) {
      images.ele("Image", { url: photo });
    }
    if (row.videoUrl) {
      ad.ele("VideoFileURL").txt(row.videoUrl);
    }

    ad.ele("ContactMethod").txt(row.contactMethod);
    ad.ele("Title").txt(row.title);
    ad.ele("Description").dat(sanitizeAvitoDescription(row.description));
    ad.ele("Category").txt(row.category);
    ad.ele("Price").txt(String(Math.round(row.price)));
    ad.ele("GoodsType").txt(row.goodsType);
    ad.ele("Condition").txt(row.condition);
    ad.ele(clothingFeedFieldMap.adType).txt(row.adType);
    if (row.brand) {
      ad.ele("Brand").txt(row.brand);
    }
    ad.ele(clothingFeedFieldMap.color).txt(row.color);
    if (hasTemplateField(row, clothingFeedFieldMap.manufacturerColor)) {
      ad.ele(clothingFeedFieldMap.manufacturerColor).txt(row.manufacturerColor);
    }
    if (row.material && hasTemplateField(row, clothingFeedFieldMap.material)) {
      ad.ele(clothingFeedFieldMap.material).txt(row.material);
    }
    if (hasTemplateField(row, clothingFeedFieldMap.multiItem)) {
      ad.ele(clothingFeedFieldMap.multiItem).txt(row.multiItem ? "Да" : "Нет");
    }
    if (hasTemplateField(row, clothingFeedFieldMap.multiItemName)) {
      ad.ele(clothingFeedFieldMap.multiItemName).txt(row.multiItemName);
    }
    if (hasTemplateField(row, clothingFeedFieldMap.clothingItem)) {
      ad.ele(clothingFeedFieldMap.clothingItem).txt(row.clothingItem);
    }
    for (const field of row.categorySpecificFields) {
      if (hasTemplateField(row, field.tag)) {
        ad.ele(field.tag).txt(field.value);
      }
    }
    if (hasTemplateField(row, clothingFeedFieldMap.size)) {
      ad.ele(clothingFeedFieldMap.size).txt(row.size);
    }
    ad.ele("TargetAudience").txt(row.targetAudience);
    if (hasTemplateField(row, clothingFeedFieldMap.quantity)) {
      ad.ele(clothingFeedFieldMap.quantity).txt(String(row.quantity));
    }
  }

  return root.end({ prettyPrint: true });
}
