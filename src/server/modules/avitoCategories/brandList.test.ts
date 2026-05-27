import { describe, expect, it } from "vitest";
import { parseAvitoFashionBrandXml } from "./brandList";

describe("Avito fashion brand list", () => {
  it("parses brand names from the official XML shape", () => {
    const brands = parseAvitoFashionBrandXml(`
      <Brendy_fashion>
        <brand name="Nike"></brand>
        <brand name="&amp; Other Stories"></brand>
        <brand name="&#39;asil"></brand>
      </Brendy_fashion>
    `);

    expect(brands).toContain("Nike");
    expect(brands).toContain("& Other Stories");
    expect(brands).toContain("'asil");
  });
});
