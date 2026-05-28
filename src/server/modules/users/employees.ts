import bcrypt from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/server/db";
import { normalizeUserPreferences } from "./preferences";

const employeeCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(80),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole).default(UserRole.EMPLOYEE)
});

const employeeUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional()
});

const passwordSchema = z.object({
  password: z.string().min(8)
});

function serializeEmployee(user: {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  preferences?: Prisma.JsonValue | null;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    preferences: normalizeUserPreferences(user.preferences)
  };
}

export async function listEmployees() {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }]
  });
  return users.map(serializeEmployee);
}

export async function createEmployee(input: unknown) {
  const data = employeeCreateSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name,
      role: data.role,
      passwordHash,
      isActive: true,
      preferences: normalizeUserPreferences(null) as Prisma.InputJsonValue
    }
  });
  await prisma.actionLog.create({
    data: { message: "Employee created", context: { userId: user.id, role: user.role } }
  });
  return serializeEmployee(user);
}

export async function updateEmployee(id: string, input: unknown) {
  const data = employeeUpdateSchema.parse(input);
  const user = await prisma.user.update({
    where: { id },
    data
  });
  await prisma.actionLog.create({
    data: { message: "Employee updated", context: { userId: user.id, role: user.role, isActive: user.isActive } }
  });
  return serializeEmployee(user);
}

export async function updateEmployeePassword(id: string, input: unknown) {
  const data = passwordSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash }
  });
  await prisma.actionLog.create({
    data: { message: "Employee password changed", context: { userId: user.id } }
  });
  return serializeEmployee(user);
}

function periodStart(period: string) {
  if (period === "all") {
    return undefined;
  }
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const days = period === "30d" ? 30 : 7;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export async function getEmployeeStats(period = "7d") {
  const since = periodStart(period);
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true
    }
  });
  const logs = await prisma.actionLog.findMany({
    where: {
      actorId: { in: users.map((user) => user.id) },
      ...(since ? { createdAt: { gte: since } } : {})
    },
    select: { actorId: true, message: true, level: true }
  });

  return users.map((user) => {
    const userLogs = logs.filter((log) => log.actorId === user.id);
    return {
      employee: serializeEmployee(user),
      actions: userLogs.length,
      productsCreated: userLogs.filter((log) => log.message === "Product created" || log.message === "Product with variants created").length,
      productsUpdated: userLogs.filter((log) => log.message === "Product updated").length,
      variantsCreated: userLogs.filter((log) => log.message === "Variant created" || log.message === "Variant sizes expanded").length,
      variantsUpdated: userLogs.filter((log) => log.message === "Variant updated").length,
      imports: userLogs.filter((log) => log.message.toLowerCase().includes("import")).length,
      publications: userLogs.filter((log) => log.message.toLowerCase().includes("publication")).length,
      errors: userLogs.filter((log) => log.level === "ERROR").length
    };
  });
}
