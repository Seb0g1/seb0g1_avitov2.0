import { apiError, ok } from "@/server/http";
import { requireSession } from "@/server/modules/auth/session";
import { getUserPreferences, updateUserPreferences } from "@/server/modules/users/preferences";

export async function GET() {
  try {
    const session = await requireSession();
    return ok({ preferences: await getUserPreferences(session.id) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireSession();
    return ok({ preferences: await updateUserPreferences(session.id, await request.json()) });
  } catch (error) {
    return apiError(error);
  }
}
