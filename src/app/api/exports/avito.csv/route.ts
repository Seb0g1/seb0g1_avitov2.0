import { apiError } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { generateAvitoCsvExport } from "@/server/modules/exports/service";

export async function GET() {
  try {
    await requireSession();
    const { content } = await generateAvitoCsvExport();
    return new Response(content, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="avito.csv"'
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
