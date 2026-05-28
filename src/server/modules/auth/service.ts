import bcrypt from "bcryptjs";
import { prisma } from "@/server/db";
import { env } from "@/server/config/env";
import { signSession } from "./session";

export async function authenticateAdmin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && !user.isActive) {
    return null;
  }

  const fallbackHash = env.ADMIN_PASSWORD_HASH?.startsWith("$2")
    ? env.ADMIN_PASSWORD_HASH
    : undefined;
  const canUseFallbackAdmin = !user && email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  const candidateHash = user?.passwordHash ?? (canUseFallbackAdmin ? fallbackHash : undefined);

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
        passwordHash: candidateHash,
        name: "Администратор",
        role: "ADMIN",
        lastLoginAt: new Date()
      }
    }));
  const updated =
    user
      ? await prisma.user.update({
          where: { id: persisted.id },
          data: { lastLoginAt: new Date() }
        })
      : persisted;

  const token = await signSession({
    id: updated.id,
    email: updated.email,
    role: updated.role,
    name: updated.name
  });
  return {
    user: { id: updated.id, email: updated.email, role: updated.role, name: updated.name },
    token
  };
}
