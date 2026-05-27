import { apiError } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { generateAvitoXlsxExport } from "@/server/modules/exports/service";

export async function GET() {
  try {
    await requireSession();
    const { content } = await generateAvitoXlsxExport();
    return new Response(content, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="avito.xlsx"'
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
