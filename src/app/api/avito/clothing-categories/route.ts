import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import {
  importClothingCategoryTemplate,
  listClothingCategoryOptions
} from "@/server/modules/avitoCategories/clothingTemplates";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSession();
    return ok({ categories: await listClothingCategoryOptions() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return ok({ error: "NO_FILE", message: "Выберите XML-шаблон Avito." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xml")) {
      return ok({ error: "UNSUPPORTED_FILE", message: "Импорт поддерживает только .xml." }, { status: 400 });
    }

    const xml = await file.text();
    const result = await importClothingCategoryTemplate({ xml, fileName: file.name });
    return ok(result);
  } catch (error) {
    return apiError(error);
  }
}
