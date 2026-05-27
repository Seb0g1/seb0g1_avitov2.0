"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { PublicationMode, VariantStatus } from "@prisma/client";
import {
  AlertTriangle,
  CheckSquare,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import type { FeedDiagnosticsDto, ProductDto } from "@/types/catalog";
import {
  buildCatalogProductRows,
  variantIdsForSelectedProducts,
  type CatalogProductRow
} from "./catalogRows";
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

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0
  }).format(value);
}

function priceRange(row: CatalogProductRow) {
  if (row.variants.length === 0) {
    return "—";
  }
  if (row.minPrice === row.maxPrice) {
    return formatPrice(row.minPrice);
  }
  return `${formatPrice(row.minPrice)} – ${formatPrice(row.maxPrice)}`;
}

function compactList(values: string[]) {
  if (values.length === 0) {
    return "—";
  }
  return values.join(", ");
}

export function CatalogClient({
  products,
  feedDiagnostics
}: {
  products: ProductDto[];
  feedDiagnostics: FeedDiagnosticsDto;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [isImportingXlsx, setIsImportingXlsx] = useState(false);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const rows = useMemo(() => buildCatalogProductRows(products), [products]);
  const selectedVariantIds = useMemo(
    () => variantIdsForSelectedProducts(products, selected),
    [products, selected]
  );
  const skippedByProduct = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const item of feedDiagnostics.actionableSkipped) {
      const existing = map.get(item.productId) ?? [];
      existing.push(`${item.title}: ${item.reasons.join(", ")}`);
      map.set(item.productId, existing);
    }
    return map;
  }, [feedDiagnostics.actionableSkipped]);

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
    if (selectedVariantIds.length === 0) {
      setMessage("Выберите товары.");
      return;
    }
    const response = await fetch("/api/variants/bulk-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds: selectedVariantIds, status })
    });
    setMessage(response.ok ? "Статусы вариантов обновлены." : "Не удалось обновить статусы.");
    router.refresh();
  }

  async function publish(mode: PublicationMode) {
    if (selectedVariantIds.length === 0) {
      setMessage("Выберите товары для публикации.");
      return;
    }

    const response = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantIds: selectedVariantIds, mode })
    });
    setMessage(response.ok ? "Публикация поставлена в очередь." : "Не удалось поставить публикацию в очередь.");
    startTransition(() => router.refresh());
  }

  async function deleteProduct(row: CatalogProductRow, withAvitoUnpublish: boolean) {
    const avitoCount = row.avitoItemIds.length;
    const confirmText = withAvitoUnpublish
      ? `Снять с Avito ${avitoCount} объявлений и удалить товар “${row.product.title}” из админки? Вариантов: ${row.variants.length}.`
      : `Удалить товар “${row.product.title}” только из админки? Вариантов: ${row.variants.length}.`;

    if (!window.confirm(confirmText)) {
      return;
    }

    const response = await fetch(
      `/api/products/${row.product.id}${withAvitoUnpublish ? "?avito=unpublish" : ""}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(body?.message ?? "Не удалось удалить товар.");
      return;
    }

    const next = new Set(selected);
    next.delete(row.product.id);
    setSelected(next);
    setMessage(withAvitoUnpublish ? "Товар снят с Avito и удален." : "Товар удален из админки.");
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

  async function importFromXlsx(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setIsImportingXlsx(true);
    setMessage("Импортирую XLSX из Avito...");
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/imports/avito-xlsx", {
        method: "POST",
        body: formData
      });
      const body = (await response.json().catch(() => null)) as {
        rows?: number;
        productsCreated?: number;
        productsUpdated?: number;
        variantsCreated?: number;
        variantsUpdated?: number;
        photosAttached?: number;
        message?: string;
      } | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Не удалось импортировать XLSX.");
        return;
      }

      setMessage(
        `XLSX импортирован: строк ${body?.rows ?? 0}, товаров создано ${body?.productsCreated ?? 0}, обновлено ${body?.productsUpdated ?? 0}, вариантов создано ${body?.variantsCreated ?? 0}, обновлено ${body?.variantsUpdated ?? 0}, фото добавлено ${body?.photosAttached ?? 0}.`
      );
      startTransition(() => router.refresh());
    } finally {
      setIsImportingXlsx(false);
    }
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
                {variantStatusLabels[status]}
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
          Выгрузить XML
        </button>
        <button className="button" type="button" onClick={() => publish("AUTOLOAD_CSV")}>
          <Download size={18} aria-hidden />
          Выгрузить CSV
        </button>
        <button className="button" type="button" onClick={() => publish("ITEMS_API")}>
          <Rocket size={18} aria-hidden />
          Avito API
        </button>
        <a className="button" href="/api/exports/catalog.xlsx">
          <FileSpreadsheet size={18} aria-hidden />
          Экспорт в Excel
        </a>
        <a className="button primary" href="/api/exports/avito.xlsx">
          <FileSpreadsheet size={18} aria-hidden />
          XLSX для Avito
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
        <input
          ref={xlsxInputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: "none" }}
          onChange={importFromXlsx}
        />
        <button
          className="button primary"
          type="button"
          onClick={() => xlsxInputRef.current?.click()}
          disabled={isImportingXlsx}
        >
          <Upload size={18} aria-hidden />
          Импорт XLSX
        </button>
      </div>

      {feedDiagnostics.actionableSkippedRows > 0 ? (
        <div className="feed-warning-banner">
          <AlertTriangle size={18} aria-hidden />
          <span>
            К исправлению {feedDiagnostics.actionableSkippedRows} черновиков/готовых вариантов.
            В XML сейчас готово {feedDiagnostics.readyRows} строк.
          </span>
          <a href="/api/exports/diagnostics" target="_blank" rel="noreferrer">
            Диагностика
          </a>
        </div>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th />
              <th>Товар</th>
              <th>Варианты</th>
              <th>Цена / остаток</th>
              <th>Статусы</th>
              <th>Фото / Avito</th>
              <th>Поставщик</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product.id}>
                <td>
                  <input
                    aria-label={`Выбрать ${row.product.title}`}
                    type="checkbox"
                    checked={selected.has(row.product.id)}
                    onChange={() => toggle(row.product.id)}
                  />
                </td>
                <td>
                  <Link href={`/products/${row.product.id}`}>
                    <strong>{row.product.title}</strong>
                  </Link>
                  <div className="muted">{row.product.brand ?? "Без бренда"}</div>
                  {row.description ? <div className="description-clamp">{row.description}</div> : null}
                  {skippedByProduct.get(row.product.id)?.length ? (
                    <div className="feed-row-warning">
                      <AlertTriangle size={15} aria-hidden />
                      <span>
                        Не попадёт в XML:{" "}
                        {skippedByProduct.get(row.product.id)?.slice(0, 2).join("; ")}
                        {(skippedByProduct.get(row.product.id)?.length ?? 0) > 2 ? "..." : ""}
                      </span>
                    </div>
                  ) : null}
                </td>
                <td>
                  <strong>{row.variants.length} вариантов</strong>
                  <div className="chip-line">
                    {row.colors.map((color) => (
                      <span className="data-chip" key={color}>{color}</span>
                    ))}
                  </div>
                  <div className="muted">{compactList(row.sizes)}</div>
                </td>
                <td>
                  <strong>{priceRange(row)}</strong>
                  <div className="muted">Остаток: {row.totalQuantity}</div>
                </td>
                <td>
                  <div className="status-stack">
                    {row.statusCounts.map((entry) => (
                      <span key={entry.status} className="status-count">
                        <StatusBadge status={entry.status} />
                        <span className="muted">× {entry.count}</span>
                      </span>
                    ))}
                    {row.statusCounts.length === 0 ? <span className="muted">Нет вариантов</span> : null}
                  </div>
                </td>
                <td>
                  <div>Фото: {row.photoCount}</div>
                  <div className="muted">Avito ID: {row.avitoItemIds.length}</div>
                </td>
                <td>
                  {row.supplier?.url ? (
                    <a className="button compact-button" href={row.supplier.url} target="_blank" rel="noreferrer">
                      <ExternalLink size={16} aria-hidden />
                      Заказать
                    </a>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <div className="row-actions">
                    <Link className="button compact-button" href={`/products/${row.product.id}`}>
                      <Pencil size={16} aria-hidden />
                      Открыть
                    </Link>
                    <button
                      className="button compact-button danger"
                      type="button"
                      onClick={() => deleteProduct(row, false)}
                    >
                      <Trash2 size={16} aria-hidden />
                      Из админки
                    </button>
                    <button
                      className="button compact-button danger"
                      type="button"
                      onClick={() => deleteProduct(row, true)}
                      disabled={row.avitoItemIds.length === 0}
                      title={row.avitoItemIds.length ? "Снять с Avito и удалить" : "Нет Avito ID для снятия"}
                    >
                      <Trash2 size={16} aria-hidden />
                      С Avito
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  Нет товаров по текущим фильтрам.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
