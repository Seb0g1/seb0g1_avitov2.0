import { z } from "zod";
import { apiError, created } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { enqueueMailCloudImport } from "@/server/modules/jobs/service";

export const runtime = "nodejs";

const importSchema = z.object({
  date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, "Введите дату в формате ДД.ММ.ГГГГ."),
  productPaths: z.array(z.string().min(1)).optional()
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const payload = importSchema.parse(await request.json());
    return created({ job: await enqueueMailCloudImport(payload.date, payload.productPaths) });
  } catch (error) {
    return apiError(error);
  }
}
