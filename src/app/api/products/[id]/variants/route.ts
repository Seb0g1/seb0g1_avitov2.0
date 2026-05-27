import { apiError, created } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { createVariant } from "@/server/modules/products/service";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const variant = await createVariant(id, await request.json());
    return created({ variant });
  } catch (error) {
    return apiError(error);
  }
}
