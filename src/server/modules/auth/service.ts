import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { env } from "@/server/config/env";
import { signSession } from "./session";

export async function authenticateAdmin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const fallbackHash = env.ADMIN_PASSWORD_HASH?.startsWith("$2")
    ? env.ADMIN_PASSWORD_HASH
    : undefined;
  const candidateHash = user?.passwordHash ?? fallbackHash;

  if (!candidateHash) {
    return null;
  }

  const isValid = await bcrypt.compare(password, candidateHash);
  if (!isValid) {
    return null;
  }

  const persisted =
    user ??
    (await prisma.user.create({
      data: {
        email,
        passwordHash: candidateHash
      }
    }));

  const token = await signSession({ id: persisted.id, email: persisted.email });
  return { user: { id: persisted.id, email: persisted.email }, token };
}
