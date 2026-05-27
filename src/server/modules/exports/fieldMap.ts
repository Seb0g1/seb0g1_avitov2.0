import { env } from "@/server/config/env";

export type FeedFieldMap = {
  category: string;
  condition: string;
  goodsType: string;
  material: string;
  adType: string;
  clothingItem: string;
  multiItemName: string;
  manufacturerColor: string;
  multiItem: string;
  multiItemGroup: string;
  article: string;
  color: string;
  size: string;
  quantity: string;
};

export const clothingFeedFieldMap: FeedFieldMap = {
  category: env.DEFAULT_AVITO_CATEGORY,
  condition: env.DEFAULT_CONDITION,
  goodsType: "Мужская одежда",
  material: "Material",
  adType: "AdType",
  clothingItem: "ClothingType",
  multiItemName: "MultiItemName",
  manufacturerColor: "ManufacturerColor",
  multiItem: "MultiItem",
  multiItemGroup: "MultiItemGroup",
  article: "Article",
  color: "Color",
  size: "Size",
  quantity: "Quantity"
};
