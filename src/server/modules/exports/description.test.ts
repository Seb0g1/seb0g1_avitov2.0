import { describe, expect, it } from "vitest";
import { sanitizeAvitoDescription } from "./description";

describe("Avito XML description sanitizer", () => {
  it("keeps only Avito-supported HTML tags", () => {
    const description = sanitizeAvitoDescription(
      '<p>Описание <span>товара</span><strong data-x="1">важно</strong><script>alert(1)</script><br /></p>'
    );

    expect(description).toBe("<p>Описание товара<strong>важно</strong><br></p>");
  });

  it("protects CDATA from closing early", () => {
    expect(sanitizeAvitoDescription("текст ]]> хвост")).toBe("текст ]]&gt; хвост");
  });
});
