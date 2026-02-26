import fs from "node:fs/promises";
import { MenuBundleV1Schema, type MenuBundleV1 } from "./schema.ts";
import { shimToV1 } from "./shim.ts";

let cached: { path: string; mtimeMs: number; menu: MenuBundleV1 } | null = null;

export async function loadMenu(path: string): Promise<MenuBundleV1> {
  const stat = await fs.stat(path);
  if (cached && cached.path === path && cached.mtimeMs === stat.mtimeMs) return cached.menu;

  const rawText = await fs.readFile(path, "utf-8");
  const rawJson = JSON.parse(rawText);

  const v1 = shimToV1(rawJson);
  const parsed = MenuBundleV1Schema.safeParse(v1);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Menu invalid:\n${msg}`);
  }

  cached = { path, mtimeMs: stat.mtimeMs, menu: parsed.data };
  return parsed.data;
}
