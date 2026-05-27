import "@/server/loadEnv";
import { Worker } from "bullmq";
import { getBullMqConnection } from "@/server/redis";
import { processPublicationJob, processStatusSyncJob } from "@/server/modules/jobs/handlers";
import { scheduleStatusSync } from "@/server/modules/jobs/service";
import type { PublicationPayload, StatusSyncPayload } from "@/server/modules/jobs/types";

async function main() {
  await scheduleStatusSync();

  const publicationWorker = new Worker<PublicationPayload>(
    "publication",
    async (job) => processPublicationJob(job.data),
    { connection: getBullMqConnection() }
  );

  const statusWorker = new Worker<StatusSyncPayload>(
    "statusSync",
    async (job) => processStatusSyncJob(job.data),
    { connection: getBullMqConnection() }
  );

  for (const worker of [publicationWorker, statusWorker]) {
    worker.on("failed", (job, error) => {
      console.error(`Job ${job?.name ?? "unknown"} failed:`, error.message);
    });
  }

  console.log("Avito Catalog worker started");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
