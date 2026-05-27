import { describe, expect, it } from "vitest";
import { VariantStatus } from "@prisma/client";
import {
  getFeedValidationReasons,
  isActionableFeedStatus,
  normalizeFeedSize
} from "./feedRows";

describe("feed row validation", () => {
  it("normalizes Avito clothing sizes", () => {
    expect(normalizeFeedSize("S")).toBe("46 (S)");
    expect(normalizeFeedSize("M")).toBe("48 (M)");
    expect(normalizeFeedSize("L")).toBe("50 (L)");
    expect(normalizeFeedSize("XL")).toBe("54 (XL)");
    expect(normalizeFeedSize("XXL")).toBe("56 (XXL)");
    expect(normalizeFeedSize("2XL")).toBe("56 (XXL)");
    expect(normalizeFeedSize("56 (2XL)")).toBe("56 (XXL)");
    expect(normalizeFeedSize("XS")).toBe("42 (XS)");
    expect(normalizeFeedSize("3XL")).toBe("60 (3XL)");
    expect(normalizeFeedSize("one size")).toBe("One size");
  });

  it("rejects unsupported or empty sizes", () => {
    expect(normalizeFeedSize("Не указан")).toBeNull();
  });

  it("skips rows without photos", () => {
    expect(
      getFeedValidationReasons({
        size: "48 (M)",
        photos: [],
        price: 2199,
        quantity: 1,
        geoReady: true
      })
    ).toContain("нет фото");
  });

  it("skips rows without exact geo", () => {
    expect(
      getFeedValidationReasons({
        size: "48 (M)",
        photos: ["https://example.com/photo.jpg"],
        price: 2199,
        quantity: 1,
        geoReady: false
      })
    ).toContain("нет гео");
  });

  it("does not treat normal Russian text as damaged encoding", () => {
    expect(
      getFeedValidationReasons({
        size: "48 (M)",
        photos: ["https://example.com/photo.jpg"],
        price: 2199,
        quantity: 1,
        geoReady: true,
        damagedValues: ["Футболка Nike x Stussy"]
      })
    ).not.toContain("битая кодировка");
  });

  it("treats replacement characters as damaged encoding", () => {
    expect(
      getFeedValidationReasons({
        size: "48 (M)",
        photos: ["https://example.com/photo.jpg"],
        price: 2199,
        quantity: 1,
        geoReady: true,
        damagedValues: ["Футболка � Nike"]
      })
    ).toContain("битая кодировка");
  });

  it("limits catalog actionable diagnostics to draft and ready variants", () => {
    expect(isActionableFeedStatus(VariantStatus.DRAFT)).toBe(true);
    expect(isActionableFeedStatus(VariantStatus.READY)).toBe(true);
    expect(isActionableFeedStatus(VariantStatus.PUBLISHED)).toBe(false);
    expect(isActionableFeedStatus(VariantStatus.UPLOADED)).toBe(false);
    expect(isActionableFeedStatus(VariantStatus.MODERATION)).toBe(false);
  });
});
