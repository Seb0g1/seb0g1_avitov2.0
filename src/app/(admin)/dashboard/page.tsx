import { AlertTriangle, CheckCircle2, Clock3, PackageCheck, PauseCircle } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/admin/MetricCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getDashboardMetrics } from "@/server/modules/dashboard/service";
import { listProducts } from "@/server/modules/products/service";
import { serializeProduct } from "@/server/modules/products/serialize";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const metrics = await getDashboardMetrics();
  const products = (await listProducts({})).slice(0, 5).map(serializeProduct);

  return (
    <div className="grid">
      <header className="page-header">
        <div>
          <p className="eyebrow">Постоянный онлайн</p>
          <h1>Мониторинг публикаций Avito</h1>
        </div>
        <Link className="button primary" href="/catalog">
          <PackageCheck size={18} aria-hidden />
          Открыть каталог
        </Link>
      </header>

      <section className="grid metrics">
        <MetricCard label="Онлайн" value={metrics.online} icon={CheckCircle2} />
        <MetricCard label="На модерации" value={metrics.moderation} icon={Clock3} />
        <MetricCard label="С ошибкой" value={metrics.errors} icon={AlertTriangle} />
        <MetricCard label="Снято" value={metrics.removed} icon={PauseCircle} />
        <MetricCard label="Ожидает" value={metrics.pending} icon={PackageCheck} />
      </section>

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Товар</th>
              <th>Варианты</th>
              <th>Последний статус</th>
              <th>Обновлен</th>
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
                  <td>{new Date(product.updatedAt).toLocaleString("ru-RU")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
