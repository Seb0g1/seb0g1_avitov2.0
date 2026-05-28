import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/server/db";
import { env, resolveUploadDir } from "@/server/config/env";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedVideoTypes = new Set(["video/quicktime", "video/mp4"]);

function extensionFromMimeType(type: string) {
  return type === "image/png" ? ".png" : type === "image/webp" ? ".webp" : ".jpg";
}

function videoExtensionFromMimeType(type: string) {
  return type === "video/mp4" ? ".mp4" : ".mov";
}

function videoMimeTypeFromName(name?: string) {
  const extension = path.extname(name ?? "").toLowerCase();
  if (extension === ".mp4") {
    return "video/mp4";
  }
  if (extension === ".mov") {
    return "video/quicktime";
  }
  return null;
}

function normalizeVideoMimeType(type: string, sourceName?: string) {
  if (allowedVideoTypes.has(type)) {
    return type;
  }
  return videoMimeTypeFromName(sourceName) ?? type;
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

export async function saveVariantVideo(variantId: string, file: File) {
  return saveVariantVideoBuffer({
    variantId,
    buffer: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type || videoMimeTypeFromName(file.name) || "",
    sourceName: file.name
  });
}

export async function saveVariantVideoBuffer(input: {
  variantId: string;
  buffer: Buffer;
  mimeType: string;
  sourceName?: string;
  logMessage?: string;
}) {
  const mimeType = normalizeVideoMimeType(input.mimeType, input.sourceName);
  if (!allowedVideoTypes.has(mimeType)) {
    throw new Error("Поддерживаются только MOV и MP4 видео.");
  }

  const ext = videoExtensionFromMimeType(mimeType);
  const filename = `${input.variantId}-${Date.now()}-${crypto.randomUUID()}${ext}`;
  const uploadDir = resolveUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });

  const absolutePath = path.join(uploadDir, filename);
  await fs.writeFile(absolutePath, input.buffer);

  const videoCount = await prisma.video.count({ where: { variantId: input.variantId } });
  const publicUrl = `${env.APP_PUBLIC_URL.replace(/\/$/, "")}/uploads/${filename}`;

  const video = await prisma.video.create({
    data: {
      variantId: input.variantId,
      path: absolutePath,
      publicUrl,
      sortOrder: videoCount
    }
  });

  await prisma.actionLog.create({
    data: {
      message: input.logMessage ?? "Variant video uploaded",
      context: { variantId: input.variantId, videoId: video.id, sourceName: input.sourceName }
    }
  });

  return video;
}

export async function deleteVideo(id: string) {
  const video = await prisma.video.findUniqueOrThrow({ where: { id } });
  await prisma.video.delete({ where: { id } });

  const remainingReferences = await prisma.video.count({ where: { path: video.path } });
  if (remainingReferences === 0) {
    try {
      await fs.unlink(video.path);
    } catch {
      // Missing files are not fatal for catalog state.
    }
  }

  await prisma.actionLog.create({
    data: { message: "Variant video deleted", context: { videoId: id } }
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
