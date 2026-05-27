import { apiError, ok } from "@/server/http";
import { importAvitoXlsx } from "@/server/modules/imports/avitoXlsx";
import { requireSession } from "@/server/modules/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return ok({ error: "NO_FILE", message: "Выберите XLSX-файл для импорта." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return ok({ error: "UNSUPPORTED_FILE", message: "Импорт поддерживает только .xlsx." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await importAvitoXlsx(buffer);
    return ok({
      rows: result.rows.length,
      skippedRows: result.skippedRows,
      productsCreated: result.productsCreated,
      productsUpdated: result.productsUpdated,
      variantsCreated: result.variantsCreated,
      variantsUpdated: result.variantsUpdated,
      photosAttached: result.photosAttached
    });
  } catch (error) {
    return apiError(error);
  }
}
