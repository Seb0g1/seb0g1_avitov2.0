import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { getDashboardMetrics } from "@/server/modules/dashboard/service";

export async function GET() {
  try {
    await requireSession();
    const metrics = await getDashboardMetrics();
    return ok({ metrics });
  } catch (error) {
    return apiError(error);
  }
}
