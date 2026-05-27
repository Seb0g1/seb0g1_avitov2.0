"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Boxes,
  FileCog,
  LayoutDashboard,
  LogOut,
  Settings
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Панель", icon: LayoutDashboard },
  { href: "/catalog", label: "Каталог", icon: Boxes },
  { href: "/jobs", label: "Задачи", icon: Activity },
  { href: "/logs", label: "Журнал", icon: FileCog },
  { href: "/settings", label: "Настройки", icon: Settings }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div>
          <div>Avito Uploader</div>
          <div className="muted">админ-каталог</div>
        </div>
      </div>
      <nav className="nav">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname.startsWith(link.href);
          return (
            <Link key={link.href} className={`nav-link ${active ? "active" : ""}`} href={link.href}>
              <Icon size={18} aria-hidden />
              {link.label}
            </Link>
          );
        })}
        <button className="nav-link" type="button" onClick={logout}>
          <LogOut size={18} aria-hidden />
          Выйти
        </button>
      </nav>
    </aside>
  );
}
