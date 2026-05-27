import { describe, expect, it } from "vitest";
import { VariantStatus } from "@prisma/client";
import { parseStatusReport } from "./statusSync";

describe("parseStatusReport", () => {
  it("parses CSV autoload reports", () => {
    const updates = parseStatusReport(
      [
        "Id;Status;Error",
        "product-variant-a;published;",
        "product-variant-b;rejected;Bad photos"
      ].join("\n")
    );

    expect(updates).toEqual([
      { externalId: "product-variant-a", avitoItemId: undefined, status: VariantStatus.PUBLISHED, error: "" },
      {
        externalId: "product-variant-b",
        avitoItemId: undefined,
        status: VariantStatus.ERROR,
        error: "Bad photos"
      }
    ]);
  });

  it("parses JSON status responses", () => {
    const updates = parseStatusReport(
      JSON.stringify({
        items: [
          { externalId: "product-variant-a", item_id: "123", status: "moderation" },
          { external_id: "product-variant-b", state: "removed" }
        ]
      })
    );

    expect(updates).toMatchObject([
      { externalId: "product-variant-a", avitoItemId: "123", status: VariantStatus.MODERATION },
      { externalId: "product-variant-b", status: VariantStatus.REMOVED }
    ]);
  });
});
