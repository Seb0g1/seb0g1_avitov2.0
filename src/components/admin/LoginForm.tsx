"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn } from "lucide-react";

export function LoginForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password")
      })
    });

    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setError(body.message ?? "Не удалось войти.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form className="login-panel grid" onSubmit={submit}>
      <div>
        <p className="eyebrow">Single seller admin</p>
        <h1>Вход в каталог</h1>
      </div>
      <label>
        Email
        <input className="field" name="email" type="email" defaultValue={defaultEmail} required />
      </label>
      <label>
        Пароль
        <input className="field" name="password" type="password" required />
      </label>
      {error ? <div className="status ERROR">{error}</div> : null}
      <button className="button primary" type="submit" disabled={loading}>
        <LogIn size={18} aria-hidden />
        {loading ? "Входим..." : "Войти"}
      </button>
    </form>
  );
}
