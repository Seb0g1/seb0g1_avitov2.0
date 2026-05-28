import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { previewMailCloudDrop } from "@/server/modules/imports/mailCloudDrop";

export const runtime = "nodejs";

const querySchema = z.object({
  date: z.string().regex(/^\d{2}\.\d{2}\.\d{4}$/, "Введите дату в формате ДД.ММ.ГГГГ.")
});

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const query = querySchema.parse({
      date: request.nextUrl.searchParams.get("date") ?? ""
    });
    return ok({ preview: await previewMailCloudDrop(query.date) });
  } catch (error) {
    return apiError(error);
  }
}
