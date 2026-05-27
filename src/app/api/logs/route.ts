import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { getLogs } from "@/server/modules/logs/service";

export async function GET() {
  try {
    await requireSession();
    const logs = await getLogs();
    return ok(logs);
  } catch (error) {
    return apiError(error);
  }
}
