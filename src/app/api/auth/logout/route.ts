import { clearSessionCookie } from "@/server/modules/auth/session";
import { ok } from "@/server/http";

export async function POST() {
  await clearSessionCookie();
  return ok({ ok: true });
}
