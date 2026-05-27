import { redirect } from "next/navigation";
import { env } from "@/server/config/env";
import { getSession } from "@/server/modules/auth/session";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="login-screen">
      <LoginForm defaultEmail={env.ADMIN_EMAIL} />
    </main>
  );
}
