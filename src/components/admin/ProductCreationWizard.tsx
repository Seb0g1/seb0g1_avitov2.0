"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, ImagePlus, Link as LinkIcon, Plus, Save, Trash2, Upload } from "lucide-react";
import type { ProductDto } from "@/types/catalog";

type LocalPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

type ColorGroupDraft = {
  id: string;
  color: string;
  sizes: string[];
  photos: LocalPhoto[];
};

const sizeOptions = [
  { value: "46 (S)", code: "S" },
  { value: "48 (M)", code: "M" },
  { value: "50 (L)", code: "L" },
  { value: "54 (XL)", code: "XL" },
  { value: "56 (2XL)", code: "2XL" }
] as const;

const defaultColors = ["Белый", "Черный", "Серый", "Бежевый"];

function emptyColorGroup(color = ""): ColorGroupDraft {
  return {
    id: crypto.randomUUID(),
    color,
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
  material: string;
  colors: string[];
  sizes: string[];
  color: string;
  size: string;
}) {
  const title = input.title || "Название товара";
  const material = input.material || "100% Хлопок (Premium качество)";
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

export function ProductCreationWizard({ initialCategories }: { initialCategories: string[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [baseCategory, setBaseCategory] = useState(initialCategories[0] ?? "Одежда, обувь, аксессуары");
  const [material, setMaterial] = useState("100% Хлопок (Premium качество)");
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

  const preview = useMemo(
    () => ({
      title: title.trim() || "Новый товар Avito",
      price: formatPrice(price),
      description: previewDescription({
        title: title.trim(),
        material: material.trim(),
        colors: allColors,
        sizes: allSizes,
        color: activeGroup?.color ?? "",
        size: activeGroup?.sizes[0] ?? ""
      })
    }),
    [activeGroup?.color, activeGroup?.sizes, allColors, allSizes, material, price, title]
  );

  function updateColorGroup(id: string, patch: Partial<ColorGroupDraft>) {
    setColorGroups((current) =>
      current.map((group) => (group.id === id ? { ...group, ...patch } : group))
    );
  }

  function addColorGroup(color = "") {
    const next = emptyColorGroup(color || defaultColors.find((value) => !allColors.includes(value)) || "");
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
      color: `${source.color} copy`,
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
        material,
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
    <form className="creation-shell" onSubmit={submit}>
      <header className="creation-header">
        <div>
          <p className="eyebrow">Avito multi-listing builder</p>
          <h1>Создать мультиобъявление</h1>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          {message ? <span className="status ERROR">{message}</span> : null}
          <button className="button primary" type="submit" disabled={isSaving}>
            <Save size={18} aria-hidden />
            {isSaving ? "Создаем..." : "Создать товар"}
          </button>
        </div>
      </header>

      <div className="creation-layout wide-preview">
        <div className="creation-main">
          <section className="wizard-section">
            <div className="section-title">
              <span className="step-badge">1</span>
              <h2>Карточка товара</h2>
            </div>
            <div className="form-grid">
              <label>
                Название
                <input
                  className="field strong-field"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Футболка Acne Studios"
                  required
                />
              </label>
              <label>
                Бренд
                <input
                  className="field"
                  value={brand}
                  onChange={(event) => setBrand(event.target.value)}
                  placeholder="Acne Studios"
                />
              </label>
              <label>
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
              <label>
                Материал
                <input
                  className="field"
                  value={material}
                  onChange={(event) => setMaterial(event.target.value)}
                  placeholder="100% Хлопок (Premium качество)"
                  required
                />
              </label>
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
                Количество на размер
                <input
                  className="field"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  type="number"
                  min="1"
                  required
                />
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

          <section className="wizard-section">
            <div className="section-title">
              <span className="step-badge">2</span>
              <h2>Цвета и размеры</h2>
            </div>

            <div className="color-group-list">
              {colorGroups.map((group, index) => (
                <article
                  className={`color-group ${activeGroup?.id === group.id ? "active" : ""}`}
                  key={group.id}
                  onFocus={() => setActiveGroupId(group.id)}
                  onMouseEnter={() => setActiveGroupId(group.id)}
                >
                  <div className="color-group-head">
                    <div className="variant-row-index">{index + 1}</div>
                    <label>
                      Цвет
                      <input
                        className="field"
                        value={group.color}
                        onChange={(event) => updateColorGroup(group.id, { color: event.target.value })}
                        placeholder="Белый"
                        required
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

                  <div className="size-picker" aria-label={`Размеры для ${group.color || "цвета"}`}>
                    {sizeOptions.map((size) => (
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

                  <label
                    className="dropzone compact-dropzone"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      addPhotos(group.id, event.dataTransfer.files);
                    }}
                  >
                    <Upload size={20} aria-hidden />
                    Фото этого цвета
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
                  {sizeOptions.map((size) => {
                    const available = activeGroup?.sizes.includes(size.value);
                    return (
                      <span className={`size-preview ${available ? "available" : "disabled"}`} key={size.value}>
                        {size.value}
                      </span>
                    );
                  })}
                </div>
              </div>

              <pre className="description-preview">{preview.description}</pre>
              <div className="preview-checklist">
                <div>
                  <strong>{colorGroups.length}</strong>
                  <span> цветов</span>
                </div>
                <div>
                  <strong>{variantCount}</strong>
                  <span> вариантов</span>
                </div>
                <div>
                  <strong>DRAFT</strong>
                  <span> после создания</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </form>
  );
}
