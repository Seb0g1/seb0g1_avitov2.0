import fs from "node:fs/promises";
import path from "node:path";
import { resolveUploadDir } from "@/server/config/env";

type Params = {
  params: Promise<{ filename: string }>;
};

function contentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "image/jpeg";
}

export async function GET(_request: Request, { params }: Params) {
  const { filename } = await params;
  const uploadDir = resolveUploadDir();
  const filePath = path.resolve(uploadDir, filename);

  if (!filePath.startsWith(uploadDir)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(filePath);
    return new Response(file, {
      headers: {
        "Content-Type": contentType(filename),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
