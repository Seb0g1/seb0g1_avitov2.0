import { PublicationMode } from "@prisma/client";

export type PublicationPayload = {
  jobId: string;
  mode: PublicationMode;
  variantIds: string[];
};

export type StatusSyncPayload = {
  jobId?: string;
  reportText?: string;
};

export type MailCloudImportPayload = {
  jobId: string;
  date: string;
};
