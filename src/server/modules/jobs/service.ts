import { JobType, PublicationMode } from "@prisma/client";
import { prisma } from "@/server/db";
import { processPublicationJob, processStatusSyncJob } from "./handlers";

export async function enqueuePublication(mode: PublicationMode, variantIds: string[]) {
  const dbJob = await prisma.publicationJob.create({
    data: {
      type: JobType.PUBLICATION,
      mode,
      payload: { mode, variantIds }
    }
  });

  try {
    const { defaultJobOptions, publicationQueue } = await import("./queues");
    await publicationQueue.add(
      "publish",
      { jobId: dbJob.id, mode, variantIds },
      defaultJobOptions
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      await processPublicationJob({ jobId: dbJob.id, mode, variantIds });
    } else {
      throw error;
    }
  }

  return dbJob;
}

export async function enqueueStatusSync(reportText?: string) {
  const dbJob = await prisma.publicationJob.create({
    data: {
      type: JobType.STATUS_SYNC,
      payload: { reportText: reportText ? "[inline-report]" : undefined }
    }
  });

  try {
    const { defaultJobOptions, statusSyncQueue } = await import("./queues");
    await statusSyncQueue.add(
      "sync-statuses",
      { jobId: dbJob.id, reportText },
      defaultJobOptions
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      await processStatusSyncJob({ jobId: dbJob.id, reportText });
    } else {
      throw error;
    }
  }

  return dbJob;
}

export async function scheduleStatusSync() {
  const { defaultJobOptions, statusSyncQueue } = await import("./queues");
  await statusSyncQueue.add(
    "sync-statuses-repeat",
    { jobId: "repeat-placeholder" },
    {
      ...defaultJobOptions,
      repeat: { every: 15 * 60 * 1000 },
      jobId: "status-sync-every-15m"
    }
  );
}

export async function listJobs() {
  return prisma.publicationJob.findMany({
    orderBy: { queuedAt: "desc" },
    take: 50
  });
}
