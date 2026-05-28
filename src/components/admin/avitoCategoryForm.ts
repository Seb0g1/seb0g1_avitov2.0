import type { AvitoCategoryField, ClothingCategoryOption } from "@/lib/avitoOptions";

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
) {
  const current = new Map(normalizedCategoryFields(currentFields).map((field) => [field.tag, field.value]));
  const optionFields =
    option.categorySpecificFields ??
    (option.extraField
      ? [{ tag: option.extraField, value: option.extraValue ?? fallbackValue }]
      : []);

  return optionFields.map((field) => ({
    tag: field.tag,
    value: current.get(field.tag) ?? field.value ?? fallbackValue
  }));
}

export function categoryFieldsFromForm(formData: FormData, fields: AvitoCategoryField[]) {
  return fields.map((field) => ({
    tag: field.tag,
    value: String(formData.get(`categoryField:${field.tag}`) ?? field.value).trim()
  }));
}

export function categoryOptionDescription(option: ClothingCategoryOption) {
  const fields = option.categorySpecificFields?.map((field) => field.tag).join(", ");
  return [
    "Личные вещи",
    "Одежда, обувь, аксессуары",
    option.goodsType,
    fields ? `поля: ${fields}` : null
  ]
    .filter(Boolean)
    .join(" / ");
}
