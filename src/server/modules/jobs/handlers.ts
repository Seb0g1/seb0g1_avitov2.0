import { JobStatus, JobType, Prisma, PublicationMode, VariantStatus } from "@prisma/client";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import { createAvitoItem } from "@/server/modules/avitoApi/items";
import { generateAvitoCsvExport, generateAvitoXmlExport } from "@/server/modules/exports/service";
import { getFeedRows } from "@/server/modules/exports/feedRows";
import { syncVariantStatuses } from "./statusSync";
import type { PublicationPayload, StatusSyncPayload } from "./types";

export async function processPublicationJob(payload: PublicationPayload) {
  await prisma.publicationJob.update({
    where: { id: payload.jobId },
    data: { status: JobStatus.RUNNING, startedAt: new Date(), attempts: { increment: 1 } }
  });

  try {
    let result: Record<string, unknown>;

    if (payload.mode === PublicationMode.AUTOLOAD_XML) {
      const exportResult = await generateAvitoXmlExport(payload.variantIds);
      await prisma.variant.updateMany({
        where: { id: { in: exportResult.rows.map((row) => row.variantId) } },
        data: { status: VariantStatus.UPLOADED, lastPublishedAt: new Date(), lastError: null }
      });
      result = { exportId: exportResult.exportRecord.id, rows: exportResult.rows.length };
    } else if (payload.mode === PublicationMode.AUTOLOAD_CSV) {
      const exportResult = await generateAvitoCsvExport(payload.variantIds);
      await prisma.variant.updateMany({
        where: { id: { in: exportResult.rows.map((row) => row.variantId) } },
        data: { status: VariantStatus.UPLOADED, lastPublishedAt: new Date(), lastError: null }
      });
      result = { exportId: exportResult.exportRecord.id, rows: exportResult.rows.length };
    } else {
      const rows = await getFeedRows({ variantIds: payload.variantIds, statuses: [VariantStatus.READY] });
      const published: Array<{ variantId: string; avitoItemId: string | null }> = [];

      for (const row of rows) {
        const avitoItemId = await createAvitoItem({
          title: row.title,
          description: row.description,
          price: Math.round(row.price),
          category: row.category,
          address: row.address,
          contactPhone: row.contactPhone,
          externalId: row.externalId,
          images: row.photos,
          attributes: {
            brand: row.brand,
            color: row.color,
            size: row.size,
            quantity: row.quantity,
            material: row.material,
            article: row.article,
            multiItem: row.multiItem,
            multiItemGroup: row.multiItemGroup,
            condition: row.condition,
            goodsType: row.goodsType,
            region: env.STORE_REGION
          }
        });

        await prisma.variant.update({
          where: { id: row.variantId },
          data: {
            avitoItemId,
            status: VariantStatus.MODERATION,
            lastPublishedAt: new Date(),
            lastError: null
          }
        });
        published.push({ variantId: row.variantId, avitoItemId });
      }

      result = { published };
    }

    await prisma.publicationJob.update({
      where: { id: payload.jobId },
      data: {
        status: JobStatus.COMPLETED,
        result: result as Prisma.InputJsonValue,
        completedAt: new Date(),
        error: null
      }
    });
    await prisma.actionLog.create({
      data: {
        message: "Publication job completed",
        context: { jobId: payload.jobId, result } as Prisma.InputJsonValue
      }
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown publication error";
    await prisma.publicationJob.update({
      where: { id: payload.jobId },
      data: { status: JobStatus.FAILED, error: message, completedAt: new Date() }
    });
    await prisma.errorLog.create({
      data: { source: "publicationJob", message, details: { jobId: payload.jobId } }
    });
    throw error;
  }
}

export async function processStatusSyncJob(payload: StatusSyncPayload) {
  const dbJob =
    payload.jobId && payload.jobId !== "repeat-placeholder"
      ? await prisma.publicationJob.findUnique({ where: { id: payload.jobId } })
      : await prisma.publicationJob.create({
          data: {
            type: JobType.STATUS_SYNC,
            payload: { scheduled: true }
          }
        });

  if (!dbJob) {
    throw new Error(`Status sync job ${payload.jobId} was not found.`);
  }

  await prisma.publicationJob.update({
    where: { id: dbJob.id },
    data: { status: JobStatus.RUNNING, startedAt: new Date(), attempts: { increment: 1 } }
  });

  try {
    const result = await syncVariantStatuses(payload.reportText);
    await prisma.publicationJob.update({
      where: { id: dbJob.id },
      data: {
        status: JobStatus.COMPLETED,
        result,
        completedAt: new Date(),
        error: null
      }
    });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown status sync error";
    await prisma.publicationJob.update({
      where: { id: dbJob.id },
      data: { status: JobStatus.FAILED, error: message, completedAt: new Date() }
    });
    await prisma.errorLog.create({
      data: { source: "statusSyncJob", message, details: { jobId: dbJob.id } }
    });
    throw error;
  }
}
