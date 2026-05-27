"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Eye,
  ImagePlus,
  Link as LinkIcon,
  ListChecks,
  Plus,
  Save,
  Shirt,
  Sparkles,
  Trash2,
  Upload
} from "lucide-react";
import {
  clothingMaterialOptions,
  clothingCategoryOptions,
  clothingColorOptions,
  clothingSizeOptions,
  defaultAdType,
  defaultClothingCategory,
  defaultClothingCondition,
  defaultClothingItem,
  defaultClothingMaterials,
  formatClothingMaterials,
  maxClothingMaterials,
  type ClothingCategoryOption
} from "@/lib/avitoOptions";
import type { ProductDto } from "@/types/catalog";

type LocalPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type ColorGroupDraft = {
  id: string;
  color: string;
  manufacturerColor: string;
  sizes: string[];
  photos: LocalPhoto[];
};

const defaultColors = ["Белый", "Чёрный", "Серый", "Бежевый"];
const conditionOptions = ["Новое с биркой", "Отличное", "Хорошее", "Удовлетворительное"];
const adTypeOptions = ["Товар приобретен на продажу", "Товар от производителя"];

function emptyColorGroup(color = ""): ColorGroupDraft {
  return {
    id: crypto.randomUUID(),
    color,
    manufacturerColor: color,
    sizes: ["48 (M)"],
    photos: []
  };
}

function uniqueFilled(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function formatPrice(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return "Цена не указана";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(number);
}

function colorStyle(color: string) {
  const lower = color.trim().toLowerCase();
  const map: Record<string, string> = {
    белый: "#f8fafc",
    черный: "#111827",
    чёрный: "#111827",
    серый: "#9ca3af",
    бежевый: "#d6c2a8",
    красный: "#dc2626",
    синий: "#2563eb",
    зеленый: "#16a34a",
    зелёный: "#16a34a"
  };
  return { background: map[lower] ?? "#e5e7eb" };
}

function previewDescription(input: {
  title: string;
  materials: string[];
  colors: string[];
  sizes: string[];
  color: string;
  size: string;
}) {
  const title = input.title || "Название товара";
  const material = formatClothingMaterials(input.materials);
  const colors = input.colors.join(", ") || input.color || "Цвет не указан";
  const sizes = input.sizes.join(", ") || input.size || "Размеры не указаны";

  return `${title} — PREMIUM качество

🔥 Магазин «Точка Стиля» представляет базовую вещь в лучшем исполнении. Идеальная посадка, высокая плотность и стиль в каждой детали.

💎 О ТОВАРЕ:

Материал: ${material}
Детали: Усиленный плечевой шов и износостойкий пошив горловины.
Нанесение: Качественная DTF печать (стойкая к стиркам).
Комплектация: Фирменные бирки.

🎨 ЦВЕТА И РАЗМЕРЫ:

Цвета: ${colors}

📐 Размеры: ${sizes} 👉 Поможем подобрать точный размер именно под вас!

Параметры объявления

Цвет: ${input.color || "Не указан"}
Размер: ${input.size || "Не указан"}`;
}

export function ProductCreationWizard({
  initialCategories,
  clothingCategories = clothingCategoryOptions,
  brandOptions = []
}: {
  initialCategories: string[];
  clothingCategories?: readonly ClothingCategoryOption[];
  brandOptions?: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [baseCategory, setBaseCategory] = useState(initialCategories[0] ?? "Одежда, обувь, аксессуары");
  const [materials, setMaterials] = useState<string[]>([...defaultClothingMaterials]);
  const [adType, setAdType] = useState(defaultAdType);
  const [condition, setCondition] = useState(defaultClothingCondition);
  const [clothingCategory, setClothingCategory] = useState(defaultClothingCategory);
  const [clothingItem, setClothingItem] = useState(defaultClothingItem);
  const [multiItemName, setMultiItemName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [supplierUrl, setSupplierUrl] = useState("");
  const [colorGroups, setColorGroups] = useState<ColorGroupDraft[]>([emptyColorGroup("Белый")]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeGroup = colorGroups.find((group) => group.id === activeGroupId) ?? colorGroups[0];
  const allColors = uniqueFilled(colorGroups.map((group) => group.color));
  const allSizes = uniqueFilled(colorGroups.flatMap((group) => group.sizes));
  const variantCount = colorGroups.reduce((count, group) => count + group.sizes.length, 0);
  const firstPhoto = activeGroup?.photos[0]?.previewUrl;
  const effectiveMultiItemName = multiItemName.trim() || title.trim() || "Название мультиобъявления";
  const selectedClothingCategory =
    clothingCategories.find((option) => option.key === clothingCategory) ??
    clothingCategories[0] ??
    clothingCategoryOptions[0];

  const preview = useMemo(
    () => ({
      title: title.trim() || "Новый товар Avito",
      price: formatPrice(price),
      description: previewDescription({
        title: title.trim(),
        materials,
        colors: allColors,
        sizes: allSizes,
        color: activeGroup?.color ?? "",
        size: activeGroup?.sizes[0] ?? ""
      })
    }),
    [activeGroup?.color, activeGroup?.sizes, allColors, allSizes, materials, price, title]
  );

  function updateColorGroup(id: string, patch: Partial<ColorGroupDraft>) {
    setColorGroups((current) =>
      current.map((group) => (group.id === id ? { ...group, ...patch } : group))
    );
  }

  function addColorGroup(color = "") {
    const nextColor = color || defaultColors.find((value) => !allColors.includes(value)) || "";
    const next = emptyColorGroup(nextColor);
    setColorGroups((current) => [...current, next]);
    setActiveGroupId(next.id);
  }

  function duplicateColorGroup(id: string) {
    const source = colorGroups.find((group) => group.id === id);
    if (!source) {
      return;
    }

    const next = {
      ...source,
      id: crypto.randomUUID(),
      color: defaultColors.find((value) => !allColors.includes(value)) || source.color,
      manufacturerColor: defaultColors.find((value) => !allColors.includes(value)) || source.color,
      photos: source.photos.map((photo) => ({
        ...photo,
        id: crypto.randomUUID()
      }))
    };
    setColorGroups((current) => [...current, next]);
    setActiveGroupId(next.id);
  }

  function removeColorGroup(id: string) {
    setColorGroups((current) =>
      current.length === 1 ? current : current.filter((group) => group.id !== id)
    );
  }

  function toggleSize(groupId: string, size: string) {
    const group = colorGroups.find((current) => current.id === groupId);
    if (!group) {
      return;
    }

    updateColorGroup(groupId, {
      sizes: group.sizes.includes(size)
        ? group.sizes.filter((value) => value !== size)
        : [...group.sizes, size]
    });
  }

  function toggleMaterial(material: string) {
    if (materials.includes(material)) {
      if (materials.length === 1) {
        return;
      }
      setMaterials((current) => current.filter((value) => value !== material));
      return;
    }

    if (materials.length >= maxClothingMaterials) {
      setMessage(`Можно выбрать не больше ${maxClothingMaterials} материалов.`);
      return;
    }

    setMaterials((current) => [...current, material]);
  }

  function addPhotos(groupId: string, files: FileList | File[]) {
    const photos = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    const group = colorGroups.find((current) => current.id === groupId);
    if (!group || photos.length === 0) {
      return;
    }
    updateColorGroup(groupId, { photos: [...group.photos, ...photos] });
  }

  function removePhoto(groupId: string, photoId: string) {
    const group = colorGroups.find((current) => current.id === groupId);
    if (!group) {
      return;
    }
    updateColorGroup(groupId, { photos: group.photos.filter((photo) => photo.id !== photoId) });
  }

  async function uploadColorPhotos(product: ProductDto) {
    for (const group of colorGroups) {
      if (group.photos.length === 0) {
        continue;
      }

      const variants = product.variants.filter((variant) => variant.color === group.color);
      for (const variant of variants) {
        const formData = new FormData();
        group.photos.forEach((photo) => formData.append("photos", photo.file));
        const response = await fetch(`/api/variants/${variant.id}/photos`, {
          method: "POST",
          body: formData
        });
        if (!response.ok) {
          throw new Error(`Не удалось загрузить фото для цвета ${group.color}.`);
        }
      }
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const normalizedGroups = colorGroups
      .map((group) => ({
        color: group.color.trim(),
        manufacturerColor: group.manufacturerColor.trim() || group.color.trim(),
        sizes: group.sizes
      }))
      .filter((group) => group.color && group.sizes.length > 0);

    if (normalizedGroups.length === 0) {
      setMessage("Добавьте хотя бы один цвет и выберите размеры.");
      setIsSaving(false);
      return;
    }

    const response = await fetch("/api/products/with-variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        brand,
        baseCategory,
        material: formatClothingMaterials(materials),
        materials,
        adType,
        condition,
        clothingItem,
        avitoAttributes: {
          clothingCategory,
          goodsType: selectedClothingCategory.goodsType,
          apparel: selectedClothingCategory.apparel,
          productSubtype: clothingItem,
          categoryExtraField: selectedClothingCategory.extraField,
          categoryExtraValue: selectedClothingCategory.extraValue
        },
        multiItemName: effectiveMultiItemName,
        price,
        quantity,
        supplierUrl,
        supplierName: supplierUrl.trim() ? "МойСклад" : null,
        colorGroups: normalizedGroups
      })
    });

    const body = (await response.json().catch(() => null)) as {
      product?: ProductDto;
      message?: string;
    } | null;

    if (!response.ok || !body?.product?.id) {
      setMessage(body?.message ?? "Не удалось создать товар.");
      setIsSaving(false);
      return;
    }

    try {
      await uploadColorPhotos(body.product);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Товар создан, но фото не загрузились.");
    }

    router.push(`/products/${body.product.id}`);
    router.refresh();
  }

  return (
    <form className="creation-shell avito-form" onSubmit={submit}>
      <header className="creation-header avito-creation-header">
        <div>
          <p className="eyebrow">Мультиобъявление Avito</p>
          <h1>Создать объявление</h1>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          {message ? <span className="status ERROR">{message}</span> : null}
          <span className="status DRAFT">Черновик после создания</span>
          <button className="button primary" type="submit" disabled={isSaving}>
            <Save size={18} aria-hidden />
            {isSaving ? "Создаем..." : "Создать мультиобъявление"}
          </button>
        </div>
      </header>

      <div className="creation-layout wide-preview">
        <div className="creation-main">
          <section className="wizard-section avito-step">
            <div className="section-title">
              <span className="step-badge">1</span>
              <h2>Карточка объявления</h2>
            </div>
            <div className="form-grid">
              <label>
                Название объявления
                <input
                  className="field strong-field"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (!multiItemName.trim()) {
                      setMultiItemName(event.target.value);
                    }
                  }}
                  placeholder="Футболка Acne Studios"
                  required
                />
              </label>
              <label>
                Бренд
                <input
                  className="field"
                  list="avito-brand-options"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="Acne Studios"
                />
                <datalist id="avito-brand-options">
                  {brandOptions.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </label>
              <label className="span-full">
                Категория Avito
                <select
                  className="select"
                  value={baseCategory}
                  onChange={(event) => setBaseCategory(event.target.value)}
                  required
                >
                  {initialCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="span-full">
                Категория одежды
                <select
                  className="select"
                  value={clothingCategory}
                  onChange={(event) => {
                    const next =
                      clothingCategories.find((option) => option.key === event.target.value) ??
                      clothingCategoryOptions.find((option) => option.key === event.target.value) ??
                      clothingCategories[0] ??
                      clothingCategoryOptions[0];
                    setClothingCategory(next.key);
                    setClothingItem(next.productSubtype);
                  }}
                  required
                >
                  {clothingCategories.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.goodsType} / {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="span-full">
                Ссылка поставщика МойСклад
                <div className="field-with-icon">
                  <LinkIcon size={18} aria-hidden />
                  <input
                    value={supplierUrl}
                    onChange={(event) => setSupplierUrl(event.target.value)}
                    placeholder="https://b2b.moysklad.ru/public/.../catalog?categoryId=...&productId=..."
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="wizard-section avito-step">
            <div className="section-title">
              <span className="step-badge">2</span>
              <h2>Мультиобъявление</h2>
            </div>
            <div className="form-grid">
              <label className="span-full">
                Название мультиобъявления
                <input
                  className="field strong-field"
                  value={multiItemName}
                  onChange={(event) => setMultiItemName(event.target.value)}
                  placeholder="Покупатель его не увидит"
                />
              </label>
              <label>
                Вид объявления
                <select className="select" value={adType} onChange={(event) => setAdType(event.target.value)}>
                  {adTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Состояние
                <select className="select" value={condition} onChange={(event) => setCondition(event.target.value)}>
                  {conditionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="wizard-section avito-step">
            <div className="section-title">
              <span className="step-badge">3</span>
              <h2>Внешний вид</h2>
            </div>

            <div className="color-group-list">
              {colorGroups.map((group, index) => (
                <article
                  className={`color-group ${activeGroup?.id === group.id ? "active" : ""}`}
                  key={group.id}
                  onFocus={() => setActiveGroupId(group.id)}
                  onMouseEnter={() => setActiveGroupId(group.id)}
                >
                  <div className="color-group-head avito-color-head">
                    <div className="variant-row-index">{index + 1}</div>
                    <label>
                      Цвет
                      <select
                        className="select"
                        value={group.color}
                        onChange={(event) =>
                          updateColorGroup(group.id, {
                            color: event.target.value,
                            manufacturerColor:
                              group.manufacturerColor === group.color ? event.target.value : group.manufacturerColor
                          })
                        }
                        required
                      >
                        {!clothingColorOptions.includes(group.color as (typeof clothingColorOptions)[number]) && group.color ? (
                          <option value={group.color}>{group.color}</option>
                        ) : null}
                        {clothingColorOptions.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Цвет от производителя
                      <input
                        className="field"
                        value={group.manufacturerColor}
                        onChange={(event) => updateColorGroup(group.id, { manufacturerColor: event.target.value })}
                        placeholder="Чёрный"
                      />
                    </label>
                    <div className="color-actions">
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => duplicateColorGroup(group.id)}
                        title="Дублировать цвет"
                      >
                        <Copy size={16} aria-hidden />
                      </button>
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => removeColorGroup(group.id)}
                        title="Удалить цвет"
                        disabled={colorGroups.length === 1}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="field-caption">Размеры в наличии</div>
                    <div className="size-picker" aria-label={`Размеры для ${group.color || "цвета"}`}>
                      {clothingSizeOptions.map((size) => (
                        <label className="size-chip" key={size.value}>
                          <input
                            type="checkbox"
                            checked={group.sizes.includes(size.value)}
                            onChange={() => toggleSize(group.id, size.value)}
                          />
                          <span>{size.value}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label
                    className="dropzone compact-dropzone"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      addPhotos(group.id, event.dataTransfer.files);
                    }}
                  >
                    <Upload size={20} aria-hidden />
                    Фото только для цвета “{group.color || "новый цвет"}”
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={(event) => {
                        if (event.currentTarget.files) {
                          addPhotos(group.id, event.currentTarget.files);
                        }
                      }}
                    />
                  </label>

                  <div className="photo-strip">
                    {group.photos.map((photo) => (
                      <span className="local-photo" key={photo.id}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img className="photo-thumb" src={photo.previewUrl} alt="" />
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => removePhoto(group.id, photo.id)}
                          title="Убрать фото"
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </span>
                    ))}
                    {group.photos.length === 0 ? (
                      <span className="empty-photo-note">
                        <ImagePlus size={16} aria-hidden />
                        Фото можно добавить сейчас или после создания
                      </span>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <div className="toolbar">
              <button className="button" type="button" onClick={() => addColorGroup()}>
                <Plus size={18} aria-hidden />
                Добавить цвет
              </button>
              {defaultColors.map((color) => (
                <button
                  className="button"
                  type="button"
                  key={color}
                  onClick={() => addColorGroup(color)}
                  disabled={allColors.includes(color)}
                >
                  <span className="swatch" style={colorStyle(color)} />
                  {color}
                </button>
              ))}
            </div>
          </section>

          <section className="wizard-section avito-step">
            <div className="section-title">
              <span className="step-badge">4</span>
              <h2>Характеристики</h2>
            </div>
            <div className="form-grid">
              <label>
                Подвид товара
                <input
                  className="field"
                  value={clothingItem}
                  onChange={(event) => setClothingItem(event.target.value)}
                  placeholder="Футболка"
                  required
                />
              </label>
              <div className="span-full">
                <div className="field-caption">Материал основной части</div>
                <div className="material-picker">
                  {clothingMaterialOptions.map((material) => {
                    const checked = materials.includes(material);
                    return (
                      <button
                        className={`material-chip ${checked ? "selected" : ""}`}
                        type="button"
                        key={material}
                        onClick={() => toggleMaterial(material)}
                        aria-pressed={checked}
                      >
                        {material}
                      </button>
                    );
                  })}
                </div>
                <div className="muted small-note">
                  Выберите до {maxClothingMaterials}. Эти значения попадут в описание и фид Avito.
                </div>
              </div>
            </div>
          </section>

          <section className="wizard-section avito-step">
            <div className="section-title">
              <span className="step-badge">5</span>
              <h2>Подробности и цена</h2>
            </div>
            <div className="form-grid">
              <label>
                Цена
                <input
                  className="field"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="2199"
                  required
                />
              </label>
              <label>
                Количество на выбранный размер
                <input
                  className="field"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  type="number"
                  min="1"
                  required
                />
              </label>
              <div className="span-full">
                <div className="field-caption">Описание объявления</div>
                <div className="description-toolbar" aria-hidden>
                  <span className="tool-pill active">B</span>
                  <span className="tool-pill">•</span>
                  <span className="tool-pill">1.</span>
                  <span className="tool-pill">↶</span>
                  <span className="tool-pill">↷</span>
                </div>
                <pre className="description-preview description-editor-preview">{preview.description}</pre>
              </div>
            </div>
          </section>
        </div>

        <aside className="preview-panel avito-preview-panel">
          <div className="section-title">
            <Eye size={18} aria-hidden />
            <h2>Предпросмотр Avito</h2>
          </div>

          <div className="avito-preview-card">
            <div className="avito-hero">
              {firstPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={firstPhoto} alt="" />
              ) : (
                <span>Фото товара</span>
              )}
            </div>
            <div className="avito-thumbs">
              {(activeGroup?.photos ?? []).slice(0, 8).map((photo) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={photo.id} src={photo.previewUrl} alt="" />
              ))}
            </div>
            <div className="preview-body">
              <div className="preview-title">{preview.title}</div>
              <div className="preview-price">{preview.price}</div>

              <div className="avito-option-block">
                <strong>Мультиобъявление</strong>
                <span className="muted">{effectiveMultiItemName}</span>
              </div>

              <div className="avito-option-block">
                <strong>Цвет: {activeGroup?.color || "не указан"}</strong>
                <div className="color-tile-row">
                  {colorGroups.map((group) => (
                    <button
                      className={`color-tile ${activeGroup?.id === group.id ? "selected" : ""}`}
                      type="button"
                      key={group.id}
                      onClick={() => setActiveGroupId(group.id)}
                      title={group.color || "Цвет"}
                    >
                      {group.photos[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={group.photos[0].previewUrl} alt="" />
                      ) : (
                        <span className="swatch large" style={colorStyle(group.color)} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="avito-option-block">
                <strong>Размер</strong>
                <div className="size-preview-row">
                  {clothingSizeOptions.map((size) => {
                    const available = activeGroup?.sizes.includes(size.value);
                    return (
                      <span className={`size-preview ${available ? "available" : "disabled"}`} key={size.value}>
                        {size.value}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="preview-checklist">
                <div>
                  <Shirt size={14} aria-hidden />
                  <strong>{formatClothingMaterials(materials)}</strong>
                </div>
                <div>
                  <ListChecks size={14} aria-hidden />
                  <strong>{variantCount}</strong>
                  <span> вариантов</span>
                </div>
                <div>
                  <Sparkles size={14} aria-hidden />
                  <strong>Мульти</strong>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
