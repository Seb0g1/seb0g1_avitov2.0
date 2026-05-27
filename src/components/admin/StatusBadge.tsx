import type { VariantStatus } from "@prisma/client";

const labels: Record<VariantStatus, string> = {
  DRAFT: "Черновик",
  READY: "Готово",
  UPLOADED: "Загружено",
  ERROR: "Ошибка",
  MODERATION: "Модерация",
  PUBLISHED: "Онлайн",
  REMOVED: "Снято"
};

export function StatusBadge({ status }: { status: VariantStatus }) {
  return <span className={`status ${status}`}>{labels[status]}</span>;
}
