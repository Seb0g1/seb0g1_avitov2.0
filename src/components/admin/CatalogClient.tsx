"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PublicationMode, VariantStatus } from "@prisma/client";
import {
  AlertTriangle,
  CheckSquare,
  CloudDownload,
  Download,
  ExternalLink,
  FileSpreadsheet,
  Grid2X2,
  List,
  Pencil,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Trash2,
  Upload
} from "lucide-react";
import { clothingCategoryOptions } from "@/lib/avitoOptions";
import type {
  FeedDiagnosticsDto,
  MailCloudPreviewDto,
  MailCloudPreviewProductDto,
  ProductDto,
  UserPreferencesDto
} from "@/types/catalog";
import {
  buildCatalogProductRows,
  variantIdsForSelectedProducts,
  type CatalogProductRow
} from "./catalogRows";
import { StatusBadge, variantStatusLabels } from "./StatusBadge";
import { Button, ConfirmDialog, EmptyState, Modal, SegmentedControl, Toast } from "./ui";

const statuses: VariantStatus[] = [
  "DRAFT",
  "READY",
  "UPLOADED",
  "ERROR",
  "MODERATION",
  "PUBLISHED",
  "REMOVED"
];

type CatalogFilters = UserPreferencesDto["catalogFilters"];
type ViewMode = UserPreferencesDto["catalogViewMode"];

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
  return values.slice(0, 6).join(", ") + (values.length > 6 ? "..." : "");
}

function firstPhoto(row: CatalogProductRow) {
  return row.variants.flatMap((variant) => variant.photos)[0]?.publicUrl ?? null;
}

function filterUrl(filters: CatalogFilters) {
  const params = new URLSearchParams();
  for (const key of ["search", "color", "size", "status", "category", "supplier"] as const) {
    const value = String(filters[key] ?? "").trim();
    if (value) {
      params.set(key, value);
    }
  }
  for (const key of ["withoutSupplier", "withoutPhotos", "xmlIssues"] as const) {
    if (filters[key]) {
      params.set(key, "true");
    }
  }
  const query = params.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

function warningText(items?: string[]) {
  if (!items?.length) {
    return null;
  }
  return items.slice(0, 2).join("; ") + (items.length > 2 ? "..." : "");
}

export function CatalogClient({
  products,
  feedDiagnostics,
  initialFilters,
  initialViewMode
}: {
  products: ProductDto[];
  feedDiagnostics: FeedDiagnosticsDto;
  initialFilters: CatalogFilters;
  initialViewMode: ViewMode;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [filters, setFilters] = useState<CatalogFilters>(initialFilters);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [isImportingXlsx, setIsImportingXlsx] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isMailModalOpen, setIsMailModalOpen] = useState(false);
  const [cloudImportDate, setCloudImportDate] = useState("");
  const [mailPreview, setMailPreview] = useState<MailCloudPreviewDto | null>(null);
  const [activeMailProductPath, setActiveMailProductPath] = useState<string | null>(null);
  const [selectedMailPaths, setSelectedMailPaths] = useState<Set<string>>(new Set());
  const [isLoadingMailPreview, setIsLoadingMailPreview] = useState(false);
  const [isImportingCloud, setIsImportingCloud] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ row: CatalogProductRow; withAvito: boolean } | null>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const rows = useMemo(() => buildCatalogProductRows(products), [products]);
  const visibleRows = useMemo(() => {
    if (!filters.xmlIssues) {
      return rows;
    }
    const issueProductIds = new Set(feedDiagnostics.actionableSkipped.map((item) => item.productId));
    return rows.filter((row) => issueProductIds.has(row.product.id));
  }, [feedDiagnostics.actionableSkipped, filters.xmlIssues, rows]);
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
  const activeMailProduct =
    mailPreview?.products.find((product) => product.productPath === activeMailProductPath) ??
    mailPreview?.products[0] ??
    null;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  }

  async function savePreferences(patch: Partial<UserPreferencesDto>) {
    await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    }).catch(() => null);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void savePreferences({ catalogFilters: filters });
    router.push(filterUrl(filters));
  }

  function resetFilters() {
    const empty: CatalogFilters = {
      search: "",
      color: "",
      size: "",
      status: "",
      category: "",
      supplier: "",
      withoutSupplier: false,
      withoutPhotos: false,
      xmlIssues: false
    };
    setFilters(empty);
    void savePreferences({ catalogFilters: empty });
    router.push("/catalog");
  }

  function changeViewMode(next: ViewMode) {
    setViewMode(next);
    void savePreferences({ catalogViewMode: next });
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
    setIsImportModalOpen(false);
    startTransition(() => router.refresh());
  }

  async function deleteProduct() {
    if (!deleteTarget) {
      return;
    }
    const response = await fetch(
      `/api/products/${deleteTarget.row.product.id}${deleteTarget.withAvito ? "?avito=unpublish" : ""}`,
      { method: "DELETE" }
    );
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(body?.message ?? "Не удалось удалить товар.");
      return;
    }
    const next = new Set(selected);
    next.delete(deleteTarget.row.product.id);
    setSelected(next);
    setMessage(deleteTarget.withAvito ? "Товар снят с Avito и удалён." : "Товар удалён из админки.");
    setDeleteTarget(null);
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
        (notes.length ? ` Есть замечания: ${notes.join(", ")}.` : "")
    );
    setIsImportModalOpen(false);
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
        `XLSX импортирован: строк ${body?.rows ?? 0}, товаров создано ${body?.productsCreated ?? 0}, обновлено ${body?.productsUpdated ?? 0}, вариантов создано ${body?.variantsCreated ?? 0}, обновлено ${body?.variantsUpdated ?? 0}.`
      );
      setIsImportModalOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setIsImportingXlsx(false);
    }
  }

  async function loadMailPreview(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const date = cloudImportDate.trim();
    if (!date) {
      setMessage("Укажите дату дропа.");
      return;
    }
    setIsLoadingMailPreview(true);
    setMailPreview(null);
    try {
      const response = await fetch(`/api/imports/mail-cloud-drop/preview?date=${encodeURIComponent(date)}`);
      const body = (await response.json().catch(() => null)) as { preview?: MailCloudPreviewDto; message?: string } | null;
      if (!response.ok || !body?.preview) {
        setMessage(body?.message ?? "Не удалось получить предпросмотр Mail Cloud.");
        return;
      }
      setMailPreview(body.preview);
      const importable = body.preview.products.filter((product) => !product.existing).map((product) => product.productPath);
      setSelectedMailPaths(new Set(importable));
      setActiveMailProductPath(body.preview.products[0]?.productPath ?? null);
    } finally {
      setIsLoadingMailPreview(false);
    }
  }

  async function importFromMailCloud() {
    const date = cloudImportDate.trim();
    if (!date) {
      setMessage("Укажите дату дропа.");
      return;
    }
    setIsImportingCloud(true);
    try {
      const productPaths = [...selectedMailPaths];
      const response = await fetch("/api/imports/mail-cloud-drop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, productPaths: productPaths.length ? productPaths : undefined })
      });
      const body = (await response.json().catch(() => null)) as { job?: { id: string }; message?: string } | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Не удалось импортировать дроп из Mail Cloud.");
        return;
      }

      setMessage(`Mail Cloud: импорт поставлен в очередь${body?.job?.id ? `, задача ${body.job.id.slice(0, 10)}` : ""}.`);
      setIsMailModalOpen(false);
      setIsImportModalOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setIsImportingCloud(false);
    }
  }

  function toggleMailProduct(path: string) {
    const next = new Set(selectedMailPaths);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
    }
    setSelectedMailPaths(next);
  }

  return (
    <div className="grid">
      <form className="catalog-toolbar" onSubmit={applyFilters}>
        <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 0 }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <Link className="button primary" href="/products/new">
              <Plus size={18} aria-hidden />
              Создать товар
            </Link>
            <Button type="button" onClick={() => setIsImportModalOpen(true)}>
              <Upload size={18} aria-hidden />
              Импорт / выгрузка
            </Button>
          </div>
          <SegmentedControl<ViewMode>
            value={viewMode}
            onChange={changeViewMode}
            options={[
              { value: "table", label: "Таблица", icon: <List size={16} aria-hidden /> },
              { value: "cards", label: "Карточки", icon: <Grid2X2 size={16} aria-hidden /> }
            ]}
          />
        </div>

        <div className="catalog-filter-grid">
          <label>
            Поиск
            <input
              className="field"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Название, бренд, вариант"
            />
          </label>
          <label>
            Категория
            <select
              className="select"
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="">Все</option>
              {clothingCategoryOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.goodsType} / {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Цвет
            <input
              className="field"
              value={filters.color}
              onChange={(event) => setFilters((current) => ({ ...current, color: event.target.value }))}
            />
          </label>
          <label>
            Размер
            <input
              className="field"
              value={filters.size}
              onChange={(event) => setFilters((current) => ({ ...current, size: event.target.value }))}
            />
          </label>
          <label>
            Статус
            <select
              className="select"
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as VariantStatus | "" }))}
            >
              <option value="">Все</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {variantStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 0 }}>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={filters.withoutSupplier}
                onChange={(event) => setFilters((current) => ({ ...current, withoutSupplier: event.target.checked }))}
              />
              Без поставщика
            </label>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={filters.withoutPhotos}
                onChange={(event) => setFilters((current) => ({ ...current, withoutPhotos: event.target.checked }))}
              />
              Без фото
            </label>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={filters.xmlIssues}
                onChange={(event) => setFilters((current) => ({ ...current, xmlIssues: event.target.checked }))}
              />
              Ошибка XML
            </label>
          </div>
          <div className="toolbar" style={{ marginBottom: 0 }}>
            <Button type="button" onClick={resetFilters}>Сбросить</Button>
            <Button type="submit" tone="primary">
              <Search size={18} aria-hidden />
              Найти
            </Button>
          </div>
        </div>
      </form>

      <Toast>{message}</Toast>

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

      {viewMode === "cards" ? (
        <div className="catalog-card-grid">
          {visibleRows.map((row) => (
            <ProductCard
              key={row.product.id}
              row={row}
              selected={selected.has(row.product.id)}
              issueText={warningText(skippedByProduct.get(row.product.id))}
              onToggle={() => toggle(row.product.id)}
              onDelete={(withAvito) => setDeleteTarget({ row, withAvito })}
            />
          ))}
        </div>
      ) : (
        <ProductTable
          rows={visibleRows}
          selected={selected}
          skippedByProduct={skippedByProduct}
          onToggle={toggle}
          onDelete={(row, withAvito) => setDeleteTarget({ row, withAvito })}
        />
      )}

      {visibleRows.length === 0 ? (
        <EmptyState title="По текущим фильтрам ничего нет">
          Попробуйте сбросить фильтры или импортировать товары из облака.
        </EmptyState>
      ) : null}

      {selectedVariantIds.length > 0 ? (
        <div className="bulk-bar">
          <strong>Выбрано товаров: {selected.size} · вариантов: {selectedVariantIds.length}</strong>
          <div className="catalog-actions">
            <Button type="button" onClick={() => bulkStatus("READY")}>
              <CheckSquare size={18} aria-hidden />
              Готово к выгрузке
            </Button>
            <Button type="button" tone="primary" onClick={() => publish("AUTOLOAD_XML")}>
              <Rocket size={18} aria-hidden />
              Выгрузить XML
            </Button>
          </div>
        </div>
      ) : null}

      <input
        ref={xlsxInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: "none" }}
        onChange={importFromXlsx}
      />

      <Modal
        open={isImportModalOpen}
        title="Импорт и выгрузка"
        description="Все опасные и долгие действия вынесены сюда, чтобы каталог оставался чистым."
        onClose={() => setIsImportModalOpen(false)}
      >
        <div className="grid">
          <div className="toolbar">
            <Button type="button" tone="primary" onClick={() => publish("AUTOLOAD_XML")}>
              <Rocket size={18} aria-hidden />
              Выгрузить XML
            </Button>
            <Button type="button" onClick={() => publish("AUTOLOAD_CSV")}>
              <Download size={18} aria-hidden />
              Выгрузить CSV
            </Button>
            <Button type="button" onClick={() => publish("ITEMS_API")}>
              <Rocket size={18} aria-hidden />
              Avito API
            </Button>
            <a className="button" href="/api/exports/catalog.xlsx">
              <FileSpreadsheet size={18} aria-hidden />
              Экспорт Excel
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
          </div>
          <div className="toolbar">
            <Button type="button" onClick={syncStatuses} disabled={isPending}>
              <RefreshCw size={18} aria-hidden />
              Синхронизация
            </Button>
            <Button type="button" tone="primary" onClick={importFromAvito} disabled={isPending}>
              <RefreshCw size={18} aria-hidden />
              Импорт из Avito
            </Button>
            <Button type="button" onClick={() => xlsxInputRef.current?.click()} disabled={isImportingXlsx}>
              <Upload size={18} aria-hidden />
              Импорт XLSX
            </Button>
            <Button type="button" tone="primary" onClick={() => setIsMailModalOpen(true)}>
              <CloudDownload size={18} aria-hidden />
              Импорт из облака
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={isMailModalOpen}
        title="Импорт из Mail Cloud"
        description="Сначала проверьте папки, фото, видео и инфа.txt, затем импортируйте выбранные товары."
        onClose={() => setIsMailModalOpen(false)}
        footer={
          <>
            <Button type="button" onClick={() => setIsMailModalOpen(false)}>Закрыть</Button>
            <Button type="button" tone="primary" onClick={importFromMailCloud} disabled={isImportingCloud || !cloudImportDate.trim() || !mailPreview}>
              {isImportingCloud ? "Ставлю в очередь..." : `Импортировать ${selectedMailPaths.size || "всё"}`}
            </Button>
          </>
        }
      >
        <form className="toolbar" onSubmit={loadMailPreview}>
          <label style={{ minWidth: 220 }}>
            Дата дропа
            <input
              className="field"
              value={cloudImportDate}
              onChange={(event) => setCloudImportDate(event.target.value)}
              placeholder="28.05.2026"
              inputMode="numeric"
            />
          </label>
          <Button type="button" tone="primary" disabled={isLoadingMailPreview} onClick={() => void loadMailPreview()}>
            <CloudDownload size={18} aria-hidden />
            {isLoadingMailPreview ? "Загружаю..." : "Предпросмотр"}
          </Button>
        </form>

        {mailPreview ? (
          <MailCloudPreview
            preview={mailPreview}
            activeProduct={activeMailProduct}
            selectedPaths={selectedMailPaths}
            onSelect={(product) => setActiveMailProductPath(product.productPath)}
            onToggle={toggleMailProduct}
          />
        ) : (
          <EmptyState title="Предпросмотр ещё не загружен">
            Введите дату и нажмите “Предпросмотр”.
          </EmptyState>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        danger
        title={deleteTarget?.withAvito ? "Снять с Avito и удалить?" : "Удалить товар из админки?"}
        description={
          deleteTarget
            ? `${deleteTarget.row.product.title}. Вариантов: ${deleteTarget.row.variants.length}.`
            : ""
        }
        confirmLabel={deleteTarget?.withAvito ? "Снять и удалить" : "Удалить"}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteProduct}
      />
    </div>
  );
}

function ProductCard({
  row,
  selected,
  issueText,
  onToggle,
  onDelete
}: {
  row: CatalogProductRow;
  selected: boolean;
  issueText: string | null;
  onToggle: () => void;
  onDelete: (withAvito: boolean) => void;
}) {
  const cover = firstPhoto(row);
  return (
    <article className="catalog-card">
      <div className="catalog-card-head">
        <div className="catalog-cover">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" />
          ) : (
            "Фото"
          )}
        </div>
        <div>
          <label className="inline-check">
            <input type="checkbox" checked={selected} onChange={onToggle} />
            <Link href={`/products/${row.product.id}`}>
              <strong>{row.product.title}</strong>
            </Link>
          </label>
          <div className="muted">{row.product.brand ?? "Без бренда"}</div>
          <div className="chip-line">
            {row.colors.map((color) => <span className="data-chip" key={color}>{color}</span>)}
          </div>
        </div>
      </div>
      <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 0 }}>
        <strong>{priceRange(row)}</strong>
        <span className="muted">Остаток: {row.totalQuantity}</span>
      </div>
      <div className="muted">Размеры: {compactList(row.sizes)}</div>
      <div className="status-stack">
        {row.statusCounts.map((entry) => (
          <span key={entry.status} className="status-count">
            <StatusBadge status={entry.status} />
            <span className="muted">× {entry.count}</span>
          </span>
        ))}
      </div>
      {issueText ? (
        <div className="feed-row-warning">
          <AlertTriangle size={15} aria-hidden />
          <span>Не попадёт в XML: {issueText}</span>
        </div>
      ) : null}
      <div className="row-actions">
        {row.supplier?.url ? (
          <a className="button compact-button" href={row.supplier.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden />
            Поставщик
          </a>
        ) : null}
        <Link className="button compact-button" href={`/products/${row.product.id}`}>
          <Pencil size={16} aria-hidden />
          Открыть
        </Link>
        <Button type="button" compact tone="danger" onClick={() => onDelete(false)}>
          <Trash2 size={16} aria-hidden />
          Удалить
        </Button>
      </div>
    </article>
  );
}

function ProductTable({
  rows,
  selected,
  skippedByProduct,
  onToggle,
  onDelete
}: {
  rows: CatalogProductRow[];
  selected: Set<string>;
  skippedByProduct: Map<string, string[]>;
  onToggle: (id: string) => void;
  onDelete: (row: CatalogProductRow, withAvito: boolean) => void;
}) {
  return (
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
                  onChange={() => onToggle(row.product.id)}
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
                    <span>Не попадёт в XML: {warningText(skippedByProduct.get(row.product.id))}</span>
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
                <div>Видео: {row.videoCount}</div>
                <div className="muted">Avito ID: {row.avitoItemIds.length}</div>
              </td>
              <td>
                {row.supplier?.url ? (
                  <a className="button compact-button" href={row.supplier.url} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} aria-hidden />
                    Поставщик
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
                  <Button type="button" compact tone="danger" onClick={() => onDelete(row, false)}>
                    <Trash2 size={16} aria-hidden />
                    Из админки
                  </Button>
                  <Button
                    type="button"
                    compact
                    tone="danger"
                    onClick={() => onDelete(row, true)}
                    disabled={row.avitoItemIds.length === 0}
                    title={row.avitoItemIds.length ? "Снять с Avito и удалить" : "Нет Avito ID для снятия"}
                  >
                    <Trash2 size={16} aria-hidden />
                    С Avito
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MailCloudPreview({
  preview,
  activeProduct,
  selectedPaths,
  onSelect,
  onToggle
}: {
  preview: MailCloudPreviewDto;
  activeProduct: MailCloudPreviewProductDto | null;
  selectedPaths: Set<string>;
  onSelect: (product: MailCloudPreviewProductDto) => void;
  onToggle: (path: string) => void;
}) {
  return (
    <div className="mail-preview-layout">
      <aside className="mail-preview-sidebar">
        {preview.categories.map((category) => (
          <div className="mail-preview-list" key={category.path}>
            <strong>{category.name}</strong>
            {category.products.map((product) => (
              <button
                className={`mail-preview-product ${activeProduct?.productPath === product.productPath ? "active" : ""}`}
                type="button"
                key={product.productPath}
                onClick={() => onSelect(product)}
              >
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={selectedPaths.has(product.productPath)}
                    disabled={product.existing}
                    onChange={(event) => {
                      event.stopPropagation();
                      onToggle(product.productPath);
                    }}
                    onClick={(event) => event.stopPropagation()}
                  />
                  <span>
                    <strong>{product.title}</strong>
                    <div className="muted">
                      {product.existing ? "уже импортирован" : `${product.variants.length} вариантов`}
                    </div>
                  </span>
                </label>
              </button>
            ))}
          </div>
        ))}
      </aside>

      <section className="panel" style={{ boxShadow: "none" }}>
        {activeProduct ? (
          <div className="grid">
            <div className="toolbar" style={{ justifyContent: "space-between" }}>
              <div>
                <p className="eyebrow">{activeProduct.categoryName}</p>
                <h2>{activeProduct.title}</h2>
              </div>
              <span className={activeProduct.existing ? "status REMOVED" : "status DRAFT"}>
                {activeProduct.existing ? "Пропустим" : "К импорту"}
              </span>
            </div>

            <div className="form-grid">
              <div className="employee-stat">
                <strong>{activeProduct.info.price ?? "—"}</strong>
                <div className="muted">цена из инфа.txt</div>
              </div>
              <div className="employee-stat">
                <strong>{activeProduct.info.supplierUrl ? "Telegram" : "—"}</strong>
                <div className="muted">поставщик</div>
              </div>
            </div>

            {activeProduct.infoText ? (
              <pre className="description-preview description-editor-preview">{activeProduct.infoText}</pre>
            ) : null}

            {activeProduct.variants.map((variant) => (
              <article className="mail-preview-item" key={variant.sourcePath}>
                <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 0 }}>
                  <strong>{variant.color}</strong>
                  <span className="muted">{variant.photos.length} фото · {variant.videos.length} видео</span>
                </div>
                <div className="mail-media-grid">
                  {variant.photos.slice(0, 12).map((photo) => (
                    <a className="mail-media" href={photo.previewUrl} target="_blank" rel="noreferrer" key={photo.path}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.previewUrl} alt={photo.name} />
                    </a>
                  ))}
                  {variant.videos.slice(0, 4).map((video) => (
                    <a className="mail-media" href={video.previewUrl} target="_blank" rel="noreferrer" key={video.path}>
                      <video src={video.previewUrl} muted preload="metadata" />
                    </a>
                  ))}
                </div>
              </article>
            ))}

            {preview.warnings.length > 0 ? (
              <div className="feed-warning-banner">
                <AlertTriangle size={18} aria-hidden />
                <span>{preview.warnings.slice(0, 4).join("; ")}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState title="В папке нет товаров" />
        )}
      </section>
    </div>
  );
}
