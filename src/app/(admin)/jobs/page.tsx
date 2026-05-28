import { Activity } from "lucide-react";
import { SyncButton } from "@/components/admin/SyncButton";
import { listJobs } from "@/server/modules/jobs/service";
import { serializeJob } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

const jobTypeLabels = {
  PUBLICATION: "Публикация",
  EXPORT: "Экспорт",
  STATUS_SYNC: "Синхронизация статусов",
  MAIL_CLOUD_IMPORT: "Импорт Mail Cloud"
} as const;

const jobStatusLabels = {
  QUEUED: "В очереди",
  RUNNING: "В работе",
  COMPLETED: "Готово",
  FAILED: "Ошибка"
} as const;

const modeLabels = {
  AUTOLOAD_XML: "Автозагрузка XML",
  AUTOLOAD_CSV: "Автозагрузка CSV",
  ITEMS_API: "Avito API"
} as const;

function resultSummary(result: unknown) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return "—";
  }

  const data = result as Record<string, unknown>;
  if ("createdProducts" in data || "photosImported" in data) {
    return [
      `товаров ${data.createdProducts ?? 0}`,
      `вариантов ${data.createdVariants ?? 0}`,
      `фото ${data.photosImported ?? 0}`,
      `видео ${data.videosImported ?? 0}`,
      `пропущено ${data.skippedExisting ?? 0}`
    ].join(", ");
  }

  if (typeof data.rows === "number") {
    return `строк ${data.rows}`;
  }

  if (Array.isArray(data.published)) {
    return `опубликовано ${data.published.length}`;
  }

  return "Готово";
}

export default async function JobsPage() {
  const jobs = (await listJobs()).map(serializeJob);

  return (
    <div className="grid">
      <header className="page-header">
        <div>
          <p className="eyebrow">Очереди</p>
          <h1>Публикация и синхронизация</h1>
        </div>
        <SyncButton />
      </header>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Задача</th>
              <th>Тип</th>
              <th>Режим</th>
              <th>Статус</th>
              <th>Попытки</th>
              <th>Результат</th>
              <th>Ошибка</th>
              <th>Создан</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td>
                  <Activity size={16} aria-hidden /> {job.id.slice(0, 10)}
                </td>
                <td>{jobTypeLabels[job.type]}</td>
                <td>{job.mode ? modeLabels[job.mode] : "—"}</td>
                <td>{jobStatusLabels[job.status]}</td>
                <td>{job.attempts}</td>
                <td className="muted">{resultSummary(job.result)}</td>
                <td className="muted">{job.error ?? "—"}</td>
                <td>{new Date(job.queuedAt).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted">
                  Очередь пока пустая.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
