import type { JobStatus, JobType, LogLevel, PublicationMode, VariantStatus } from "@prisma/client";

export type PhotoDto = {
  id: string;
  publicUrl: string;
  sortOrder: number;
};

export type SupplierDto = {
  url: string | null;
  name: string | null;
  productId: string | null;
  categoryId: string | null;
  catalogToken: string | null;
  updatedAt: string | null;
};

export type VariantDto = {
  id: string;
  productId: string;
  title: string;
  color: string;
  size: string;
  price: string;
  quantity: number;
  description: string | null;
  status: VariantStatus;
  avitoItemId: string | null;
  lastError: string | null;
  lastPublishedAt: string | null;
  lastSyncedAt: string | null;
  updatedAt: string;
  supplier: SupplierDto | null;
  effectiveSupplier: SupplierDto | null;
  photos: PhotoDto[];
};

export type ProductDto = {
  id: string;
  title: string;
  brand: string | null;
  baseCategory: string;
  baseDescription: string | null;
  avitoAttributes: Record<string, unknown> | null;
  supplier: SupplierDto | null;
  createdAt: string;
  updatedAt: string;
  variants: VariantDto[];
};

export type FeedSkipReason =
  | "нет фото"
  | "неподдерживаемый размер"
  | "нет гео"
  | "битая кодировка"
  | "нет цены"
  | "нулевой остаток"
  | "дубль цвет+размер";

export type FeedSkipDto = {
  productId: string;
  variantId: string;
  title: string;
  color: string;
  size: string;
  reasons: FeedSkipReason[];
};

export type FeedDiagnosticsDto = {
  totalVariants: number;
  readyRows: number;
  skippedRows: number;
  summary: Record<FeedSkipReason, number>;
  skipped: FeedSkipDto[];
};

export type MetricsDto = {
  online: number;
  moderation: number;
  errors: number;
  removed: number;
  pending: number;
  drafts: number;
  total: number;
};

export type JobDto = {
  id: string;
  type: JobType;
  status: JobStatus;
  mode: PublicationMode | null;
  attempts: number;
  error: string | null;
  queuedAt: string;
  completedAt: string | null;
};

export type ActionLogDto = {
  id: string;
  level: LogLevel;
  message: string;
  createdAt: string;
};

export type ErrorLogDto = {
  id: string;
  source: string;
  message: string;
  createdAt: string;
};
