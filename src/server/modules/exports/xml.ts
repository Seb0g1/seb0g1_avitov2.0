import { create } from "xmlbuilder2";
import type { FeedRow } from "./feedRows";
import { clothingFeedFieldMap } from "./fieldMap";

export function buildAvitoXml(rows: FeedRow[]) {
  const root = create({ version: "1.0", encoding: "UTF-8" }).ele("Ads", {
    formatVersion: "3",
    target: "Avito.ru"
  });

  for (const row of rows) {
    const ad = root.ele("Ad");
    ad.ele("Id").txt(row.externalId);
    ad.ele("Category").txt(row.category);
    ad.ele("GoodsType").txt(row.goodsType);
    ad.ele(clothingFeedFieldMap.adType).txt(row.adType);
    ad.ele(clothingFeedFieldMap.clothingItem).txt(row.clothingItem);
    ad.ele("Title").txt(row.title);
    ad.ele("Description").dat(row.description);
    ad.ele("Price").txt(String(Math.round(row.price)));
    ad.ele("Condition").txt(row.condition);
    if (row.material) {
      ad.ele(clothingFeedFieldMap.material).txt(row.material);
    }
    ad.ele(clothingFeedFieldMap.multiItem).txt(row.multiItem ? "Да" : "Нет");
    ad.ele(clothingFeedFieldMap.multiItemGroup).txt(row.multiItemGroup);
    ad.ele(clothingFeedFieldMap.multiItemName).txt(row.multiItemName);
    ad.ele(clothingFeedFieldMap.article).txt(row.article);
    ad.ele("Region").txt(row.region);
    ad.ele("Address").txt(row.address);
    ad.ele("ContactPhone").txt(row.contactPhone);
    if (row.brand) {
      ad.ele("Brand").txt(row.brand);
    }
    ad.ele(clothingFeedFieldMap.color).txt(row.color);
    ad.ele(clothingFeedFieldMap.manufacturerColor).txt(row.manufacturerColor);
    ad.ele(clothingFeedFieldMap.size).txt(row.size);
    ad.ele(clothingFeedFieldMap.quantity).txt(String(row.quantity));

    if (row.photos.length > 0) {
      const images = ad.ele("Images");
      for (const photo of row.photos) {
        images.ele("Image", { url: photo });
      }
    }
  }

  return root.end({ prettyPrint: true });
}
