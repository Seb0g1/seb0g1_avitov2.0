import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db";
import { env, resolveUploadDir } from "@/server/config/env";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromMimeType(type: string) {
  return type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
}

export async function saveVariantPhotoBuffer(input: {
  variantId: string;
  buffer: Buffer;
  mimeType: string;
  sourceName?: string;
  logMessage?: string;
}) {
  if (!allowedTypes.has(input.mimeType)) {
    throw new Error("Поддерживаются только JPG, PNG и WebP изображения.");
  }

  const ext = extensionFromMimeType(input.mimeType);
  const filename = `${input.variantId}-${Date.now()}-${crypto.randomUUID()}${ext}`;
  const uploadDir = resolveUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });

  const absolutePath = path.join(uploadDir, filename);
  await fs.writeFile(absolutePath, input.buffer);

  const photoCount = await prisma.photo.count({ where: { variantId: input.variantId } });
  const publicUrl = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/uploads/${filename}`;

  const photo = await prisma.photo.create({
    data: {
      variantId: input.variantId,
      path: absolutePath,
      publicUrl,
      sortOrder: photoCount
    }
  });

  await prisma.actionLog.create({
    data: {
      message: input.logMessage ?? "Variant photo uploaded",
      context: { variantId: input.variantId, photoId: photo.id, sourceName: input.sourceName }
    }
  });

  return photo;
}

export async function saveVariantPhoto(variantId: string, file: File) {
  return saveVariantPhotoBuffer({
    variantId,
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    sourceName: file.name
  });
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
