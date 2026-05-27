import { env } from "@/server/config/env";

export type FeedFieldMap = {
  category: string;
  material: string;
  adType: string;
  clothingItem: string;
  productSubtype: string;
  multiItemName: string;
  manufacturerColor: string;
  multiItem: string;
  multiItemGroup: string;
  article: string;
  color: string;
  size: string;
  quantity: string;
};

export type ClothingFeedDefaults = {
  goodsType: string;
  adType: string;
  condition: string;
  clothingItem: string;
  productSubtype: string;
};

export const clothingFeedFieldMap: FeedFieldMap = {
  category: env.DEFAULT_AVITO_CATEGORY,
  material: "Material",
  adType: "AdType",
  clothingItem: "Apparel",
  productSubtype: env.AVITO_FEED_PRODUCT_SUBTYPE_FIELD,
  multiItemName: "MultiItemName",
  manufacturerColor: "ManufacturerColor",
  multiItem: "MultiItem",
  multiItemGroup: "MultiItemGroup",
  article: "Article",
  color: "Color",
  size: "Size",
  quantity: "Quantity"
};

export const clothingFeedDefaults: ClothingFeedDefaults = {
  goodsType: env.AVITO_FEED_GOODS_TYPE,
  adType: env.AVITO_FEED_AD_TYPE,
  condition: env.AVITO_FEED_CONDITION,
  clothingItem: env.AVITO_FEED_APPAREL,
  productSubtype: env.AVITO_FEED_PRODUCT_SUBTYPE
};
