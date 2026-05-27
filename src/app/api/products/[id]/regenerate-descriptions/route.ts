import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { regenerateProductDescriptions } from "@/server/modules/products/service";
import { serializeProduct } from "@/server/modules/products/serialize";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const product = await regenerateProductDescriptions(id);
    return ok({ product: serializeProduct(product) });
  } catch (error) {
    return apiError(error);
  }
}
