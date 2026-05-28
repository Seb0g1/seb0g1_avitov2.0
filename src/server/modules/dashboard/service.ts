import { VariantStatus } from "@prisma/client";
import { prisma } from "@/server/db";
import { getFeedRowsWithDiagnostics } from "@/server/modules/exports/feedRows";

function statusCount(counts: Partial<Record<VariantStatus, number>>, status: VariantStatus) {
  return counts[status] ?? 0;
}

export async function getDashboardMetrics() {
  const [grouped, totalProducts, noPhotos, noPrice, noSupplier, diagnostics, recentJobs, recentErrors, recentActions] =
    await Promise.all([
      prisma.variant.groupBy({
        by: ["status"],
        _count: { status: true }
      }),
      prisma.product.count(),
      prisma.variant.count({ where: { photos: { none: {} } } }),
      prisma.variant.count({ where: { price: { lte: 0 } } }),
      prisma.variant.count({
        where: {
          supplierUrl: null,
          product: { supplierUrl: null }
        }
      }),
      getFeedRowsWithDiagnostics(),
      prisma.publicationJob.findMany({
        orderBy: { queuedAt: "desc" },
        take: 6
      }),
      prisma.errorLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.actionLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 12,
        include: { actor: { select: { id: true, email: true, name: true, role: true } } }
      })
    ]);

  const counts = Object.fromEntries(
    grouped.map((item) => [item.status, item._count.status])
  ) as Partial<Record<VariantStatus, number>>;
  const totalVariants = grouped.reduce((sum, item) => sum + item._count.status, 0);

  return {
    online: statusCount(counts, VariantStatus.PUBLISHED),
    moderation: statusCount(counts, VariantStatus.MODERATION),
    errors: statusCount(counts, VariantStatus.ERROR),
    removed: statusCount(counts, VariantStatus.REMOVED),
    pending: statusCount(counts, VariantStatus.READY) + statusCount(counts, VariantStatus.UPLOADED),
    drafts: statusCount(counts, VariantStatus.DRAFT),
    ready: statusCount(counts, VariantStatus.READY),
    uploaded: statusCount(counts, VariantStatus.UPLOADED),
    total: totalVariants,
    totalProducts,
    totalVariants,
    noPhotos,
    noPrice,
    noSupplier,
    feed: {
      readyRows: diagnostics.readyRows,
      actionableSkippedRows: diagnostics.actionableSkippedRows,
      exportSkippedRows: diagnostics.exportSkippedRows,
      summary: diagnostics.actionableSummary
    },
    recentJobs,
    recentErrors,
    recentActions: recentActions.map((action) => ({
      id: action.id,
      message: action.message,
      level: action.level,
      createdAt: action.createdAt.toISOString(),
      actor: action.actor
        ? {
            id: action.actor.id,
            email: action.actor.email,
            name: action.actor.name,
            role: action.actor.role
          }
        : null
    }))
  };
}
