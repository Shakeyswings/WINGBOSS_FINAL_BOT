import { describe, it, expect } from "vitest";
import { atomicWriteJson, readJsonOrInit } from "../src/repos/local/atomic_json.ts";
import fs from "node:fs/promises";

describe("atomicWriteJson", () => {
  it("writes and reads JSON", async () => {
    const p = "./data/_test_atomic.json";
    await atomicWriteJson(p, { ok: true });
    const v = await readJsonOrInit(p, { ok: false });
    expect(v).toEqual({ ok: true });
    await fs.rm(p, { force: true });
  });
});
