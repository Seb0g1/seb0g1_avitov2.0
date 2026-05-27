import { prisma } from "@/server/db";

export async function getLogs() {
  const [actions, errors] = await Promise.all([
    prisma.actionLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.errorLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
  ]);

  return { actions, errors };
}
