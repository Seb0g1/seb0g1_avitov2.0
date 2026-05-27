import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { listJobs } from "@/server/modules/jobs/service";

export async function GET() {
  try {
    await requireSession();
    const jobs = await listJobs();
    return ok({ jobs });
  } catch (error) {
    return apiError(error);
  }
}
