export const clothingSizeOptions = [
  { value: "40 (XXS)", label: "40 (XXS)", code: "XXS" },
  { value: "42 (XS)", label: "42 (XS)", code: "XS" },
  { value: "44 (XS/S)", label: "44 (XS/S)", code: "XS/S" },
  { value: "46 (S)", label: "46 (S)", code: "S" },
  { value: "48 (M)", label: "48 (M)", code: "M" },
  { value: "50 (L)", label: "50 (L)", code: "L" },
  { value: "52 (L/XL)", label: "52 (L/XL)", code: "L/XL" },
  { value: "54 (XL)", label: "54 (XL)", code: "XL" },
  { value: "56 (XXL)", label: "56 (XXL)", code: "XXL" },
  { value: "58 (XXL)", label: "58 (XXL)", code: "XXL" },
  { value: "60 (3XL)", label: "60 (3XL)", code: "3XL" },
  { value: "62 (4XL)", label: "62 (4XL)", code: "4XL" },
  { value: "64 (5XL)", label: "64 (5XL)", code: "5XL" },
  { value: "66 (6XL)", label: "66 (6XL)", code: "6XL" },
  { value: "68 (7XL)", label: "68 (7XL)", code: "7XL" },
  { value: "70 (7XL)", label: "70 (7XL)", code: "7XL" },
  { value: "72 (8XL)", label: "72 (8XL)", code: "8XL" },
  { value: "74 (8XL)", label: "74 (8XL)", code: "8XL" },
  { value: "76 (9XL)", label: "76 (9XL)", code: "9XL" },
  { value: "78 (10XL)", label: "78 (10XL)", code: "10XL" },
  { value: "80 (10XL)", label: "80 (10XL)", code: "10XL" },
  { value: "82+ (10XL+)", label: "82+ (10XL+)", code: "10XL+" },
  { value: "One size", label: "One size", code: "ONESIZE" },
  { value: "Без размера", label: "Без размера", code: "NOSIZE" }
] as const;

export const clothingSizeValues = clothingSizeOptions.map((size) => size.value);

export const clothingMaterialOptions = [
  "Хлопок",
  "Полиэстер",
  "Эластан",
  "Вискоза",
  "Шерсть",
  "Лен",
  "Нейлон",
  "Акрил",
  "Деним",
  "Кожа",
  "Искусственная кожа",
  "Замша",
  "Смешанный состав"
] as const;

export const defaultClothingMaterials = ["Хлопок"];
export const maxClothingMaterials = 5;
export const defaultAdType = "Товар приобретен на продажу";
export const defaultClothingCondition = "Новое с биркой";
export const defaultClothingItem = "Футболка";

export const clothingColorOptions = [
  "Красный",
  "Белый",
  "Розовый",
  "Бордовый",
  "Синий",
  "Жёлтый",
  "Голубой",
  "Фиолетовый",
  "Оранжевый",
  "Разноцветный",
  "Серый",
  "Бежевый",
  "Чёрный",
  "Коричневый",
  "Зелёный",
  "Серебряный",
  "Золотой"
] as const;

const colorAliases: Record<string, (typeof clothingColorOptions)[number]> = {
  желтый: "Жёлтый",
  зелёный: "Зелёный",
  зеленый: "Зелёный",
  черный: "Чёрный",
  чёрный: "Чёрный"
};

export function normalizeAvitoColor(input?: unknown) {
  const value = String(input ?? "").replace(/\u00a0/g, " ").trim();
  if (!value) {
    return "";
  }

  const exact = clothingColorOptions.find((option) => option.toLowerCase() === value.toLowerCase());
  if (exact) {
    return exact;
  }

  return colorAliases[value.toLowerCase()] ?? value;
}

export function avitoColorSwatch(color: string) {
  const lower = color.trim().toLowerCase();
  const map: Record<string, string> = {
    белый: "#f8fafc",
    чёрный: "#111827",
    черный: "#111827",
    серый: "#9ca3af",
    бежевый: "#d6c2a8",
    красный: "#dc2626",
    розовый: "#f472b6",
    бордовый: "#7f1d1d",
    синий: "#2563eb",
    жёлтый: "#facc15",
    желтый: "#facc15",
    голубой: "#38bdf8",
    фиолетовый: "#7c3aed",
    оранжевый: "#f97316",
    разноцветный: "linear-gradient(135deg, #ef4444, #facc15, #22c55e, #3b82f6)",
    коричневый: "#92400e",
    зелёный: "#16a34a",
    зеленый: "#16a34a",
    серебряный: "#cbd5e1",
    золотой: "#f59e0b"
  };
  return map[lower] ?? "#e5e7eb";
}

export type ClothingCategoryKey = "shirts" | "shorts" | "tracksuits" | "jeans" | "bombers";

export type AvitoCategoryField = {
  tag: string;
  value: string;
};

export type ClothingCategoryOption = {
  key: ClothingCategoryKey | (string & {});
  label: string;
  goodsType: string;
  apparel: string;
  productSubtype: string;
  extraField?: string;
  extraValue?: string;
  categorySpecificFields?: readonly AvitoCategoryField[];
  templateFields?: readonly string[];
};

export const clothingCategoryOptions: readonly ClothingCategoryOption[] = [
  {
    key: "shirts",
    label: "Кофты и футболки",
    goodsType: "Мужская одежда",
    apparel: "Кофты и футболки",
    productSubtype: "Футболка",
    extraField: "GoodsSubType",
    extraValue: "Футболка"
  },
  {
    key: "shorts",
    label: "Шорты",
    goodsType: "Мужская одежда",
    apparel: "Шорты",
    productSubtype: "Шорты",
    extraField: "ShortsStyle",
    extraValue: "Повседневные"
  },
  {
    key: "tracksuits",
    label: "Спортивные костюмы",
    goodsType: "Мужская одежда",
    apparel: "Спортивные костюмы",
    productSubtype: "Спортивный костюм"
  },
  {
    key: "jeans",
    label: "Джинсы",
    goodsType: "Мужская одежда",
    apparel: "Джинсы",
    productSubtype: "Джинсы"
  },
  {
    key: "bombers",
    label: "Бомберы",
    goodsType: "Верхняя одежда",
    apparel: "Бомберы",
    productSubtype: "Бомбер",
    extraField: "ApparelType",
    extraValue: "Бомбер"
  },
  {
    key: "women-sweatshirts",
    label: "Толстовки и свитшоты",
    goodsType: "Женская одежда",
    apparel: "Толстовки и свитшоты",
    productSubtype: "Толстовка",
    extraField: "GoodsSubType",
    extraValue: "Толстовка",
    categorySpecificFields: [{ tag: "GoodsSubType", value: "Толстовка" }],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Color", "ColorName", "MaterialsOdezhda", "VideoFileURL", "MultiItem", "MultiName", "Apparel", "Size", "GoodsSubType", "TargetAudience"]
  },
  {
    key: "women-tops",
    label: "Топы и футболки",
    goodsType: "Женская одежда",
    apparel: "Топы и футболки",
    productSubtype: "Футболка",
    extraField: "TopType",
    extraValue: "Футболка",
    categorySpecificFields: [{ tag: "TopType", value: "Футболка" }],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Color", "ColorName", "MaterialsOdezhda", "VideoFileURL", "MultiItem", "MultiName", "Apparel", "Size", "TopType", "TargetAudience"]
  },
  {
    key: "women-jeans",
    label: "Джинсы",
    goodsType: "Женская одежда",
    apparel: "Джинсы",
    productSubtype: "Джинсы",
    extraField: "WomenJeansModel",
    extraValue: "Прямые",
    categorySpecificFields: [{ tag: "WomenJeansModel", value: "Прямые" }],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Color", "ColorName", "MaterialsOdezhda", "VideoFileURL", "MultiItem", "MultiName", "Apparel", "Size", "WomenJeansModel", "TargetAudience"]
  },
  {
    key: "women-light-jackets",
    label: "Лёгкие куртки и ветровки",
    goodsType: "Верхняя одежда",
    apparel: "Лёгкие куртки и ветровки",
    productSubtype: "Лёгкая куртка",
    extraField: "ApparelType",
    extraValue: "Лёгкая куртка",
    categorySpecificFields: [
      { tag: "ApparelType", value: "Лёгкая куртка" },
      { tag: "Hood", value: "Нет" }
    ],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Color", "ColorName", "MaterialsOdezhda", "VideoFileURL", "MultiItem", "MultiName", "Apparel", "ApparelType", "Size", "TargetAudience", "Hood"]
  },
  {
    key: "men-sneakers",
    label: "Кроссовки",
    goodsType: "Мужская обувь",
    apparel: "Кроссовки",
    productSubtype: "Кроссовки",
    extraField: "ApparelType",
    extraValue: "Кроссовки",
    categorySpecificFields: [{ tag: "ApparelType", value: "Кроссовки" }],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Color", "ColorName", "MaterialsOdezhda", "VideoFileURL", "MultiItem", "MultiName", "ApparelType", "Size", "TargetAudience"]
  },
  {
    key: "men-sport-shoes",
    label: "Спортивная обувь",
    goodsType: "Мужская обувь",
    apparel: "Спортивная обувь",
    productSubtype: "Спортивная обувь",
    extraField: "ApparelType",
    extraValue: "Спортивная обувь",
    categorySpecificFields: [
      { tag: "Model", value: "Спортивная обувь" },
      { tag: "ApparelType", value: "Спортивная обувь" }
    ],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Model", "Color", "MaterialsOdezhda", "VideoFileURL", "ApparelType", "Size", "TargetAudience"]
  },
  {
    key: "men-home-shoes",
    label: "Домашняя обувь",
    goodsType: "Мужская обувь",
    apparel: "Домашняя обувь",
    productSubtype: "Домашняя обувь",
    extraField: "ApparelType",
    extraValue: "Домашняя обувь",
    categorySpecificFields: [
      { tag: "Model", value: "Домашняя обувь" },
      { tag: "ApparelType", value: "Домашняя обувь" }
    ],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Model", "Color", "MaterialsOdezhda", "VideoFileURL", "ApparelType", "Size", "TargetAudience"]
  },
  {
    key: "women-sneakers",
    label: "Кроссовки и кеды",
    goodsType: "Женская обувь",
    apparel: "Кроссовки и кеды",
    productSubtype: "Кроссовки и кеды",
    extraField: "ApparelType",
    extraValue: "Кроссовки и кеды",
    categorySpecificFields: [{ tag: "ApparelType", value: "Кроссовки и кеды" }],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Color", "ColorName", "MaterialsOdezhda", "VideoFileURL", "MultiItem", "MultiName", "ApparelType", "Size", "TargetAudience"]
  },
  {
    key: "bags",
    label: "Сумки",
    goodsType: "Сумки, рюкзаки и чемоданы",
    apparel: "Сумки",
    productSubtype: "Сумки",
    extraField: "ApparelType",
    extraValue: "Сумки",
    categorySpecificFields: [
      { tag: "ApparelType", value: "Сумки" },
      { tag: "Material", value: "Текстиль" },
      { tag: "Gender", value: "Унисекс" }
    ],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Model", "Color", "ColorName", "VideoFileURL", "MultiItem", "MultiName", "Apparel", "ApparelType", "Material", "Gender", "TargetAudience"]
  },
  {
    key: "backpacks",
    label: "Рюкзаки",
    goodsType: "Сумки, рюкзаки и чемоданы",
    apparel: "Рюкзаки",
    productSubtype: "Рюкзаки",
    extraField: "Gender",
    extraValue: "Унисекс",
    categorySpecificFields: [
      { tag: "Model", value: "Рюкзаки" },
      { tag: "Gender", value: "Унисекс" }
    ],
    templateFields: ["GoodsType", "Condition", "AdType", "Brand", "Model", "Color", "ColorName", "VideoFileURL", "MultiItem", "MultiName", "Apparel", "Gender", "TargetAudience"]
  }
] as const;

export const defaultClothingCategory = "shirts";

export function getClothingCategoryOption(input?: unknown) {
  const value = String(input ?? "").trim();
  return (
    clothingCategoryOptions.find((option) => option.key === value || option.label === value) ??
    clothingCategoryOptions[0]
  );
}

const materialAliases: Array<[string, string]> = [
  ["хлоп", "Хлопок"],
  ["полиэстер", "Полиэстер"],
  ["polyester", "Полиэстер"],
  ["эластан", "Эластан"],
  ["elastane", "Эластан"],
  ["вискоз", "Вискоза"],
  ["шерст", "Шерсть"],
  ["wool", "Шерсть"],
  ["лен", "Лен"],
  ["лён", "Лен"],
  ["нейлон", "Нейлон"],
  ["nylon", "Нейлон"],
  ["акрил", "Акрил"],
  ["деним", "Деним"],
  ["джинс", "Деним"],
  ["кожа", "Кожа"],
  ["замша", "Замша"],
  ["смеш", "Смешанный состав"]
];

function uniqueFilled(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeOneMaterial(value: string) {
  const trimmed = value.trim();
  const exact = clothingMaterialOptions.find(
    (option) => option.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) {
    return exact;
  }

  const lower = trimmed.toLowerCase();
  const alias = materialAliases.find(([needle]) => lower.includes(needle));
  return alias?.[1] ?? trimmed;
}

export function normalizeClothingMaterials(input?: unknown, legacyMaterial?: unknown) {
  const fromArray = Array.isArray(input)
    ? input.map((value) => String(value))
    : typeof input === "string"
      ? input.split(",")
      : [];
  const fromLegacy = typeof legacyMaterial === "string" ? legacyMaterial.split(",") : [];
  const normalized = uniqueFilled([...fromArray, ...fromLegacy].map(normalizeOneMaterial)).slice(
    0,
    maxClothingMaterials
  );

  return normalized.length > 0 ? normalized : [...defaultClothingMaterials];
}

export function formatClothingMaterials(materials?: unknown, legacyMaterial?: unknown) {
  return normalizeClothingMaterials(materials, legacyMaterial).join(", ");
}
