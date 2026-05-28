"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";
import { Moon, Palette, Sparkles, Sun } from "lucide-react";
import type { ThemeMode } from "@/types/catalog";

const themeOptions: Array<{ value: ThemeMode; label: string; icon: React.ReactNode }> = [
  { value: "white", label: "Белая", icon: <Sun size={16} aria-hidden /> },
  { value: "black", label: "Чёрная", icon: <Moon size={16} aria-hidden /> },
  { value: "pink", label: "Розовая", icon: <Sparkles size={16} aria-hidden /> },
  { value: "blue", label: "Синяя", icon: <Palette size={16} aria-hidden /> }
];

export function ThemeSwitcher({ initialTheme }: { initialTheme: ThemeMode }) {
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [, startTransition] = useTransition();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function changeTheme(nextTheme: ThemeMode) {
    setTheme(nextTheme);
    startTransition(() => {
      fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeMode: nextTheme })
      }).catch(() => null);
    });
  }

  return (
    <div className="theme-switcher" aria-label="Тема панели">
      {themeOptions.map((option) => (
        <button
          key={option.value}
          type="button"
          className={theme === option.value ? "active" : ""}
          onClick={() => changeTheme(option.value)}
          title={option.label}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}
