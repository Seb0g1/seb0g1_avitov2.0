"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PublicationMode, VariantStatus } from "@prisma/client";
import { CheckSquare, Download, ExternalLink, FileSpreadsheet, Plus, RefreshCw, Rocket, Search } from "lucide-react";
import type { ProductDto, VariantDto } from "@/types/catalog";
import { StatusBadge } from "./StatusBadge";

const statuses: VariantStatus[] = [
  "DRAFT",
  "READY",
  "UPLOADED",
  "ERROR",
  "MODERATION",
  "PUBLISHED",
  "REMOVED"
];

function formatPrice(value: string) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function CatalogClient({ products }: { products: ProductDto[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const variants = useMemo(
    () =>
      products.flatMap((product) =>
        product.variants.map((variant) => ({
          ...variant,
          productTitle: product.title,
          productBrand: product.brand,
          productDescription: product.baseDescription
        }))
      ),
    [products]
  );

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const key of ["search", "color", "size", "status"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) {
        params.set(key, value);
      }
    }
    if (formData.get("withoutSupplier")) {
      params.set("withoutSupplier", "true");
    }
    router.push(`/catalog?${params.toString()}`);
  }

  async function bulkStatus(status: VariantStatus) {
    const variantIds = [...selected];
    if (variantIds.length === 0) {
      setMessage("Выберите варианты.");
      return;
    }
    const response = await fetch("/api/variants/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds, status })
    });
    setMessage(response.ok ? "Статусы обновлены." : "Не удалось обновить статусы.");
    router.refresh();
  }

  async function publish(mode: PublicationMode) {
    const variantIds = [...selected];
    if (variantIds.length === 0) {
      setMessage("Выберите варианты для публикации.");
      return;
    }

    const response = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds, mode })
    });
    setMessage(response.ok ? "Публикация поставлена в очередь." : "Не удалось поставить публикацию в очередь.");
    startTransition(() => router.refresh());
  }

  async function syncStatuses() {
    const response = await fetch("/api/sync/statuses", { method: "POST" });
    setMessage(response.ok ? "Синхронизация поставлена в очередь." : "Не удалось запустить синхронизацию.");
    startTransition(() => router.refresh());
  }

  async function importFromAvito() {
    setMessage("Импортирую объявления из Avito...");
    const response = await fetch("/api/avito/import", { method: "POST" });
    const body = (await response.json().catch(() => null)) as {
      imported?: number;
      received?: number;
      missingDescriptions?: number;
      missingPhotos?: number;
      incompleteAttributes?: number;
      message?: string;
    } | null;

    if (!response.ok) {
      setMessage(body?.message ?? "Не удалось импортировать объявления из Avito.");
      return;
    }

    const notes = [
      body?.missingDescriptions ? `без описания: ${body.missingDescriptions}` : null,
      body?.missingPhotos ? `без фото: ${body.missingPhotos}` : null,
      body?.incompleteAttributes ? `неполный цвет/размер: ${body.incompleteAttributes}` : null
    ].filter(Boolean);
    setMessage(
      `Импортировано: ${body?.imported ?? 0}, получено от Avito: ${body?.received ?? 0}.` +
        (notes.length ? ` Avito API не вернул часть полей (${notes.join(", ")}).` : "")
    );
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid">
      <form className="toolbar" onSubmit={applyFilters}>
        <Link className="button primary" href="/products/new">
          <Plus size={18} aria-hidden />
          Создать товар
        </Link>
        <label style={{ minWidth: 220 }}>
          Поиск
          <input className="field" name="search" defaultValue={searchParams.get("search") ?? ""} />
        </label>
        <label>
          Цвет
          <input className="field" name="color" defaultValue={searchParams.get("color") ?? ""} />
        </label>
        <label>
          Размер
          <input className="field" name="size" defaultValue={searchParams.get("size") ?? ""} />
        </label>
        <label>
          Статус
          <select className="select" name="status" defaultValue={searchParams.get("status") ?? ""}>
            <option value="">Все</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-check">
          <input
            name="withoutSupplier"
            type="checkbox"
            defaultChecked={searchParams.get("withoutSupplier") === "true"}
          />
          Без поставщика
        </label>
        <button className="button" type="submit" title="Применить фильтры">
          <Search size={18} aria-hidden />
          Найти
        </button>
      </form>

      <div className="toolbar">
        {message ? <span className="muted">{message}</span> : null}
        <button className="button" type="button" onClick={() => bulkStatus("READY")}>
          <CheckSquare size={18} aria-hidden />
          Готово к выгрузке
        </button>
        <button className="button primary" type="button" onClick={() => publish("AUTOLOAD_XML")}>
          <Rocket size={18} aria-hidden />
          XML publish
        </button>
        <button className="button" type="button" onClick={() => publish("AUTOLOAD_CSV")}>
          <Download size={18} aria-hidden />
          CSV publish
        </button>
        <button className="button" type="button" onClick={() => publish("ITEMS_API")}>
          <Rocket size={18} aria-hidden />
          Items API
        </button>
        <a className="button" href="/api/exports/catalog.xlsx">
          <FileSpreadsheet size={18} aria-hidden />
          Экспорт в Excel
        </a>
        <a className="button" href="/api/exports/avito.xml">
          <Download size={18} aria-hidden />
          XML
        </a>
        <a className="button" href="/api/exports/avito.csv">
          <Download size={18} aria-hidden />
          CSV
        </a>
        <button className="button" type="button" onClick={syncStatuses} disabled={isPending}>
          <RefreshCw size={18} aria-hidden />
          Синхронизация
        </button>
        <button className="button primary" type="button" onClick={importFromAvito} disabled={isPending}>
          <RefreshCw size={18} aria-hidden />
          Импорт из Avito
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th />
              <th>Товар</th>
              <th>Вариант</th>
              <th>Цена</th>
              <th>Остаток</th>
              <th>Статус</th>
              <th>Фото</th>
              <th>Поставщик</th>
              <th>Avito ID</th>
            </tr>
          </thead>
          <tbody>
            {variants.map((variant: VariantDto & {
              productTitle: string;
              productBrand: string | null;
              productDescription: string | null;
            }) => (
              <tr key={variant.id}>
                <td>
                  <input
                    aria-label={`Выбрать ${variant.title}`}
                    type="checkbox"
                    checked={selected.has(variant.id)}
                    onChange={() => toggle(variant.id)}
                  />
                </td>
                <td>
                  <Link href={`/products/${variant.productId}`}>
                    <strong>{variant.productTitle}</strong>
                  </Link>
                  <div className="muted">{variant.productBrand ?? "Без бренда"}</div>
                  {variant.productDescription ? (
                    <div className="description-clamp">{variant.productDescription}</div>
                  ) : null}
                </td>
                <td>
                  <strong>{variant.title}</strong>
                  <div className="muted">
                    {variant.color} · {variant.size}
                  </div>
                  {variant.description ? (
                    <div className="description-clamp">{variant.description}</div>
                  ) : null}
                </td>
                <td>{formatPrice(variant.price)}</td>
                <td>{variant.quantity}</td>
                <td>
                  <StatusBadge status={variant.status} />
                  {variant.lastError ? <div className="muted">{variant.lastError}</div> : null}
                </td>
                <td>{variant.photos.length}</td>
                <td>
                  {variant.effectiveSupplier?.url ? (
                    <a className="button compact-button" href={variant.effectiveSupplier.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} aria-hidden />
                      Заказать
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{variant.avitoItemId ?? "—"}</td>
              </tr>
            ))}
            {variants.length === 0 ? (
              <tr>
                <td colSpan={9} className="muted">
                  Нет вариантов по текущим фильтрам.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
