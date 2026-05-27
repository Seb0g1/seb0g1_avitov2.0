import { describe, expect, it } from "vitest";
import { getFeedValidationReasons, normalizeFeedSize } from "./feedRows";

describe("feed row validation", () => {
  it("normalizes Avito clothing sizes", () => {
    expect(normalizeFeedSize("S")).toBe("46 (S)");
    expect(normalizeFeedSize("M")).toBe("48 (M)");
    expect(normalizeFeedSize("L")).toBe("50 (L)");
    expect(normalizeFeedSize("XL")).toBe("54 (XL)");
    expect(normalizeFeedSize("XXL")).toBe("56 (2XL)");
    expect(normalizeFeedSize("2XL")).toBe("56 (2XL)");
  });

  it("rejects unsupported or empty sizes", () => {
    expect(normalizeFeedSize("XS")).toBeNull();
    expect(normalizeFeedSize("3XL")).toBeNull();
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
});
