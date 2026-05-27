import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db";
import { env, resolveUploadDir } from "@/server/config/env";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function saveVariantPhoto(variantId: string, file: File) {
  if (!allowedTypes.has(file.type)) {
    throw new Error("Поддерживаются только JPG, PNG и WebP изображения.");
  }

  const ext = file.type === "image/png" ? ".png" : file.type === "image/webp" ? ".webp" : ".jpg";
  const filename = `${variantId}-${Date.now()}-${crypto.randomUUID()}${ext}`;
  const uploadDir = resolveUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const absolutePath = path.join(uploadDir, filename);
  await fs.writeFile(absolutePath, buffer);

  const photoCount = await prisma.photo.count({ where: { variantId } });
  const publicUrl = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/uploads/${filename}`;

  const photo = await prisma.photo.create({
    data: {
      variantId,
      path: absolutePath,
      publicUrl,
      sortOrder: photoCount
    }
  });

  await prisma.actionLog.create({
    data: {
      message: "Variant photo uploaded",
      context: { variantId, photoId: photo.id }
    }
  });

  return photo;
}

export async function deletePhoto(id: string) {
  const photo = await prisma.photo.findUniqueOrThrow({ where: { id } });
  await prisma.photo.delete({ where: { id } });

  const remainingReferences = await prisma.photo.count({ where: { path: photo.path } });
  if (remainingReferences === 0) {
    try {
      await fs.unlink(photo.path);
    } catch {
      // Missing files are not fatal for catalog state.
    }
  }

  await prisma.actionLog.create({
    data: { message: "Variant photo deleted", context: { photoId: id } }
  });
}
