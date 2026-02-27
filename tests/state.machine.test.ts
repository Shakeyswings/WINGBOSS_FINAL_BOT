import { describe, it, expect } from "vitest";
import { shimToV1 } from "../src/menu/shim.ts";

describe("shim", () => {
  it("can shim legacy format", () => {
    const legacy = { meta: { restaurant_name: "W", slogan: "S", generated: "2026" }, rules: { spice_tiers: { Original: 0 } }, pricing: { bone_in: { "6": 1 }, boneless: { "8": 2 } }, categories: [{ id: "c", label: "🍗 Wings" }], flavors: { classic: [{ code: "1", display: "1️⃣ Buffalo", family: "Buffalo" }] } };
    const v1 = shimToV1(legacy);
    expect(v1.bundle_version).toBe("v1");
    expect(v1.catalog.categories.length).toBeGreaterThan(0);
  });
});
