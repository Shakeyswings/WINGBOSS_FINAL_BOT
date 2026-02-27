import { describe, it, expect } from "vitest";
import { MenuBundleV1Schema } from "../src/menu/schema.ts";
import bundle from "../menu/menu_bundle.v1.json";

describe("menu schema", () => {
  it("validates v1 bundle", () => {
    const ok = MenuBundleV1Schema.safeParse(bundle);
    expect(ok.success).toBe(true);
  });
});
