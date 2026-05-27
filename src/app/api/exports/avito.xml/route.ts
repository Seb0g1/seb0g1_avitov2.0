import { apiError } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { generateAvitoXmlExport } from "@/server/modules/exports/service";

export async function GET() {
  try {
    await requireSession();
    const { content } = await generateAvitoXmlExport();
    return new Response(content, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": 'attachment; filename="avito.xml"'
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
