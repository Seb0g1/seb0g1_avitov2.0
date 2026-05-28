import type { JobStatus, JobType, LogLevel, PublicationMode, UserRole, VariantStatus } from "@prisma/client";

export type PhotoDto = {
  id: string;
  publicUrl: string;
  sortOrder: number;
};

export type VideoDto = {
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
  videos: VideoDto[];
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
  status: VariantStatus;
  reasons: FeedSkipReason[];
};

export type FeedDiagnosticsDto = {
  totalVariants: number;
  readyRows: number;
  exportSkippedRows: number;
  actionableSkippedRows: number;
  summary: Record<FeedSkipReason, number>;
  actionableSummary: Record<FeedSkipReason, number>;
  skipped: FeedSkipDto[];
  actionableSkipped: FeedSkipDto[];
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
  result: unknown | null;
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

export type CurrentUserDto = {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
};

export type ThemeMode = "white" | "black" | "pink" | "blue";
export type CatalogViewMode = "table" | "cards";
export type DashboardPeriod = "today" | "7d" | "30d" | "all";

export type UserPreferencesDto = {
  themeMode: ThemeMode;
  catalogFilters: {
    search: string;
    color: string;
    size: string;
    status: VariantStatus | "";
    category: string;
    supplier: string;
    withoutSupplier: boolean;
    withoutPhotos: boolean;
    xmlIssues: boolean;
  };
  catalogViewMode: CatalogViewMode;
  catalogSort: string;
  dashboardPeriod: DashboardPeriod;
};

export type EmployeeDto = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferencesDto;
};

export type EmployeeStatsDto = {
  employee: EmployeeDto;
  actions: number;
  productsCreated: number;
  productsUpdated: number;
  variantsCreated: number;
  variantsUpdated: number;
  imports: number;
  publications: number;
  errors: number;
};

export type MailCloudPreviewFileDto = {
  name: string;
  path: string;
  previewUrl: string;
  contentType: string | null;
  contentLength: number | null;
};

export type MailCloudPreviewProductDto = {
  title: string;
  date: string;
  categoryName: string;
  categoryPath: string;
  productPath: string;
  productFolderName: string;
  existing: boolean;
  info: {
    supplierUrl: string | null;
    price: number | null;
    color: string | null;
    warnings: string[];
  };
  infoText: string | null;
  variants: Array<{
    title: string;
    color: string;
    price: number;
    supplierUrl: string | null;
    infoText: string | null;
    sourcePath: string;
    photos: MailCloudPreviewFileDto[];
    videos: MailCloudPreviewFileDto[];
  }>;
};

export type MailCloudPreviewDto = {
  date: string;
  products: MailCloudPreviewProductDto[];
  categories: Array<{
    name: string;
    path: string;
    products: MailCloudPreviewProductDto[];
  }>;
  warnings: string[];
};
