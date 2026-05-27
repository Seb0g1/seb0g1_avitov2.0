import { VariantStatus } from "@prisma/client";
import { prisma } from "@/server/db";

export async function getDashboardMetrics() {
  const grouped = await prisma.variant.groupBy({
    by: ["status"],
    _count: { status: true }
  });

  const counts = Object.fromEntries(
    grouped.map((item) => [item.status, item._count.status])
  ) as Partial<Record<VariantStatus, number>>;

  return {
    online: counts.PUBLISHED ?? 0,
    moderation: counts.MODERATION ?? 0,
    errors: counts.ERROR ?? 0,
    removed: counts.REMOVED ?? 0,
    pending: (counts.READY ?? 0) + (counts.UPLOADED ?? 0),
    drafts: counts.DRAFT ?? 0,
    total: grouped.reduce((sum, item) => sum + item._count.status, 0)
  };
}
