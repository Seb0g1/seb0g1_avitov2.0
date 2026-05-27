import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { FeedExportType, VariantStatus } from "@prisma/client";
import { resolveExportDir } from "@/server/config/env";
import { prisma } from "@/server/db";
import { buildAvitoCsv } from "./csv";
import { buildAvitoXlsx } from "./avitoXlsx";
import { buildCatalogExcel } from "./excel";
import { getFeedRows } from "./feedRows";
import { buildAvitoXml } from "./xml";

function checksum(content: Buffer | string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function persistExport(type: FeedExportType, content: Buffer | string, extension: string) {
  const exportDir = resolveExportDir();
  await fs.mkdir(exportDir, { recursive: true });

  const filePath = path.join(exportDir, `${type.toLowerCase()}-${Date.now()}.${extension}`);
  await fs.writeFile(filePath, content);

  return prisma.feedExport.create({
    data: {
      type,
      filePath,
      checksum: checksum(content)
    }
  });
}

export async function generateAvitoXmlExport(variantIds?: string[]) {
  const rows = await getFeedRows({ variantIds });
  const xml = buildAvitoXml(rows);
  const exportRecord = await persistExport(FeedExportType.AVITO_XML, xml, "xml");
  return { content: xml, exportRecord, rows };
}

export async function generateAvitoCsvExport(variantIds?: string[]) {
  const rows = await getFeedRows({ variantIds });
  const csv = buildAvitoCsv(rows);
  const exportRecord = await persistExport(FeedExportType.AVITO_CSV, csv, "csv");
  return { content: csv, exportRecord, rows };
}

export async function generateAvitoXlsxExport(variantIds?: string[]) {
  const rows = await getFeedRows({ variantIds });
  const buffer = await buildAvitoXlsx(rows);
  const exportRecord = await persistExport(FeedExportType.CATALOG_XLSX, buffer, "xlsx");
  return { content: buffer, exportRecord, rows };
}

export async function generateCatalogExcelExport() {
  const rows = await getFeedRows({
    statuses: [
      VariantStatus.DRAFT,
      VariantStatus.READY,
      VariantStatus.UPLOADED,
      VariantStatus.ERROR,
      VariantStatus.MODERATION,
      VariantStatus.PUBLISHED,
      VariantStatus.REMOVED
    ]
  });
  const buffer = await buildCatalogExcel(rows);
  const exportRecord = await persistExport(FeedExportType.CATALOG_XLSX, buffer, "xlsx");
  return { content: buffer, exportRecord, rows };
}
