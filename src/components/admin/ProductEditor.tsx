"use client";

import { DragEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { VariantStatus } from "@prisma/client";
import { Copy, ExternalLink, Film, Save, Sparkles, Trash2, Upload } from "lucide-react";
import {
  clothingMaterialOptions,
  clothingCategoryOptions,
  clothingColorOptions,
  defaultAdType,
  defaultClothingCategory,
  defaultClothingCondition,
  defaultClothingItem,
  formatClothingMaterials,
  maxClothingMaterials,
  normalizeClothingMaterials,
  type ClothingCategoryOption
} from "@/lib/avitoOptions";
import type { ProductDto, VariantDto } from "@/types/catalog";
import { StatusBadge, variantStatusLabels } from "./StatusBadge";

const statuses: VariantStatus[] = [
  "DRAFT",
  "READY",
  "UPLOADED",
  "ERROR",
  "MODERATION",
  "PUBLISHED",
  "REMOVED"
];

async function jsonRequest(url: string, method: string, body: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const payload = (await response.json()) as { message?: string };
    throw new Error(payload.message ?? "Запрос не выполнен.");
  }
  return response.json();
}

function variantBody(formData: FormData) {
  return {
    title: formData.get("title"),
    color: formData.get("color"),
    size: formData.get("size"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
    description: formData.get("description"),
    supplierUrl: formData.get("supplierUrl"),
    supplierName: formData.get("supplierName"),
    status: formData.get("status")
  };
}

export function ProductEditor({
  product,
  clothingCategories = clothingCategoryOptions,
  brandOptions = []
}: {
  product: ProductDto;
  clothingCategories?: readonly ClothingCategoryOption[];
  brandOptions?: string[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const attributes = product.avitoAttributes ?? {};
  const [selectedMaterials, setSelectedMaterials] = useState(() =>
    normalizeClothingMaterials(attributes.materials, attributes.material)
  );
  const adType = String(attributes.adType ?? defaultAdType);
  const condition = String(attributes.condition ?? defaultClothingCondition);
  const clothingCategory = String(attributes.clothingCategory ?? defaultClothingCategory);
  const selectedClothingCategory =
    clothingCategories.find((option) => option.key === clothingCategory) ??
    clothingCategories[0] ??
    clothingCategoryOptions[0];
  const clothingItem = String(
    attributes.productSubtype ?? attributes.clothingItem ?? selectedClothingCategory.productSubtype ?? defaultClothingItem
  );
  const [editingClothingCategory, setEditingClothingCategory] = useState(selectedClothingCategory.key);
  const [editingClothingItem, setEditingClothingItem] = useState(clothingItem);
  const multiItemName = String(attributes.multiItemName ?? product.title);

  function toggleProductMaterial(material: string) {
    if (selectedMaterials.includes(material)) {
      if (selectedMaterials.length === 1) {
        return;
      }
      setSelectedMaterials((current) => current.filter((value) => value !== material));
      return;
    }

    if (selectedMaterials.length >= maxClothingMaterials) {
      setMessage(`Можно выбрать не больше ${maxClothingMaterials} материалов.`);
      return;
    }

    setSelectedMaterials((current) => [...current, material]);
  }

  async function updateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextClothingCategory =
      clothingCategories.find((option) => option.key === formData.get("clothingCategory")) ??
      selectedClothingCategory;
    try {
      await jsonRequest(`/api/products/${product.id}`, "PATCH", {
        title: formData.get("title"),
        brand: formData.get("brand"),
        baseCategory: formData.get("baseCategory"),
        baseDescription: formData.get("baseDescription"),
        supplierUrl: formData.get("supplierUrl"),
        supplierName: formData.get("supplierName"),
        avitoAttributes: {
          material: formatClothingMaterials(selectedMaterials),
          materials: selectedMaterials,
          adType: formData.get("adType"),
          condition: formData.get("condition"),
          clothingCategory: formData.get("clothingCategory"),
          goodsType: nextClothingCategory.goodsType,
          apparel: nextClothingCategory.apparel,
          productSubtype: formData.get("clothingItem") || nextClothingCategory.productSubtype,
          categoryExtraField: nextClothingCategory.extraField,
          categoryExtraValue: nextClothingCategory.extraValue,
          clothingItem: formData.get("clothingItem") || nextClothingCategory.productSubtype,
          multiItemName: formData.get("multiItemName")
        }
      });
      setMessage("Товар обновлен.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка обновления товара.");
    }
  }

  async function createVariant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      await jsonRequest(`/api/products/${product.id}/variants`, "POST", variantBody(formData));
      form.reset();
      setMessage("Вариант добавлен.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка создания варианта.");
    }
  }

  async function updateVariant(event: FormEvent<HTMLFormElement>, variantId: string) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      await jsonRequest(`/api/variants/${variantId}`, "PATCH", variantBody(formData));
      setMessage("Вариант сохранен.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка сохранения варианта.");
    }
  }

  async function duplicateVariant(variantId: string) {
    const response = await fetch(`/api/variants/${variantId}/duplicate`, { method: "POST" });
    setMessage(response.ok ? "Вариант продублирован." : "Не удалось продублировать вариант.");
    router.refresh();
  }

  async function removeVariant(variantId: string) {
    const response = await fetch(`/api/variants/${variantId}`, { method: "DELETE" });
    setMessage(response.ok ? "Вариант удален." : "Не удалось удалить вариант.");
    router.refresh();
  }

  async function regenerateDescriptions() {
    const response = await fetch(`/api/products/${product.id}/regenerate-descriptions`, { method: "POST" });
    setMessage(response.ok ? "Описания сгенерированы заново." : "Не удалось сгенерировать описания.");
    router.refresh();
  }

  async function uploadPhotos(variantId: string, files: FileList | File[]) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("photos", file));
    const response = await fetch(`/api/variants/${variantId}/photos`, {
      method: "POST",
      body: formData
    });
    setMessage(response.ok ? "Фото загружены." : "Не удалось загрузить фото.");
    router.refresh();
  }

  async function uploadVideos(variantId: string, files: FileList | File[]) {
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("videos", file));
    const response = await fetch(`/api/variants/${variantId}/videos`, {
      method: "POST",
      body: formData
    });
    setMessage(response.ok ? "Видео загружено." : "Не удалось загрузить видео.");
    router.refresh();
  }

  async function removePhoto(photoId: string) {
    const response = await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    setMessage(response.ok ? "Фото удалено." : "Не удалось удалить фото.");
    router.refresh();
  }

  async function removeVideo(videoId: string) {
    const response = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    setMessage(response.ok ? "Видео удалено." : "Не удалось удалить видео.");
    router.refresh();
  }

  return (
    <div className="split">
      <section className="editor-section">
        <form className="grid" onSubmit={updateProduct}>
          <div>
            <p className="eyebrow">Товар Avito</p>
            <h2>Карточка товара</h2>
          </div>
          <label>
            Название
            <input className="field" name="title" defaultValue={product.title} required />
          </label>
          <label>
            Бренд
            <input
              className="field"
              name="brand"
              list="avito-brand-options"
              defaultValue={product.brand ?? ""}
            />
            <datalist id="avito-brand-options">
              {brandOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </label>
          <label>
            Категория Avito
            <input className="field" name="baseCategory" defaultValue={product.baseCategory} required />
          </label>
          <label>
            Категория одежды
            <select
              className="select"
              name="clothingCategory"
              value={editingClothingCategory}
              onChange={(event) => {
                const next =
                  clothingCategories.find((option) => option.key === event.target.value) ??
                  clothingCategoryOptions.find((option) => option.key === event.target.value) ??
                  clothingCategories[0] ??
                  clothingCategoryOptions[0];
                setEditingClothingCategory(next.key);
                setEditingClothingItem(next.productSubtype);
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
          <label>
            Вид объявления
            <input className="field" name="adType" defaultValue={adType} required />
          </label>
          <label>
            Состояние
            <input className="field" name="condition" defaultValue={condition} required />
          </label>
          <label>
            Подвид товара
            <input
              className="field"
              name="clothingItem"
              value={editingClothingItem}
              onChange={(event) => setEditingClothingItem(event.target.value)}
              required
            />
          </label>
          <label>
            Название мультиобъявления
            <input className="field" name="multiItemName" defaultValue={multiItemName} required />
          </label>
          <div className="span-full">
            <div className="field-caption">Материал основной части</div>
            <div className="material-picker">
              {clothingMaterialOptions.map((material) => (
                <label className="material-check" key={material}>
                  <input
                    type="checkbox"
                    name="materials"
                    value={material}
                    checked={selectedMaterials.includes(material)}
                    onChange={() => toggleProductMaterial(material)}
                  />
                  <span>{material}</span>
                </label>
              ))}
            </div>
          </div>
          <label>
            Название поставщика
            <input className="field" name="supplierName" defaultValue={product.supplier?.name ?? ""} placeholder="Telegram / МойСклад / сайт" />
          </label>
          <label>
            Ссылка поставщика
            <input className="field" name="supplierUrl" defaultValue={product.supplier?.url ?? ""} placeholder="https://t.me/channel/123 или @username" />
          </label>
          <label>
            Описание
            <textarea className="textarea" name="baseDescription" defaultValue={product.baseDescription ?? ""} />
          </label>
          {product.supplier ? (
            <div className="supplier-summary span-full">
              <div>
                <strong>{product.supplier.name ?? "Поставщик"}</strong>
                {product.supplier.productId ? <span>productId: {product.supplier.productId}</span> : null}
                {product.supplier.categoryId ? <span>categoryId: {product.supplier.categoryId}</span> : null}
              </div>
              <a className="button" href={product.supplier.url ?? "#"} target="_blank" rel="noreferrer">
                <ExternalLink size={18} aria-hidden />
                Открыть поставщика
              </a>
            </div>
          ) : null}
          <div className="toolbar span-full">
            <button className="button primary" type="submit">
              <Save size={18} aria-hidden />
              Сохранить
            </button>
            <button className="button" type="button" onClick={regenerateDescriptions}>
              <Sparkles size={18} aria-hidden />
              Сгенерировать описания заново
            </button>
          </div>
          {message ? <div className="muted">{message}</div> : null}
        </form>
      </section>

      <section className="editor-section">
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">Варианты объявления</p>
            <h2>Цвета, размеры и фото</h2>
          </div>
          <StatusBadge status={product.variants.some((variant) => variant.status === "ERROR") ? "ERROR" : "READY"} />
        </div>

        <form className="form-grid three" onSubmit={createVariant}>
          <label>
            Название
            <input className="field" name="title" placeholder={`${product.title} Чёрный 48 (M)`} required />
          </label>
          <label>
            Цвет
            <select className="select" name="color" defaultValue="Чёрный" required>
              {clothingColorOptions.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
          </label>
          <label>
            Размер
            <input className="field" name="size" placeholder="48 (M)" required />
          </label>
          <label>
            Цена
            <input className="field" name="price" type="number" min="0" step="0.01" required />
          </label>
          <label>
            Количество
            <input className="field" name="quantity" type="number" min="0" defaultValue="1" required />
          </label>
          <label>
            Статус
            <select className="select" name="status" defaultValue="DRAFT">
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {variantStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="span-full">
            Описание
            <textarea className="textarea" name="description" />
          </label>
          <label className="span-full">
            Ссылка поставщика для этого варианта
            <input className="field" name="supplierUrl" placeholder="Оставьте пустым, чтобы наследовать от товара" />
          </label>
          <button className="button primary span-full" type="submit">
            <Save size={18} aria-hidden />
            Добавить вариант
          </button>
        </form>

        <div className="variant-list" style={{ marginTop: 18 }}>
          {product.variants.map((variant) => (
            <VariantEditor
              key={variant.id}
              variant={variant}
              onSubmit={updateVariant}
              onDuplicate={duplicateVariant}
              onRemove={removeVariant}
              onUpload={uploadPhotos}
              onUploadVideo={uploadVideos}
              onRemovePhoto={removePhoto}
              onRemoveVideo={removeVideo}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function VariantEditor({
  variant,
  onSubmit,
  onDuplicate,
  onRemove,
  onUpload,
  onUploadVideo,
  onRemovePhoto,
  onRemoveVideo
}: {
  variant: VariantDto;
  onSubmit: (event: FormEvent<HTMLFormElement>, variantId: string) => void;
  onDuplicate: (variantId: string) => void;
  onRemove: (variantId: string) => void;
  onUpload: (variantId: string, files: FileList | File[]) => void;
  onUploadVideo: (variantId: string, files: FileList | File[]) => void;
  onRemovePhoto: (photoId: string) => void;
  onRemoveVideo: (videoId: string) => void;
}) {
  function drop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) {
      onUpload(variant.id, event.dataTransfer.files);
    }
  }

  function dropVideo(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) {
      onUploadVideo(variant.id, event.dataTransfer.files);
    }
  }

  return (
    <div className="variant-row">
      <form className="form-grid three" onSubmit={(event) => onSubmit(event, variant.id)}>
        <label>
          Название
          <input className="field" name="title" defaultValue={variant.title} required />
        </label>
        <label>
          Цвет
          <select className="select" name="color" defaultValue={variant.color} required>
            {!clothingColorOptions.includes(variant.color as (typeof clothingColorOptions)[number]) ? (
              <option value={variant.color}>{variant.color}</option>
            ) : null}
            {clothingColorOptions.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </label>
        <label>
          Размер
          <input className="field" name="size" defaultValue={variant.size} required />
        </label>
        <label>
          Цена
          <input className="field" name="price" type="number" min="0" step="0.01" defaultValue={variant.price} />
        </label>
        <label>
          Количество
          <input className="field" name="quantity" type="number" min="0" defaultValue={variant.quantity} />
        </label>
        <label>
          Статус
          <select className="select" name="status" defaultValue={variant.status}>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {variantStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label className="span-full">
          Описание
          <textarea className="textarea" name="description" defaultValue={variant.description ?? ""} />
        </label>
        <label>
          Название поставщика
          <input className="field" name="supplierName" defaultValue={variant.supplier?.name ?? ""} />
        </label>
        <label className="span-full">
          Ссылка поставщика для этого варианта
          <input
            className="field"
            name="supplierUrl"
            defaultValue={variant.supplier?.url ?? ""}
            placeholder={variant.effectiveSupplier ? "Наследуется от товара" : "https://t.me/channel/123 или @username"}
          />
        </label>
        <div className="span-full supplier-summary">
          <div>
            <strong>
              {variant.effectiveSupplier
                ? variant.supplier
                  ? "Поставщик варианта"
                  : "Наследуется от товара"
                : "Поставщик не привязан"}
            </strong>
            {variant.effectiveSupplier ? (
              <>
                {variant.effectiveSupplier.name ? <span>{variant.effectiveSupplier.name}</span> : null}
                {variant.effectiveSupplier.productId ? <span>productId: {variant.effectiveSupplier.productId}</span> : null}
                {variant.effectiveSupplier.categoryId ? <span>categoryId: {variant.effectiveSupplier.categoryId}</span> : null}
              </>
            ) : null}
          </div>
          {variant.effectiveSupplier?.url ? (
            <a className="button" href={variant.effectiveSupplier.url} target="_blank" rel="noreferrer">
              <ExternalLink size={18} aria-hidden />
              Заказать у поставщика
            </a>
          ) : null}
        </div>
        <div className="span-full toolbar">
          <StatusBadge status={variant.status} />
          <button className="button primary" type="submit" title="Сохранить вариант">
            <Save size={18} aria-hidden />
            Сохранить
          </button>
          <button className="button" type="button" onClick={() => onDuplicate(variant.id)} title="Дублировать вариант">
            <Copy size={18} aria-hidden />
            Дублировать
          </button>
          <button className="button danger" type="button" onClick={() => onRemove(variant.id)} title="Удалить вариант">
            <Trash2 size={18} aria-hidden />
            Удалить
          </button>
          {variant.avitoItemId ? <span className="muted">Avito ID: {variant.avitoItemId}</span> : null}
        </div>
      </form>

      <label
        className="dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <Upload size={22} aria-hidden />
        Перетащите фото или выберите файлы
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            if (event.currentTarget.files) {
              onUpload(variant.id, event.currentTarget.files);
            }
          }}
        />
      </label>

      <div className="photo-strip">
        {variant.photos.map((photo) => (
          <span key={photo.id} style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="photo-thumb" src={photo.publicUrl} alt="" />
            <button
              className="icon-button"
              type="button"
              onClick={() => onRemovePhoto(photo.id)}
              title="Удалить фото"
              style={{ position: "absolute", right: -6, top: -6, width: 28, height: 28, minHeight: 28 }}
            >
              <Trash2 size={14} aria-hidden />
            </button>
          </span>
        ))}
      </div>
      {variant.videos.length > 0 ? (
        <div className="photo-strip">
          {variant.videos.map((video) => (
            <span key={video.id} style={{ position: "relative" }}>
              <video
                className="photo-thumb"
                src={video.publicUrl}
                controls
                muted
                preload="metadata"
              />
              <button
                className="icon-button"
                type="button"
                onClick={() => onRemoveVideo(video.id)}
                title="Удалить видео"
                style={{ position: "absolute", right: -6, top: -6, width: 28, height: 28, minHeight: 28 }}
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <label
        className="dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={dropVideo}
      >
        <Film size={22} aria-hidden />
        Перетащите MOV/MP4 видео или выберите файл
        <input
          type="file"
          multiple
          accept="video/quicktime,video/mp4,.mov,.mp4"
          hidden
          onChange={(event) => {
            if (event.currentTarget.files) {
              onUploadVideo(variant.id, event.currentTarget.files);
            }
          }}
        />
      </label>
      {variant.lastError ? <div className="status ERROR">{variant.lastError}</div> : null}
    </div>
  );
}
