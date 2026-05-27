import { z } from "zod";
import { authenticateAdmin } from "@/server/modules/auth/service";
import { setSessionCookie } from "@/server/modules/auth/session";
import { apiError, ok } from "@/server/http";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const result = await authenticateAdmin(input.email, input.password);
    if (!result) {
      return ok(
        { error: "INVALID_CREDENTIALS", message: "Неверный email или пароль." },
        { status: 401 }
      );
    }

    await setSessionCookie(result.token);
    return ok({ user: result.user });
  } catch (error) {
    return apiError(error);
  }
}
