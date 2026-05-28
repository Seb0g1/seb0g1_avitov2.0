import { Prisma, VariantStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";

export const themeModes = ["white", "black", "pink", "blue"] as const;
export const catalogViewModes = ["table", "cards"] as const;
export const dashboardPeriods = ["today", "7d", "30d", "all"] as const;

export type ThemeMode = (typeof themeModes)[number];
export type CatalogViewMode = (typeof catalogViewModes)[number];
export type DashboardPeriod = (typeof dashboardPeriods)[number];

export const catalogFiltersSchema = z.object({
  search: z.string().optional().default(""),
  color: z.string().optional().default(""),
  size: z.string().optional().default(""),
  status: z.nativeEnum(VariantStatus).optional().or(z.literal("")).default(""),
  category: z.string().optional().default(""),
  supplier: z.string().optional().default(""),
  withoutSupplier: z.boolean().optional().default(false),
  withoutPhotos: z.boolean().optional().default(false),
  xmlIssues: z.boolean().optional().default(false)
});

export const userPreferencesSchema = z.object({
  themeMode: z.enum(themeModes).default("white"),
  catalogFilters: catalogFiltersSchema.default({}),
  catalogViewMode: z.enum(catalogViewModes).default("table"),
  catalogSort: z.string().default("updated-desc"),
  dashboardPeriod: z.enum(dashboardPeriods).default("7d")
});

export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

const preferencesPatchSchema = userPreferencesSchema.deepPartial();

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeUserPreferences(value: unknown): UserPreferences {
  return userPreferencesSchema.parse(value ?? {});
}

function mergePreferences(current: UserPreferences, patch: unknown): UserPreferences {
  const parsedPatch = preferencesPatchSchema.parse(patch);
  const patchRecord = asRecord(parsedPatch);
  return normalizeUserPreferences({
    ...current,
    ...patchRecord,
    catalogFilters: {
      ...current.catalogFilters,
      ...asRecord(patchRecord.catalogFilters)
    }
  });
}

export async function getUserPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });
  return normalizeUserPreferences(user?.preferences);
}

export async function updateUserPreferences(userId: string, patch: unknown) {
  const current = await getUserPreferences(userId);
  const next = mergePreferences(current, patch);
  await prisma.user.update({
    where: { id: userId },
    data: { preferences: next as Prisma.InputJsonValue }
  });
  return next;
}
