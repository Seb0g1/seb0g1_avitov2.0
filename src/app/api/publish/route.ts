import { PublicationMode } from "@prisma/client";
import { z } from "zod";
import { apiError, created } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { enqueuePublication } from "@/server/modules/jobs/service";

const publishSchema = z.object({
  mode: z.nativeEnum(PublicationMode).default(PublicationMode.AUTOLOAD_XML),
  variantIds: z.array(z.string()).min(1)
});

export async function POST(request: Request) {
  try {
    await requireSession();
    const input = publishSchema.parse(await request.json());
    const job = await enqueuePublication(input.mode, input.variantIds);
    return created({ job });
  } catch (error) {
    return apiError(error);
  }
}
