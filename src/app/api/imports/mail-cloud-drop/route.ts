import { z } from "zod";
import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { importMailCloudDrop } from "@/server/modules/imports/mailCloudDrop";

export const runtime = "nodejs";

const importSchema = z.object({
  date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, "Введите дату в формате ДД.ММ.ГГГГ.")
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const payload = importSchema.parse(await request.json());
    return ok(await importMailCloudDrop(payload.date));
  } catch (error) {
    return apiError(error);
  }
}
