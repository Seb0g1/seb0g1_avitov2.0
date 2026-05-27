import { apiError, created } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { saveVariantPhoto } from "@/server/modules/variants/photos";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    await requireSession();
    const { id } = await params;
    const formData = await request.formData();
    const files = formData.getAll("photos").filter((item): item is File => item instanceof File);
    if (files.length === 0) {
      throw new Error("Добавьте хотя бы одно фото.");
    }

    const photos = [];
    for (const file of files) {
      photos.push(await saveVariantPhoto(id, file));
    }

    return created({ photos });
  } catch (error) {
    return apiError(error);
  }
}
