import { NextRequest } from "next/server";
import { apiError, ok } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { getEmployeeStats } from "@/server/modules/users/employees";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession();
    return ok({
      stats: await getEmployeeStats(request.nextUrl.searchParams.get("period") ?? "7d")
    });
  } catch (error) {
    return apiError(error);
  }
}
