import { redirect } from "next/navigation";
import { CatalogClient } from "@/components/admin/CatalogClient";
import { getFeedRowsWithDiagnostics } from "@/server/modules/exports/feedRows";
import { getSession } from "@/server/modules/auth/session";
import { getUserPreferences, type CatalogFilters } from "@/server/modules/users/preferences";
import { listProducts } from "@/server/modules/products/service";
import { serializeProduct } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  search?: string;
  color?: string;
  size?: string;
  status?: string;
  category?: string;
  supplier?: string;
  withoutSupplier?: string;
  withoutPhotos?: string;
  xmlIssues?: string;
}>;

function hasExplicitFilters(params: Awaited<SearchParams>) {
  return Object.values(params).some((value) => value !== undefined && String(value).trim() !== "");
}

function booleanParam(value: unknown) {
  return value === "true" || value === "1" || value === true;
}

function filtersFromParams(params: Awaited<SearchParams>, fallback: CatalogFilters): CatalogFilters {
  if (!hasExplicitFilters(params)) {
    return fallback;
  }
  return {
    search: params.search ?? "",
    color: params.color ?? "",
    size: params.size ?? "",
    status: (params.status as CatalogFilters["status"]) ?? "",
    category: params.category ?? "",
    supplier: params.supplier ?? "",
    withoutSupplier: booleanParam(params.withoutSupplier),
    withoutPhotos: booleanParam(params.withoutPhotos),
    xmlIssues: booleanParam(params.xmlIssues)
  };
}

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const params = await searchParams;
  const preferences = await getUserPreferences(session.id);
  const filters = filtersFromParams(params, preferences.catalogFilters);
  const [productsRaw, diagnostics] = await Promise.all([
    listProducts(filters),
    getFeedRowsWithDiagnostics()
  ]);
  const issueProductIds = new Set(diagnostics.actionableSkipped.map((item) => item.productId));
  const products = productsRaw
    .filter((product) => (!filters.xmlIssues ? true : issueProductIds.has(product.id)))
    .map(serializeProduct);
  const feedDiagnostics = {
    totalVariants: diagnostics.totalVariants,
    readyRows: diagnostics.readyRows,
    exportSkippedRows: diagnostics.exportSkippedRows,
    actionableSkippedRows: diagnostics.actionableSkippedRows,
    summary: diagnostics.summary,
    actionableSummary: diagnostics.actionableSummary,
    skipped: diagnostics.skipped,
    actionableSkipped: diagnostics.actionableSkipped
  };

  return (
    <div className="grid">
      <header className="page-header">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>Товары и варианты</h1>
        </div>
      </header>
      <CatalogClient
        products={products}
        feedDiagnostics={feedDiagnostics}
        initialFilters={filters}
        initialViewMode={preferences.catalogViewMode}
      />
    </div>
  );
}
