import { Copy, KeyRound } from "lucide-react";
import { env } from "@/server/config/env";

export default function SettingsPage() {
  const xmlFeed = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/feed/avito.xml?token=${env.FEED_PUBLIC_TOKEN}`;
  const csvFeed = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/feed/avito.csv?token=${env.FEED_PUBLIC_TOKEN}`;

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
          <h2>Avito OAuth2</h2>
        </div>
        <div className="form-grid">
          <label>
            Client ID
            <input className="field" value={env.AVITO_CLIENT_ID ? "Настроен" : "Не настроен"} readOnly />
          </label>
          <label>
            Client Secret
            <input className="field" value={env.AVITO_CLIENT_SECRET ? "Настроен" : "Не настроен"} readOnly />
          </label>
          <label>
            Base URL
            <input className="field" value={env.AVITO_BASE_URL} readOnly />
          </label>
          <label>
            Token path
            <input className="field" value={env.AVITO_TOKEN_PATH} readOnly />
          </label>
        </div>
      </section>

      <section className="editor-section">
        <div className="toolbar">
          <Copy size={18} aria-hidden />
          <h2>Feed URLs</h2>
        </div>
        <label>
          XML autoload
          <input className="field" value={xmlFeed} readOnly />
        </label>
        <label style={{ marginTop: 12 }}>
          CSV autoload
          <input className="field" value={csvFeed} readOnly />
        </label>
      </section>
    </div>
  );
}
