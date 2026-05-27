import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { bulkUpdateVariantStatus } from "@/server/modules/products/service";

export async function POST(request: Request) {
  try {
    await requireSession();
    const result = await bulkUpdateVariantStatus(await request.json());
    return ok({ updated: result.count });
  } catch (error) {
    return apiError(error);
  }
}
