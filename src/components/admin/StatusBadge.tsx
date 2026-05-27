import type { VariantStatus } from "@prisma/client";

export const variantStatusLabels: Record<VariantStatus, string> = {
  DRAFT: "Черновик",
  READY: "Готово",
  UPLOADED: "Загружено",
  ERROR: "Ошибка",
  MODERATION: "На модерации",
  PUBLISHED: "Онлайн",
  REMOVED: "Снято"
};

export function StatusBadge({ status }: { status: VariantStatus }) {
  return <span className={`status ${status}`}>{variantStatusLabels[status]}</span>;
}
