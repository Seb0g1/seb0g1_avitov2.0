import { apiError, empty } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { deletePhoto } from "@/server/modules/variants/photos";

type Params = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    await deletePhoto(id);
    return empty();
  } catch (error) {
    return apiError(error);
  }
}
