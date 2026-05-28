import { Copy, KeyRound, ShieldCheck } from "lucide-react";
import { ClothingCategoryTemplateImporter } from "@/components/admin/ClothingCategoryTemplateImporter";
import { EmployeeSettings } from "@/components/admin/EmployeeSettings";
import { env } from "@/server/config/env";
import { getSession } from "@/server/modules/auth/session";
import { listClothingCategoryOptions } from "@/server/modules/avitoCategories/clothingTemplates";
import { getEmployeeStats, listEmployees } from "@/server/modules/users/employees";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const xmlFeed = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/feed/avito.xml?token=${env.FEED_PUBLIC_TOKEN}`;
  const csvFeed = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/feed/avito.csv?token=${env.FEED_PUBLIC_TOKEN}`;
  const clothingCategories = await listClothingCategoryOptions();
  const isAdmin = session?.role === "ADMIN";
  const [employees, employeeStats] = isAdmin
    ? await Promise.all([listEmployees(), getEmployeeStats("30d")])
    : [[], []];

  return (
    <div className="grid">
      <header className="page-header">
        <div>
          <p className="eyebrow">Настройки</p>
          <h1>Интеграции, команда и автозагрузка</h1>
        </div>
      </header>

      <section className="settings-card">
        <div className="toolbar">
          <KeyRound size={18} aria-hidden />
          <div>
            <p className="eyebrow">Avito OAuth2</p>
            <h2>Авторизация и API</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            Client ID Avito
            <input className="field" value={env.AVITO_CLIENT_ID ? "Настроен" : "Не настроен"} readOnly />
          </label>
          <label>
            Client Secret Avito
            <input className="field" value={env.AVITO_CLIENT_SECRET ? "Настроен" : "Не настроен"} readOnly />
          </label>
          <label>
            Базовый URL
            <input className="field" value={env.AVITO_BASE_URL} readOnly />
          </label>
          <label>
            Путь токена
            <input className="field" value={env.AVITO_TOKEN_PATH} readOnly />
          </label>
        </div>
      </section>

      <section className="settings-card">
        <div className="toolbar">
          <Copy size={18} aria-hidden />
          <div>
            <p className="eyebrow">Фиды</p>
            <h2>Ссылки автозагрузки</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            XML-автозагрузка
            <input className="field" value={xmlFeed} readOnly />
          </label>
          <label>
            CSV-автозагрузка
            <input className="field" value={csvFeed} readOnly />
          </label>
        </div>
      </section>

      {isAdmin ? (
        <EmployeeSettings initialEmployees={employees} initialStats={employeeStats} />
      ) : (
        <section className="settings-card">
          <div className="toolbar">
            <ShieldCheck size={18} aria-hidden />
            <div>
              <p className="eyebrow">Команда</p>
              <h2>Сотрудники</h2>
            </div>
          </div>
          <div className="empty-state">Управление сотрудниками доступно только администратору.</div>
        </section>
      )}

      <ClothingCategoryTemplateImporter initialCategories={clothingCategories} />
    </div>
  );
}
