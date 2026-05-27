import { Copy, KeyRound } from "lucide-react";
import { ClothingCategoryTemplateImporter } from "@/components/admin/ClothingCategoryTemplateImporter";
import { env } from "@/server/config/env";
import { listClothingCategoryOptions } from "@/server/modules/avitoCategories/clothingTemplates";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const xmlFeed = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/feed/avito.xml?token=${env.FEED_PUBLIC_TOKEN}`;
  const csvFeed = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/feed/avito.csv?token=${env.FEED_PUBLIC_TOKEN}`;
  const clothingCategories = await listClothingCategoryOptions();

  return (
    <div className="grid">
      <header className="page-header">
        <div>
          <p className="eyebrow">Настройки</p>
          <h1>Интеграция и автозагрузка</h1>
        </div>
      </header>

      <section className="editor-section">
        <div className="toolbar">
          <KeyRound size={18} aria-hidden />
          <h2>Авторизация Avito OAuth2</h2>
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
            Путь получения токена
            <input className="field" value={env.AVITO_TOKEN_PATH} readOnly />
          </label>
        </div>
      </section>

      <section className="editor-section">
        <div className="toolbar">
          <Copy size={18} aria-hidden />
          <h2>Ссылки автозагрузки</h2>
        </div>
        <label>
          XML-автозагрузка
          <input className="field" value={xmlFeed} readOnly />
        </label>
        <label style={{ marginTop: 12 }}>
          CSV-автозагрузка
          <input className="field" value={csvFeed} readOnly />
        </label>
      </section>

      <ClothingCategoryTemplateImporter initialCategories={clothingCategories} />
    </div>
  );
}
