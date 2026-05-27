import { getSession } from "@/server/modules/auth/session";
import { ok } from "@/server/http";

export async function GET() {
  const user = await getSession();
  return ok({ user });
}
