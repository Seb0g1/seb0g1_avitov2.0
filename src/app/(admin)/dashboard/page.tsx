import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Clock3,
  CloudDownload,
  PackageCheck,
  PauseCircle,
  Rocket,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/admin/MetricCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getDashboardMetrics } from "@/server/modules/dashboard/service";
import { listProducts } from "@/server/modules/products/service";
import { serializeProduct } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

const jobTypeLabels = {
  PUBLICATION: "Выгрузка",
  EXPORT: "Экспорт",
  STATUS_SYNC: "Синхронизация",
  MAIL_CLOUD_IMPORT: "Mail Cloud"
} as const;

const jobStatusLabels = {
  QUEUED: "в очереди",
  RUNNING: "в работе",
  COMPLETED: "готово",
  FAILED: "ошибка"
} as const;

function formatDate(value: Date | string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const products = (await listProducts({})).slice(0, 6).map(serializeProduct);
  const needsAttention = [
    { label: "Без фото", value: metrics.noPhotos, href: "/catalog?withoutPhotos=true" },
    { label: "Без цены", value: metrics.noPrice, href: "/catalog" },
    { label: "Без поставщика", value: metrics.noSupplier, href: "/catalog?withoutSupplier=true" },
    { label: "Не попадёт в XML", value: metrics.feed.actionableSkippedRows, href: "/api/exports/diagnostics" }
  ];

  return (
    <div className="grid">
      <header className="page-header">
        <div>
          <p className="eyebrow">Постоянный онлайн</p>
          <h1>Dashboard Avito</h1>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <Link className="button" href="/settings">
            <Sparkles size={18} aria-hidden />
            Настройки
          </Link>
          <Link className="button primary" href="/catalog">
            <PackageCheck size={18} aria-hidden />
            Открыть каталог
          </Link>
        </div>
      </header>

      <section className="grid metrics">
        <MetricCard label="Товаров" value={metrics.totalProducts} icon={Boxes} />
        <MetricCard label="Вариантов" value={metrics.totalVariants} icon={PackageCheck} />
        <MetricCard label="Готово к XML" value={metrics.feed.readyRows} icon={CheckCircle2} />
        <MetricCard label="На модерации" value={metrics.moderation} icon={Clock3} />
        <MetricCard label="Ошибки" value={metrics.errors + metrics.feed.actionableSkippedRows} icon={AlertTriangle} />
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <div>
              <p className="eyebrow">Что требует внимания</p>
              <h2>Перед выгрузкой</h2>
            </div>
            <Link className="button compact-button" href="/api/exports/diagnostics" target="_blank">
              Диагностика
            </Link>
          </div>
          <div className="insight-list">
            {needsAttention.map((item) => (
              <Link className="insight-item" key={item.label} href={item.href}>
                <strong>{item.label}</strong>
                <span className={item.value > 0 ? "status ERROR" : "status PUBLISHED"}>{item.value}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <div>
              <p className="eyebrow">Очередь</p>
              <h2>Последние задачи</h2>
            </div>
            <Link className="button compact-button" href="/jobs">
              Все задачи
            </Link>
          </div>
          <div className="activity-list">
            {metrics.recentJobs.map((job) => (
              <div className="activity-item" key={job.id}>
                <strong>{jobTypeLabels[job.type]}</strong>
                <span className="muted">
                  {jobStatusLabels[job.status]} · {formatDate(job.queuedAt)}
                </span>
              </div>
            ))}
            {metrics.recentJobs.length === 0 ? <div className="empty-state">Задач пока нет</div> : null}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="toolbar" style={{ justifyContent: "space-between" }}>
            <div>
              <p className="eyebrow">Каталог</p>
              <h2>Последние товары</h2>
            </div>
            <Link className="button compact-button" href="/products/new">
              Создать товар
            </Link>
          </div>
          <div className="table-wrap" style={{ boxShadow: "none" }}>
            <table>
              <thead>
                <tr>
                  <th>Товар</th>
                  <th>Варианты</th>
                  <th>Статус</th>
                  <th>Обновлён</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const latest = product.variants[0];
                  return (
                    <tr key={product.id}>
                      <td>
                        <Link href={`/products/${product.id}`}>
                          <strong>{product.title}</strong>
                        </Link>
                        <div className="muted">{product.brand ?? "Без бренда"}</div>
                      </td>
                      <td>{product.variants.length}</td>
                      <td>{latest ? <StatusBadge status={latest.status} /> : <span className="muted">Нет вариантов</span>}</td>
                      <td>{formatDate(product.updatedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="toolbar">
            <CloudDownload size={18} aria-hidden />
            <div>
              <p className="eyebrow">Команда</p>
              <h2>Активность</h2>
            </div>
          </div>
          <div className="activity-list">
            {metrics.recentActions.map((action) => (
              <div className="activity-item" key={action.id}>
                <strong>{action.actor?.name ?? action.actor?.email ?? "Система"}</strong>
                <span className="muted">{action.message} · {formatDate(action.createdAt)}</span>
              </div>
            ))}
            {metrics.recentActions.length === 0 ? <div className="empty-state">Действий пока нет</div> : null}
          </div>
        </section>
      </div>

      <section className="grid metrics">
        <MetricCard label="Черновики" value={metrics.drafts} icon={PauseCircle} />
        <MetricCard label="Готово" value={metrics.ready} icon={Rocket} />
        <MetricCard label="Опубликовано" value={metrics.online} icon={CheckCircle2} />
        <MetricCard label="Без фото" value={metrics.noPhotos} icon={AlertTriangle} />
        <MetricCard label="Без поставщика" value={metrics.noSupplier} icon={CloudDownload} />
      </section>
    </div>
  );
}
