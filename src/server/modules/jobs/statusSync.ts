import { VariantStatus } from "@prisma/client";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import { avitoRequest } from "@/server/modules/avitoApi/client";

type StatusUpdate = {
  externalId?: string;
  avitoItemId?: string;
  status: VariantStatus;
  error?: string;
};

const statusMap: Record<string, VariantStatus> = {
  draft: VariantStatus.DRAFT,
  ready: VariantStatus.READY,
  uploaded: VariantStatus.UPLOADED,
  moderation: VariantStatus.MODERATION,
  "on moderation": VariantStatus.MODERATION,
  published: VariantStatus.PUBLISHED,
  online: VariantStatus.PUBLISHED,
  active: VariantStatus.PUBLISHED,
  removed: VariantStatus.REMOVED,
  stopped: VariantStatus.REMOVED,
  rejected: VariantStatus.ERROR,
  error: VariantStatus.ERROR
};

function normalizeStatus(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();
  return statusMap[text] ?? null;
}

function parseCsvLine(line: string) {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ";" || char === ",") && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map((value) => value.trim());
}

export function parseStatusReport(reportText: string): StatusUpdate[] {
  const trimmed = reportText.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const json = JSON.parse(trimmed) as unknown;
    const rows = Array.isArray(json)
      ? json
      : Array.isArray((json as { items?: unknown[] }).items)
        ? (json as { items: unknown[] }).items
        : [];

    return rows
      .map((row) => {
        const record = row as Record<string, unknown>;
        const status = normalizeStatus(record.status ?? record.state);
        if (!status) {
          return null;
        }
        return {
          externalId: String(record.externalId ?? record.external_id ?? record.Id ?? record.id ?? ""),
          avitoItemId: String(record.avitoItemId ?? record.item_id ?? record.itemId ?? ""),
          status,
          error: record.error ? String(record.error) : undefined
        };
      })
      .filter(Boolean) as StatusUpdate[];
  } catch {
    const [headerLine, ...lines] = trimmed.split(/\r?\n/).filter(Boolean);
    const headers = parseCsvLine(headerLine).map((header) => header.toLowerCase());
    const idIndex = headers.findIndex((header) => ["id", "externalid", "external_id"].includes(header));
    const itemIdIndex = headers.findIndex((header) =>
      ["avitoitemid", "item_id", "itemid", "avito item id"].includes(header)
    );
    const statusIndex = headers.findIndex((header) => ["status", "state", "статус"].includes(header));
    const errorIndex = headers.findIndex((header) => ["error", "ошибка"].includes(header));

    if (statusIndex < 0) {
      return [];
    }

    return lines
      .map((line) => {
        const values = parseCsvLine(line);
        const status = normalizeStatus(values[statusIndex]);
        if (!status) {
          return null;
        }
        return {
          externalId: idIndex >= 0 ? values[idIndex] : undefined,
          avitoItemId: itemIdIndex >= 0 ? values[itemIdIndex] : undefined,
          status,
          error: errorIndex >= 0 ? values[errorIndex] : undefined
        };
      })
      .filter(Boolean) as StatusUpdate[];
  }
}

async function loadStatusUpdates(reportText?: string) {
  if (reportText) {
    return parseStatusReport(reportText);
  }

  if (env.AVITO_STATUS_PATH) {
    const variants = await prisma.variant.findMany({
      where: { avitoItemId: { not: null } },
      select: { avitoItemId: true }
    });
    const ids = variants.map((variant) => variant.avitoItemId).filter(Boolean);
    if (ids.length === 0) {
      return [];
    }
    const response = await avitoRequest<unknown>(env.AVITO_STATUS_PATH, {
      method: "POST",
      body: JSON.stringify({ ids })
    });
    return parseStatusReport(JSON.stringify(response));
  }

  if (env.AVITO_REPORT_URL) {
    const response = await fetch(env.AVITO_REPORT_URL);
    if (!response.ok) {
      throw new Error(`Avito report fetch failed: ${response.status}`);
    }
    return parseStatusReport(await response.text());
  }

  return [];
}

export async function syncVariantStatuses(reportText?: string) {
  const updates = await loadStatusUpdates(reportText);
  const variantsByExternalId = new Map(
    (
      await prisma.variant.findMany({
        select: { id: true, productId: true }
      })
    ).map((variant) => [`${variant.productId}-${variant.id}`, variant.id])
  );
  let updated = 0;

  for (const update of updates) {
    const externalVariantId = update.externalId
      ? variantsByExternalId.get(update.externalId) ?? update.externalId
      : undefined;
    const where = update.avitoItemId
      ? { avitoItemId: update.avitoItemId }
      : externalVariantId
        ? { id: externalVariantId }
        : null;

    if (!where) {
      continue;
    }

    const result = await prisma.variant.updateMany({
      where,
      data: {
        status: update.status,
        lastSyncedAt: new Date(),
        lastError: update.status === VariantStatus.ERROR ? update.error ?? "Avito returned error status" : null
      }
    });
    updated += result.count;
  }

  await prisma.actionLog.create({
    data: {
      message: "Variant status sync completed",
      context: { received: updates.length, updated }
    }
  });

  return { received: updates.length, updated };
}
