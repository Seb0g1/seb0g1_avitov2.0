import { AlertTriangle, Info } from "lucide-react";
import { getLogs } from "@/server/modules/logs/service";
import { serializeActionLog, serializeErrorLog } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const logs = await getLogs();
  const actions = logs.actions.map(serializeActionLog);
  const errors = logs.errors.map(serializeErrorLog);

  return (
    <div className="grid">
      <header className="page-header">
        <div>
          <p className="eyebrow">Аудит</p>
          <h1>История действий и ошибок</h1>
        </div>
      </header>

      <div className="split">
        <section className="editor-section">
          <div className="toolbar">
            <Info size={18} aria-hidden />
            <h2>Действия</h2>
          </div>
          <div className="log-list">
            {actions.map((log) => (
              <div className="log-item" key={log.id}>
                <strong>{log.message}</strong>
                <div className="muted">{new Date(log.createdAt).toLocaleString("ru-RU")}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="editor-section">
          <div className="toolbar">
            <AlertTriangle size={18} aria-hidden />
            <h2>Ошибки</h2>
          </div>
          <div className="log-list">
            {errors.map((log) => (
              <div className="log-item" key={log.id}>
                <strong>{log.source}</strong>
                <div>{log.message}</div>
                <div className="muted">{new Date(log.createdAt).toLocaleString("ru-RU")}</div>
              </div>
            ))}
            {errors.length === 0 ? <div className="muted">Ошибок пока нет.</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
