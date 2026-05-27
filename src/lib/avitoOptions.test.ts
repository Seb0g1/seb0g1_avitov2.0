import { describe, expect, it } from "vitest";
import { normalizeAvitoColor } from "./avitoOptions";

describe("Avito options", () => {
  it("normalizes color spelling to Avito values", () => {
    expect(normalizeAvitoColor("Черный")).toBe("Чёрный");
    expect(normalizeAvitoColor("Желтый")).toBe("Жёлтый");
    expect(normalizeAvitoColor("Зеленый")).toBe("Зелёный");
    expect(normalizeAvitoColor("Белый")).toBe("Белый");
  });
});
