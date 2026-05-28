import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { ThemeSwitcher } from "@/components/admin/ThemeSwitcher";
import { getSession } from "@/server/modules/auth/session";
import { getUserPreferences } from "@/server/modules/users/preferences";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const preferences = await getUserPreferences(session.id);

  return (
    <div className="app-shell" data-theme-shell>
      <Sidebar />
      <main className="main">
        <div className="topbar glass-panel">
          <div>
            <span className="eyebrow">Рабочая панель</span>
            <strong>{session.name ?? session.email}</strong>
          </div>
          <ThemeSwitcher initialTheme={preferences.themeMode} />
        </div>
        {children}
      </main>
    </div>
  );
}
