import { describe, expect, it } from "vitest";
import { normalizeImageMimeType } from "./photos";

describe("variant photo MIME normalization", () => {
  it("normalizes JPG MIME aliases", () => {
    expect(normalizeImageMimeType("image/jpg", "photo.jpg")).toBe("image/jpeg");
    expect(normalizeImageMimeType("image/pjpeg", "photo.jpeg")).toBe("image/jpeg");
  });

  it("falls back to the source filename when the provider sends a generic type", () => {
    expect(normalizeImageMimeType("application/octet-stream", "photo_2026-05-27_14-56-31.jpg")).toBe("image/jpeg");
    expect(normalizeImageMimeType("", "preview.webp")).toBe("image/webp");
  });
});
