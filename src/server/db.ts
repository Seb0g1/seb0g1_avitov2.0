import { PrismaClient } from "@prisma/client";
import { currentActorId } from "@/server/modules/auth/actor";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prismaClient;
}

export const prisma = prismaClient.$extends({
  query: {
    actionLog: {
      create({ args, query }) {
        const actorId = currentActorId();
        if (actorId && args.data && !("actorId" in args.data) && !("actor" in args.data)) {
          args.data = { ...(args.data as Record<string, unknown>), actorId } as typeof args.data;
        }
        return query(args);
      }
    }
  }
});
