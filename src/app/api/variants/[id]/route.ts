import { apiError, empty, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { deleteVariant, updateVariant } from "@/server/modules/products/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const variant = await updateVariant(id, await request.json());
    return ok({ variant });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    await deleteVariant(id);
    return empty();
  } catch (error) {
    return apiError(error);
  }
}
