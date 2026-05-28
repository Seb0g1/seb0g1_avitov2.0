import { NextRequest } from "next/server";
import { z } from "zod";
import { apiError } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import {
  assertMailCloudPathAllowed,
  createMailCloudClient,
  mailCloudFileContentType
} from "@/server/modules/imports/mailCloudDrop";

export const runtime = "nodejs";

const querySchema = z.object({
  path: z.string().min(1)
});

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const query = querySchema.parse({
      path: request.nextUrl.searchParams.get("path") ?? ""
    });
    const path = assertMailCloudPathAllowed(query.path);
    const file = await createMailCloudClient().readFile(path);
    const body = new Uint8Array(file.buffer);
    return new Response(body, {
      headers: {
        "Content-Type": mailCloudFileContentType(path, file.mimeType),
        "Cache-Control": "private, max-age=120"
      }
    });
  } catch (error) {
    return apiError(error);
  }
}
