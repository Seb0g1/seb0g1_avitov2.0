import { apiError, empty, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { deleteProduct, getProduct, updateProduct } from "@/server/modules/products/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const product = await getProduct(id);
    return ok({ product });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const product = await updateProduct(id, await request.json());
    return ok({ product });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    await deleteProduct(id);
    return empty();
  } catch (error) {
    return apiError(error);
  }
}
