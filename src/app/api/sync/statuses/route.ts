import { apiError, created } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { enqueueStatusSync } from "@/server/modules/jobs/service";

export const runtime = "nodejs";

async function extractReportText(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("report");
    if (file instanceof File) {
      return file.text();
    }
    const text = formData.get("reportText");
    return typeof text === "string" ? text : undefined;
  }

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { reportText?: string };
    return body.reportText;
  }

  return undefined;
}

export async function POST(request: Request) {
  try {
    await requireSession();
    const reportText = await extractReportText(request);
    const job = await enqueueStatusSync(reportText);
    return created({ job });
  } catch (error) {
    return apiError(error);
  }
}
