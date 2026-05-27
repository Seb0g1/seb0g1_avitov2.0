import { describe, expect, it } from "vitest";
import { createProductWithVariantsSchema } from "./schemas";

describe("createProductWithVariantsSchema", () => {
  it("accepts clothing color groups for multi listings", () => {
    const parsed = createProductWithVariantsSchema.parse({
      title: "Nike Stussy",
      baseCategory: "Одежда, обувь, аксессуары",
      price: "12990",
      quantity: 2,
      colorGroups: [
        {
          color: "Белый",
          sizes: ["46 (S)", "48 (M)", "50 (L)", "54 (XL)", "56 (2XL)"]
        },
        {
          color: "Черный",
          sizes: ["46 (S)", "48 (M)", "50 (L)", "54 (XL)", "56 (2XL)"]
        }
      ]
    });

    expect(parsed.colorGroups).toHaveLength(2);
    expect(parsed.colorGroups?.flatMap((group) => group.sizes)).toHaveLength(10);
  });

  it("defaults legacy new variants to draft", () => {
    const parsed = createProductWithVariantsSchema.parse({
      title: "Nike Stussy",
      baseCategory: "Одежда, обувь, аксессуары",
      variants: [
        {
          title: "Nike Stussy Black M",
          color: "Black",
          size: "M",
          price: "12990",
          quantity: 2
        }
      ]
    });

    expect(parsed.variants?.[0].status).toBe("DRAFT");
  });

  it("requires at least one color group or variant", () => {
    expect(() =>
      createProductWithVariantsSchema.parse({
        title: "Nike Stussy",
        baseCategory: "Одежда, обувь, аксессуары",
        variants: []
      })
    ).toThrow();
  });
});
