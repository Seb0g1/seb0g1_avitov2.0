import { apiError, created } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { createProductWithVariants } from "@/server/modules/products/service";
import { serializeProduct } from "@/server/modules/products/serialize";

export async function POST(request: Request) {
  try {
    await requireSession();
    const product = await createProductWithVariants(await request.json());
    return created({ product: serializeProduct(product) });
  } catch (error) {
    return apiError(error);
  }
}
