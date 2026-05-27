import { describe, expect, it } from "vitest";
import { buildAvitoItemPath } from "./items";

describe("Avito item helpers", () => {
  it("builds configured unpublish paths with item and account ids", () => {
    expect(
      buildAvitoItemPath("/core/v1/accounts/{account_id}/items/{item_id}/unpublish", {
        accountId: "account 1",
        itemId: "item/2"
      })
    ).toBe("/core/v1/accounts/account%201/items/item%2F2/unpublish");
  });

  it("supports item-only path templates", () => {
    expect(buildAvitoItemPath("/items/{itemId}/close", { itemId: "123" })).toBe(
      "/items/123/close"
    );
  });
});
