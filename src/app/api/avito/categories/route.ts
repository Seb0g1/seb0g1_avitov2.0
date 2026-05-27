import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { listAvitoCategories } from "@/server/modules/products/service";

export async function GET() {
  try {
    await requireSession();
    const categories = await listAvitoCategories();
    return ok({ categories });
  } catch (error) {
    return apiError(error);
  }
}
