import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { expandVariantSizes } from "@/server/modules/products/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    return ok(await expandVariantSizes(id, await request.json()));
  } catch (error) {
    return apiError(error);
  }
}
