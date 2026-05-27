import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { getFeedRowsWithDiagnostics } from "@/server/modules/exports/feedRows";

export async function GET() {
  try {
    await requireSession();
    const diagnostics = await getFeedRowsWithDiagnostics();
    return ok({
      totalVariants: diagnostics.totalVariants,
      readyRows: diagnostics.readyRows,
      exportSkippedRows: diagnostics.exportSkippedRows,
      actionableSkippedRows: diagnostics.actionableSkippedRows,
      summary: diagnostics.summary,
      actionableSummary: diagnostics.actionableSummary,
      skipped: diagnostics.skipped,
      actionableSkipped: diagnostics.actionableSkipped
    });
  } catch (error) {
    return apiError(error);
  }
}
