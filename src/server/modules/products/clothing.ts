import {
  avitoSizeOptions,
  avitoSizeValues,
  avitoMaterialOptions,
  avitoMaterialValues,
  clothingMaterialOptions,
  clothingSizeOptions,
  clothingSizeValues,
  defaultAdType,
  defaultClothingCondition,
  defaultClothingItem,
  defaultMaterialsForCategory,
  defaultSizeForCategory,
  footwearMaterialOptions,
  footwearSizeOptions,
  footwearSizeValues,
  formatClothingMaterials,
  formatMaterialsForCategory,
  isFootwearCategory,
  materialOptionsForCategory,
  normalizeClothingMaterials,
  normalizeMaterialsForCategory,
  sizeOptionsForCategory
} from "@/lib/avitoOptions";

export {
  avitoSizeOptions,
  avitoSizeValues,
  avitoMaterialOptions,
  avitoMaterialValues,
  clothingMaterialOptions,
  clothingSizeOptions,
  clothingSizeValues,
  defaultAdType,
  defaultClothingCondition,
  defaultClothingItem,
  defaultMaterialsForCategory,
  defaultSizeForCategory,
  footwearMaterialOptions,
  footwearSizeOptions,
  footwearSizeValues,
  formatClothingMaterials,
  formatMaterialsForCategory,
  isFootwearCategory,
  materialOptionsForCategory,
  normalizeClothingMaterials,
  normalizeMaterialsForCategory,
  sizeOptionsForCategory
};

const colorTranslit: Record<string, string> = {
  белый: "BELYY",
  черный: "CHERNYI",
  чёрный: "CHERNYI",
  серый: "SERYI",
  зеленый: "ZELENYI",
  зелёный: "ZELENYI",
  красный: "KRASNYY",
  синий: "SINIY",
  бежевый: "BEZHEVYY",
  коричневый: "KORICHNEVYY",
  розовый: "ROZOVYY",
  фиолетовый: "FIOLETOVYY",
  оранжевый: "ORANZHEVYY",
  голубой: "GOLOBOY",
  желтый: "ZHELTYY",
  жёлтый: "ZHELTYY"
};

const cyrillicMap: Record<string, string> = {
  а: "A",
  б: "B",
  в: "V",
  г: "G",
  д: "D",
  е: "E",
  ё: "E",
  ж: "ZH",
  з: "Z",
  и: "I",
  й: "Y",
  к: "K",
  л: "L",
  м: "M",
  н: "N",
  о: "O",
  п: "P",
  р: "R",
  с: "S",
  т: "T",
  у: "U",
  ф: "F",
  х: "H",
  ц: "TS",
  ч: "CH",
  ш: "SH",
  щ: "SCH",
  ы: "Y",
  э: "E",
  ю: "YU",
  я: "YA"
};

function transliterate(value: string) {
  return value
    .toLowerCase()
    .split("")
    .map((char) => cyrillicMap[char] ?? char.toUpperCase())
    .join("");
}

export function compactCode(value: string) {
  return transliterate(value).replace(/[^A-Z0-9]+/g, "");
}

export function sizeCode(size: string) {
  const known = avitoSizeOptions.find((option) => option.value === size);
  if (known) {
    return known.code;
  }

  const match = size.match(/\(([^)]+)\)/);
  return compactCode(match?.[1] ?? size);
}

export function colorCode(color: string) {
  const normalized = color.trim().toLowerCase();
  return colorTranslit[normalized] ?? compactCode(color);
}

export function buildVariantArticle(title: string, color: string, size: string) {
  return ["AV", compactCode(title), colorCode(color), sizeCode(size)]
    .filter(Boolean)
    .join("-");
}

export function buildMultiItemGroup(title: string, seed: string) {
  return ["MI", compactCode(title).slice(0, 48), compactCode(seed).slice(0, 12)]
    .filter(Boolean)
    .join("-");
}

export function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildVariantDescription(input: {
  title: string;
  material?: string | null;
  materials?: string[] | null;
  color: string;
  size: string;
  article: string;
  colors: string[];
  sizes: string[];
}) {
  const material = formatClothingMaterials(input.materials, input.material);
  const colors = uniqueValues(input.colors).join(", ") || input.color;
  const sizes = uniqueValues(input.sizes).join(", ") || input.size;

  return `${input.title} — PREMIUM качество

🔥 Магазин «Точка Стиля» представляет базовую вещь в лучшем исполнении. Идеальная посадка, высокая плотность и стиль в каждой детали.

💎 О ТОВАРЕ:

Материал: ${material}
Детали: Усиленный плечевой шов и износостойкий пошив горловины.
Нанесение: Качественная DTF печать (стойкая к стиркам).
Комплектация: Фирменные бирки.

🎨 ЦВЕТА И РАЗМЕРЫ:

Цвета: ${colors}

📐 Размеры: ${sizes} 👉 Поможем подобрать точный размер именно под вас!

🤝 ПОЧЕМУ ВЫБИРАЮТ НАС?

Репутация: Работаем в сфере одежды несколько лет.
Доверие: Множество положительных отзывов и довольных клиентов.
Честность: Гарантия 1000% — вы получаете именно тот товар, который видите на фото.
Ассортимент: Заходите в профиль, чтобы увидеть другие модели!

📢 Не упустите шанс обновить гардероб! ❤️ Добавьте в Избранное, чтобы не потерять. 📩 Пишите в сообщения — ответим на все вопросы и поможем оформить заказ!

Параметры объявления

Цвет: ${input.color}
Размер: ${input.size}
Артикул: ${input.article}`;
}
