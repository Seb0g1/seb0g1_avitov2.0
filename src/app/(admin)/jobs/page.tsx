import { Activity } from "lucide-react";
import { SyncButton } from "@/components/admin/SyncButton";
import { listJobs } from "@/server/modules/jobs/service";
import { serializeJob } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

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
              <th>Job</th>
              <th>Тип</th>
              <th>Режим</th>
              <th>Статус</th>
              <th>Попытки</th>
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
                <td>{job.type}</td>
                <td>{job.mode ?? "—"}</td>
                <td>{job.status}</td>
                <td>{job.attempts}</td>
                <td className="muted">{job.error ?? "—"}</td>
                <td>{new Date(job.queuedAt).toLocaleString("ru-RU")}</td>
              </tr>
            ))}
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
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
