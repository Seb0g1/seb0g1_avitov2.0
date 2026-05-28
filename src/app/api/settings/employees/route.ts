import { apiError, created, ok } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { createEmployee, listEmployees } from "@/server/modules/users/employees";

export async function GET() {
  try {
    await requireAdminSession();
    return ok({ employees: await listEmployees() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    return created({ employee: await createEmployee(await request.json()) });
  } catch (error) {
    return apiError(error);
  }
}
