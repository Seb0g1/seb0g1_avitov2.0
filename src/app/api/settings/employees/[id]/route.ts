import { apiError, ok } from "@/server/http";
import { requireAdminSession } from "@/server/modules/auth/session";
import { updateEmployee } from "@/server/modules/users/employees";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    return ok({ employee: await updateEmployee(id, await request.json()) });
  } catch (error) {
    return apiError(error);
  }
}
