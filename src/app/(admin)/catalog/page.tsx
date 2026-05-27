import { CatalogClient } from "@/components/admin/CatalogClient";
import { getFeedRowsWithDiagnostics } from "@/server/modules/exports/feedRows";
import { listProducts } from "@/server/modules/products/service";
import { serializeProduct } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  search?: string;
  color?: string;
  size?: string;
  status?: string;
  withoutSupplier?: string;
}>;

export default async function CatalogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const products = (await listProducts(params)).map(serializeProduct);
  const diagnostics = await getFeedRowsWithDiagnostics();
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
      <CatalogClient products={products} feedDiagnostics={feedDiagnostics} />
    </div>
  );
}
