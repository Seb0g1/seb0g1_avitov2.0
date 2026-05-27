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
      skippedRows: diagnostics.skippedRows,
      summary: diagnostics.summary,
      skipped: diagnostics.skipped
    });
  } catch (error) {
    return apiError(error);
  }
}
