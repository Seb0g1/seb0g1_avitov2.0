import { Queue } from "bullmq";
import { getBullMqConnection } from "@/server/redis";
import type { MailCloudImportPayload, PublicationPayload, StatusSyncPayload } from "./types";

export const publicationQueue = new Queue<PublicationPayload, unknown, string>("publication", {
  connection: getBullMqConnection()
});

export const exportQueue = new Queue("exports", {
  connection: getBullMqConnection()
});

export const statusSyncQueue = new Queue<StatusSyncPayload, unknown, string>("statusSync", {
  connection: getBullMqConnection()
});

export const mailCloudImportQueue = new Queue<MailCloudImportPayload, unknown, string>("mailCloudImport", {
  connection: getBullMqConnection()
});

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 1000
  },
  removeOnComplete: 100,
  removeOnFail: 100
};
