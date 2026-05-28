import { describe, expect, it } from "vitest";
import {
  collectMailCloudDropProducts,
  parseDropInfo,
  parseWebDavEntries,
  type MailCloudClient,
  type MailCloudEntry
} from "./mailCloudDrop";

function folder(path: string): MailCloudEntry {
  return {
    name: path.split("/").filter(Boolean).pop() ?? path,
    path,
    isDirectory: true,
    contentType: null,
    contentLength: null
  };
}

function file(path: string, contentType = "image/jpeg"): MailCloudEntry {
  return {
    name: path.split("/").filter(Boolean).pop() ?? path,
    path,
    isDirectory: false,
    contentType,
    contentLength: 10
  };
}

function mockClient(input: {
  entries: Record<string, MailCloudEntry[]>;
  texts?: Record<string, string>;
}): MailCloudClient {
  return {
    async listDirectory(path) {
      return input.entries[path] ?? [];
    },
    async readText(path) {
      return input.texts?.[path] ?? "";
    },
    async readFile() {
      return { buffer: Buffer.from("image"), mimeType: "image/jpeg" };
    }
  };
}

describe("Mail Cloud drop import parsing", () => {
  it("parses Russian info.txt fields", () => {
    expect(
      parseDropInfo("Ссылка: https://t.me/RollyOpt/4158\nЦена: 5 499\nЦвет: Чёрный\n")
    ).toMatchObject({
      supplierUrl: "https://t.me/RollyOpt/4158",
      price: 5499,
      color: "Чёрный",
      warnings: []
    });
  });

  it("warns on invalid prices and allows missing color", () => {
    const info = parseDropInfo("Ссылка: https://t.me/RollyOpt/4158\nЦена: дорого\n");

    expect(info.color).toBeNull();
    expect(info.price).toBeNull();
    expect(info.warnings).toEqual(["Неверная цена: дорого"]);
  });

  it("parses WebDAV directory responses", () => {
    const xml = `<?xml version="1.0"?>
      <d:multistatus xmlns:d="DAV:">
        <d:response>
          <d:href>/ДРОПЧИК/28.05.2026/</d:href>
          <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat>
        </d:response>
        <d:response>
          <d:href>/ДРОПЧИК/28.05.2026/худи/</d:href>
          <d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat>
        </d:response>
        <d:response>
          <d:href>/ДРОПЧИК/28.05.2026/photo.jpg</d:href>
          <d:propstat><d:prop><d:getcontenttype>image/jpeg</d:getcontenttype><d:getcontentlength>10</d:getcontentlength></d:prop></d:propstat>
        </d:response>
      </d:multistatus>`;

    expect(parseWebDavEntries(xml, "/ДРОПЧИК/28.05.2026")).toEqual([
      expect.objectContaining({ name: "худи", isDirectory: true }),
      expect.objectContaining({ name: "photo.jpg", isDirectory: false, contentType: "image/jpeg" })
    ]);
  });

  it("collects products with color folders and info overrides", async () => {
    const root = "/ДРОПЧИК/28.05.2026";
    const categoryPath = `${root}/худи`;
    const productPath = `${categoryPath}/ЗипХуди Vetements Gun Club 169`;
    const blackPath = `${productPath}/черный`;
    const whitePath = `${productPath}/белый`;
    const client = mockClient({
      entries: {
        [root]: [folder(categoryPath)],
        [categoryPath]: [folder(productPath)],
        [productPath]: [
          file(`${productPath}/инфа.txt`, "text/plain"),
          folder(blackPath),
          folder(whitePath)
        ],
        [blackPath]: [
          file(`${blackPath}/01.jpg`),
          file(`${blackPath}/инфа.txt`, "text/plain")
        ],
        [whitePath]: [file(`${whitePath}/01.webp`, "image/webp")]
      },
      texts: {
        [`${productPath}/инфа.txt`]: "Ссылка: https://t.me/RollyOpt/4158\nЦена: 5499\n",
        [`${blackPath}/инфа.txt`]: "Цена: 5999\nЦвет: Чёрный\n"
      }
    });

    const result = await collectMailCloudDropProducts({ client, date: "28.05.2026", rootPath: "/ДРОПЧИК" });

    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      title: "ЗипХуди Vetements Gun Club 169",
      categoryName: "худи",
      productPath
    });
    expect(result.products[0].variants).toEqual([
      expect.objectContaining({ color: "Чёрный", price: 5999, photos: [expect.objectContaining({ name: "01.jpg" })] }),
      expect.objectContaining({ color: "Белый", price: 5499, photos: [expect.objectContaining({ name: "01.webp" })] })
    ]);
  });

  it("collects a single variant when there are no color folders", async () => {
    const root = "/ДРОПЧИК/28.05.2026";
    const categoryPath = `${root}/футболки`;
    const productPath = `${categoryPath}/Футболка Test`;
    const client = mockClient({
      entries: {
        [root]: [folder(categoryPath)],
        [categoryPath]: [folder(productPath)],
        [productPath]: [
          file(`${productPath}/инфа.txt`, "text/plain"),
          file(`${productPath}/2.jpg`),
          file(`${productPath}/1.jpg`)
        ]
      },
      texts: {
        [`${productPath}/инфа.txt`]: "Цена: 1999\n"
      }
    });

    const result = await collectMailCloudDropProducts({ client, date: "28.05.2026", rootPath: "/ДРОПЧИК" });

    expect(result.products[0].variants).toEqual([
      expect.objectContaining({
        color: "Не указан",
        price: 1999,
        photos: [
          expect.objectContaining({ name: "1.jpg" }),
          expect.objectContaining({ name: "2.jpg" })
        ]
      })
    ]);
  });
});
