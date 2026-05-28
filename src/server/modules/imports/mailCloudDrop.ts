import { Prisma, VariantStatus } from "@prisma/client";
import { convert } from "xmlbuilder2";
import { normalizeAvitoColor } from "@/lib/avitoOptions";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db";
import { supplierToPrismaData } from "@/server/modules/suppliers/moysklad";
import { saveVariantPhotoBuffer, saveVariantVideoBuffer } from "@/server/modules/variants/photos";

type WebDavObject = Record<string, unknown>;

export type MailCloudEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  contentType: string | null;
  contentLength: number | null;
};

export type MailCloudClient = {
  listDirectory(path: string): Promise<MailCloudEntry[]>;
  readText(path: string): Promise<string>;
  readFile(path: string): Promise<{ buffer: Buffer; mimeType: string | null }>;
};

export type DropInfo = {
  supplierUrl: string | null;
  price: number | null;
  color: string | null;
  warnings: string[];
};

type DropVariantDraft = {
  title: string;
  color: string;
  price: number;
  supplierUrl: string | null;
  photos: MailCloudEntry[];
  videos: MailCloudEntry[];
  sourcePath: string;
};

type DropProductDraft = {
  title: string;
  date: string;
  categoryName: string;
  categoryPath: string;
  productPath: string;
  productFolderName: string;
  info: DropInfo;
  variants: DropVariantDraft[];
};

export type MailCloudDropImportResult = {
  createdProducts: number;
  createdVariants: number;
  photosImported: number;
  videosImported: number;
  skippedExisting: number;
  warnings: string[];
};

export type MailCloudSupplierBackfillResult = {
  scannedProducts: number;
  updatedProducts: number;
  updatedVariants: number;
  skippedMissingProducts: number;
  skippedWithoutSupplierUrl: number;
  warnings: string[];
};

const infoFileName = "инфа.txt";
const unknownValue = "Не указан";
const supportedImageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const supportedVideoExtensions = new Set([".mov", ".mp4"]);
const mimeTypeByExtension: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};
const videoMimeTypeByExtension: Record<string, string> = {
  ".mov": "video/quicktime",
  ".mp4": "video/mp4"
};

function asRecord(value: unknown): WebDavObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as WebDavObject)
    : {};
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function child(record: WebDavObject, localName: string) {
  const direct = record[localName];
  if (direct !== undefined) {
    return direct;
  }
  const key = Object.keys(record).find((candidate) => candidate.split(":").pop() === localName);
  return key ? record[key] : undefined;
}

function textChild(record: WebDavObject, localName: string) {
  const value = child(record, localName);
  return typeof value === "string" ? value : null;
}

function normalizeCloudPath(path: string) {
  const value = decodeURIComponent(path).replace(/\\/g, "/").replace(/\/+/g, "/");
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/$/, "") : withLeadingSlash;
}

function joinCloudPath(...parts: string[]) {
  return normalizeCloudPath(
    parts
      .flatMap((part) => part.split("/"))
      .map((part) => part.trim())
      .filter(Boolean)
      .join("/")
  );
}

function nameFromPath(path: string) {
  const normalized = normalizeCloudPath(path);
  return normalized.split("/").filter(Boolean).pop() ?? normalized;
}

function encodeCloudPath(path: string) {
  const normalized = normalizeCloudPath(path);
  const encoded = normalized
    .split("/")
    .map((part) => (part ? encodeURIComponent(part) : ""))
    .join("/");
  return encoded || "/";
}

function cloudUrl(path: string) {
  return `${env.MAIL_CLOUD_WEBDAV_URL.replace(/\/$/, "")}${encodeCloudPath(path)}`;
}

function authHeader() {
  if (!env.MAIL_CLOUD_LOGIN || !env.MAIL_CLOUD_APP_PASSWORD) {
    throw new Error("Заполните MAIL_CLOUD_LOGIN и MAIL_CLOUD_APP_PASSWORD в .env.");
  }
  return `Basic ${Buffer.from(`${env.MAIL_CLOUD_LOGIN}:${env.MAIL_CLOUD_APP_PASSWORD}`).toString("base64")}`;
}

function imageMimeType(entry: MailCloudEntry) {
  if (entry.contentType?.startsWith("image/")) {
    return entry.contentType;
  }
  const extension = extensionFromName(entry.name);
  return mimeTypeByExtension[extension] ?? null;
}

function videoMimeType(entry: MailCloudEntry) {
  if (entry.contentType?.startsWith("video/")) {
    return entry.contentType;
  }
  const extension = extensionFromName(entry.name);
  return videoMimeTypeByExtension[extension] ?? null;
}

function extensionFromName(name: string) {
  const match = name.toLowerCase().match(/\.[^.]+$/);
  return match?.[0] ?? "";
}

function isImageEntry(entry: MailCloudEntry) {
  return !entry.isDirectory && supportedImageExtensions.has(extensionFromName(entry.name));
}

function isVideoEntry(entry: MailCloudEntry) {
  return !entry.isDirectory && supportedVideoExtensions.has(extensionFromName(entry.name));
}

function isInfoEntry(entry: MailCloudEntry) {
  return !entry.isDirectory && entry.name.toLowerCase() === infoFileName;
}

function supplierUrlFromText(value: string) {
  const match = value.match(/https?:\/\/(?:t\.me|telegram\.me|telegram\.dog)\/[^\s"'<>]+|(?:t\.me|telegram\.me|telegram\.dog)\/[^\s"'<>]+|@[a-z0-9_]{4,}/i);
  return match?.[0]?.replace(/[),.;]+$/, "") ?? null;
}

function normalizedInfoKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function sortedImages(entries: MailCloudEntry[]) {
  return entries
    .filter(isImageEntry)
    .sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true, sensitivity: "base" }));
}

function sortedVideos(entries: MailCloudEntry[]) {
  return entries
    .filter(isVideoEntry)
    .sort((a, b) => a.name.localeCompare(b.name, "ru", { numeric: true, sensitivity: "base" }));
}

function parseContentLength(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function responseProp(response: WebDavObject) {
  const propstats = asArray(child(response, "propstat") as WebDavObject | WebDavObject[] | undefined);
  for (const propstat of propstats) {
    const prop = child(asRecord(propstat), "prop");
    if (prop) {
      return asRecord(prop);
    }
  }
  return {};
}

export function parseWebDavEntries(xml: string, requestedPath: string): MailCloudEntry[] {
  const converted = convert(xml, { format: "object" });
  const multistatus = asRecord(
    child(asRecord(converted), "multistatus") ?? child(asRecord(converted), "D:multistatus")
  );
  const responses = asArray(child(multistatus, "response") as WebDavObject | WebDavObject[] | undefined);
  const normalizedRequestedPath = normalizeCloudPath(requestedPath);

  return responses.flatMap<MailCloudEntry>((response) => {
    const responseRecord = asRecord(response);
    const href = textChild(responseRecord, "href");
    if (!href) {
      return [];
    }

    const hrefPath = normalizeCloudPath(new URL(href, env.MAIL_CLOUD_WEBDAV_URL).pathname);
    if (hrefPath === normalizedRequestedPath) {
      return [];
    }

    const prop = responseProp(responseRecord);
    const resourceType = asRecord(child(prop, "resourcetype"));
    const isDirectory = Boolean(child(resourceType, "collection")) || href.endsWith("/");
    return [{
      name: nameFromPath(hrefPath),
      path: hrefPath,
      isDirectory,
      contentType: textChild(prop, "getcontenttype"),
      contentLength: parseContentLength(textChild(prop, "getcontentlength"))
    }];
  });
}

async function webDavRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(cloudUrl(path), {
    ...options,
    headers: {
      Authorization: authHeader(),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(`Mail Cloud WebDAV вернул ${response.status} для ${path}.`);
  }

  return response;
}

export function createMailCloudClient(): MailCloudClient {
  return {
    async listDirectory(path) {
      const response = await webDavRequest(path, {
        method: "PROPFIND",
        headers: { Depth: "1" }
      });
      return parseWebDavEntries(await response.text(), path);
    },
    async readText(path) {
      const response = await webDavRequest(path);
      return (await response.text()).replace(/^\uFEFF/, "");
    },
    async readFile(path) {
      const response = await webDavRequest(path);
      return {
        buffer: Buffer.from(await response.arrayBuffer()),
        mimeType: response.headers.get("content-type")?.split(";")[0]?.trim() ?? null
      };
    }
  };
}

export function parseDropInfo(text: string): DropInfo {
  const result: DropInfo = {
    supplierUrl: null,
    price: null,
    color: null,
    warnings: []
  };

  for (const rawLine of text.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const inlineSupplierUrl = supplierUrlFromText(line);
    if (inlineSupplierUrl && !result.supplierUrl) {
      result.supplierUrl = inlineSupplierUrl;
    }

    const separator = line.indexOf(":");
    if (separator === -1) {
      continue;
    }

    const key = normalizedInfoKey(line.slice(0, separator));
    const value = line.slice(separator + 1).trim();
    if (!value) {
      continue;
    }

    if (["ссылка", "link", "url", "telegram", "телеграм", "тг", "tg", "поставщик"].includes(key)) {
      result.supplierUrl = supplierUrlFromText(value) ?? value;
    } else if (["цена", "стоимость", "price"].includes(key)) {
      const parsed = Number(value.replace(/\s+/g, "").replace(",", ".").replace(/[^\d.]/g, ""));
      if (Number.isFinite(parsed) && parsed > 0) {
        result.price = parsed;
      } else {
        result.warnings.push(`Неверная цена: ${value}`);
      }
    } else if (["цвет", "color"].includes(key)) {
      result.color = normalizeAvitoColor(value) || value;
    }
  }

  return result;
}

function mergeInfo(base: DropInfo, override: DropInfo): DropInfo {
  return {
    supplierUrl: override.supplierUrl ?? base.supplierUrl,
    price: override.price ?? base.price,
    color: override.color ?? base.color,
    warnings: [...base.warnings, ...override.warnings]
  };
}

async function readInfo(client: MailCloudClient, entries: MailCloudEntry[], ownerPath: string) {
  const infoEntry = entries.find(isInfoEntry);
  if (!infoEntry) {
    return {
      info: parseDropInfo(""),
      warnings: [`Нет инфа.txt: ${ownerPath}`]
    };
  }

  const info = parseDropInfo(await client.readText(infoEntry.path));
  return {
    info,
    warnings: info.warnings.map((warning) => `${ownerPath}: ${warning}`)
  };
}

function variantColor(info: DropInfo, folderName?: string) {
  const color = info.color ?? (folderName ? normalizeAvitoColor(folderName) : "");
  return color || unknownValue;
}

async function collectProductDraft(
  client: MailCloudClient,
  input: {
    date: string;
    categoryName: string;
    categoryPath: string;
    product: MailCloudEntry;
  }
) {
  const warnings: string[] = [];
  const productEntries = await client.listDirectory(input.product.path);
  const productInfoResult = await readInfo(client, productEntries, input.product.path);
  const productInfo = productInfoResult.info;
  warnings.push(...productInfoResult.warnings);

  const colorFolders = productEntries.filter((entry) => entry.isDirectory);
  const variants: DropVariantDraft[] = [];

  if (colorFolders.length > 0) {
    for (const colorFolder of colorFolders) {
      const colorEntries = await client.listDirectory(colorFolder.path);
      const colorInfoEntry = colorEntries.find(isInfoEntry);
      const colorInfo = colorInfoEntry
        ? parseDropInfo(await client.readText(colorInfoEntry.path))
        : parseDropInfo("");
      const info = mergeInfo(productInfo, colorInfo);
      const photos = sortedImages(colorEntries);
      const videos = sortedVideos(colorEntries);
      const color = variantColor(info, colorFolder.name);
      if (!info.price) {
        warnings.push(`Нет цены: ${colorFolder.path}`);
      }
      if (photos.length === 0) {
        warnings.push(`Нет фото: ${colorFolder.path}`);
      }
      warnings.push(...info.warnings.map((warning) => `${colorFolder.path}: ${warning}`));
      variants.push({
        title: `${input.product.name} (${color})`,
        color,
        price: info.price ?? 0,
        supplierUrl: info.supplierUrl,
        photos,
        videos,
        sourcePath: colorFolder.path
      });
    }
  } else {
    const photos = sortedImages(productEntries);
    const videos = sortedVideos(productEntries);
    const color = variantColor(productInfo);
    if (!productInfo.price) {
      warnings.push(`Нет цены: ${input.product.path}`);
    }
    if (photos.length === 0) {
      warnings.push(`Нет фото: ${input.product.path}`);
    }
    variants.push({
      title: color === unknownValue ? input.product.name : `${input.product.name} (${color})`,
      color,
      price: productInfo.price ?? 0,
      supplierUrl: productInfo.supplierUrl,
      photos,
      videos,
      sourcePath: input.product.path
    });
  }

  return {
    draft: {
      title: input.product.name,
      date: input.date,
      categoryName: input.categoryName,
      categoryPath: input.categoryPath,
      productPath: input.product.path,
      productFolderName: input.product.name,
      info: productInfo,
      variants
    },
    warnings
  };
}

export async function collectMailCloudDropProducts(input: {
  client: MailCloudClient;
  date: string;
  rootPath?: string;
}) {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(input.date)) {
    throw new Error("Введите дату в формате ДД.ММ.ГГГГ, например 28.05.2026.");
  }

  const rootPath = input.rootPath ?? env.MAIL_CLOUD_ROOT_PATH;
  const datePath = joinCloudPath(rootPath, input.date);
  const warnings: string[] = [];
  const products: DropProductDraft[] = [];
  const categories = (await input.client.listDirectory(datePath)).filter((entry) => entry.isDirectory);

  for (const category of categories) {
    const productFolders = (await input.client.listDirectory(category.path)).filter((entry) => entry.isDirectory);
    for (const product of productFolders) {
      const collected = await collectProductDraft(input.client, {
        date: input.date,
        categoryName: category.name,
        categoryPath: category.path,
        product
      });
      products.push(collected.draft);
      warnings.push(...collected.warnings);
    }
  }

  return { products, warnings };
}

async function productExistsByCloudPath(productPath: string) {
  return prisma.product.findFirst({
    where: {
      avitoAttributes: {
        path: ["mailCloud", "productPath"],
        equals: productPath
      }
    },
    select: { id: true }
  });
}

async function attachPhotos(variantId: string, photos: MailCloudEntry[], client: MailCloudClient) {
  let imported = 0;
  for (const photo of photos) {
    const downloaded = await client.readFile(photo.path);
    const mimeType = downloaded.mimeType?.startsWith("image/")
      ? downloaded.mimeType
      : imageMimeType(photo);
    if (!mimeType) {
      continue;
    }
    await saveVariantPhotoBuffer({
      variantId,
      buffer: downloaded.buffer,
      mimeType,
      sourceName: photo.name,
      logMessage: "Variant photo imported from Mail Cloud"
    });
    imported += 1;
  }
  return imported;
}

async function attachVideos(variantId: string, videos: MailCloudEntry[], client: MailCloudClient) {
  let imported = 0;
  for (const video of videos) {
    const downloaded = await client.readFile(video.path);
    const mimeType = downloaded.mimeType?.startsWith("video/")
      ? downloaded.mimeType
      : videoMimeType(video);
    if (!mimeType) {
      continue;
    }
    await saveVariantVideoBuffer({
      variantId,
      buffer: downloaded.buffer,
      mimeType,
      sourceName: video.name,
      logMessage: "Variant video imported from Mail Cloud"
    });
    imported += 1;
  }
  return imported;
}

async function createImportedProduct(draft: DropProductDraft, client: MailCloudClient) {
  const productSupplierData = supplierToPrismaData({
    supplierUrl: draft.info.supplierUrl,
    supplierName: draft.info.supplierUrl ? "Telegram" : null
  });
  const product = await prisma.product.create({
    data: {
      title: draft.title,
      brand: null,
      baseCategory: env.DEFAULT_AVITO_CATEGORY,
      baseDescription: null,
      ...productSupplierData,
      avitoAttributes: {
        importSource: "mail-cloud",
        multiItemName: draft.title,
        mailCloud: {
          date: draft.date,
          categoryPath: draft.categoryPath,
          categoryName: draft.categoryName,
          productPath: draft.productPath,
          productFolderName: draft.productFolderName
        }
      } as Prisma.InputJsonValue
    }
  });

  let createdVariants = 0;
  let photosImported = 0;
  let videosImported = 0;
  for (const variantDraft of draft.variants) {
    const variantSupplierData = supplierToPrismaData({
      supplierUrl: variantDraft.supplierUrl,
      supplierName: variantDraft.supplierUrl ? "Telegram" : null
    });
    const variant = await prisma.variant.create({
      data: {
        productId: product.id,
        title: variantDraft.title,
        color: variantDraft.color,
        size: unknownValue,
        price: String(variantDraft.price),
        quantity: 1,
        description: null,
        status: VariantStatus.DRAFT,
        ...variantSupplierData
      }
    });
    createdVariants += 1;
    photosImported += await attachPhotos(variant.id, variantDraft.photos, client);
    videosImported += await attachVideos(variant.id, variantDraft.videos, client);
  }

  await prisma.actionLog.create({
    data: {
      message: "Mail Cloud drop product imported",
      context: {
        productId: product.id,
        productPath: draft.productPath,
        variantCount: createdVariants,
        photosImported,
        videosImported
      }
    }
  });

  return { createdVariants, photosImported, videosImported };
}

export async function importMailCloudDrop(date: string, client = createMailCloudClient()): Promise<MailCloudDropImportResult> {
  const collected = await collectMailCloudDropProducts({ client, date });
  const result: MailCloudDropImportResult = {
    createdProducts: 0,
    createdVariants: 0,
    photosImported: 0,
    videosImported: 0,
    skippedExisting: 0,
    warnings: [...collected.warnings]
  };

  for (const draft of collected.products) {
    if (await productExistsByCloudPath(draft.productPath)) {
      result.skippedExisting += 1;
      continue;
    }

    const created = await createImportedProduct(draft, client);
    result.createdProducts += 1;
    result.createdVariants += created.createdVariants;
    result.photosImported += created.photosImported;
    result.videosImported += created.videosImported;
  }

  await prisma.actionLog.create({
    data: {
      message: "Mail Cloud drop imported",
      context: result as unknown as Prisma.InputJsonValue
    }
  });

  return result;
}

function firstSupplierUrl(draft: DropProductDraft) {
  return draft.info.supplierUrl ?? draft.variants.find((variant) => variant.supplierUrl)?.supplierUrl ?? null;
}

export async function backfillMailCloudSupplierLinks(
  date: string,
  client = createMailCloudClient()
): Promise<MailCloudSupplierBackfillResult> {
  const collected = await collectMailCloudDropProducts({ client, date });
  const result: MailCloudSupplierBackfillResult = {
    scannedProducts: collected.products.length,
    updatedProducts: 0,
    updatedVariants: 0,
    skippedMissingProducts: 0,
    skippedWithoutSupplierUrl: 0,
    warnings: [...collected.warnings]
  };

  for (const draft of collected.products) {
    const product = await prisma.product.findFirst({
      where: {
        avitoAttributes: {
          path: ["mailCloud", "productPath"],
          equals: draft.productPath
        }
      },
      include: { variants: { select: { id: true, color: true, supplierUrl: true } } }
    });
    if (!product) {
      result.skippedMissingProducts += 1;
      continue;
    }

    const productSupplierUrl = firstSupplierUrl(draft);
    if (!productSupplierUrl) {
      result.skippedWithoutSupplierUrl += 1;
      continue;
    }

    if (!product.supplierUrl) {
      await prisma.product.update({
        where: { id: product.id },
        data: supplierToPrismaData({
          supplierUrl: productSupplierUrl,
          supplierName: "Telegram"
        })
      });
      result.updatedProducts += 1;
    }

    for (const variantDraft of draft.variants) {
      const supplierUrl = variantDraft.supplierUrl ?? productSupplierUrl;
      const variants = product.variants.filter(
        (variant) => variant.color === variantDraft.color && !variant.supplierUrl
      );
      if (variants.length === 0) {
        continue;
      }

      await prisma.variant.updateMany({
        where: { id: { in: variants.map((variant) => variant.id) } },
        data: supplierToPrismaData({
          supplierUrl,
          supplierName: "Telegram"
        })
      });
      result.updatedVariants += variants.length;
    }
  }

  await prisma.actionLog.create({
    data: {
      message: "Mail Cloud supplier links backfilled",
      context: result as unknown as Prisma.InputJsonValue
    }
  });

  return result;
}
