import type { AvitoCategoryField, ClothingCategoryOption } from "@/lib/avitoOptions";

export type CategoryFormField = AvitoCategoryField & {
  label: string;
};

const categoryFieldLabels: Record<string, string> = {
  ApparelType: "Вид товара",
  Gender: "Пол",
  GoodsSubType: "Тип товара",
  Hood: "Капюшон",
  Material: "Материал",
  Model: "Модель",
  TopType: "Тип верха",
  WomenJeansModel: "Модель джинсов"
};

export function categoryFieldLabel(tag: string) {
  return categoryFieldLabels[tag] ?? tag;
}

export function normalizedCategoryFields(value: unknown): AvitoCategoryField[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }
    const record = item as Record<string, unknown>;
    const tag = String(record.tag ?? "").trim();
    const fieldValue = String(record.value ?? "").trim();
    return tag ? [{ tag, value: fieldValue }] : [];
  });
}

export function categoryFieldsForOption(
  option: ClothingCategoryOption,
  fallbackValue: string,
  currentFields?: unknown
): CategoryFormField[] {
  const current = new Map(normalizedCategoryFields(currentFields).map((field) => [field.tag, field.value]));
  const optionFields =
    option.categorySpecificFields ??
    (option.extraField
      ? [{ tag: option.extraField, value: option.extraValue ?? fallbackValue }]
      : []);

  return optionFields.map((field) => ({
    tag: field.tag,
    value: current.get(field.tag) ?? field.value ?? fallbackValue,
    label: categoryFieldLabel(field.tag)
  }));
}

export function categoryFieldsFromForm(formData: FormData, fields: AvitoCategoryField[]) {
  return fields.map((field) => ({
    tag: field.tag,
    value: String(formData.get(`categoryField:${field.tag}`) ?? field.value).trim()
  }));
}

export function categoryOptionDescription(option: ClothingCategoryOption) {
  const fields = option.categorySpecificFields?.map((field) => categoryFieldLabel(field.tag)).join(", ");
  return [
    "Личные вещи",
    "Одежда, обувь, аксессуары",
    option.goodsType,
    fields ? `поля: ${fields}` : null
  ]
    .filter(Boolean)
    .join(" / ");
}
