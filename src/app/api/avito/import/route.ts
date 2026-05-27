import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { importAvitoItems } from "@/server/modules/avitoApi/importItems";

export async function POST() {
  try {
    await requireSession();
    const result = await importAvitoItems();
    return ok(result);
  } catch (error) {
    return apiError(error);
  }
}
