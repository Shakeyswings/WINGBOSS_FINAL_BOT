import fs from "node:fs/promises";
import { MenuBundleV1Schema, type MenuBundleV1 } from "./schema.ts";
import { shimToV1 } from "./shim.ts";

let cached: { path: string; mtimeMs: number; menu: MenuBundleV1 } | null = null;

/**
 * Load and validate menu bundle from file
 * @param path - Primary menu file path
 * @param fallbackPath - Optional fallback menu file path (used if primary doesn't exist)
 * @returns Parsed and validated menu bundle
 * @throws Error if menu validation fails
 */
export async function loadMenu(path: string, fallbackPath?: string): Promise<MenuBundleV1> {
  let filePath = path;
  let stat;

  // Try primary path first
  try {
    stat = await fs.stat(path);
  } catch (e) {
    // If primary fails and fallback exists, try fallback
    if (fallbackPath) {
      console.warn(`⚠️ Primary menu path not found: ${path}, attempting fallback: ${fallbackPath}`);
      try {
        stat = await fs.stat(fallbackPath);
        filePath = fallbackPath;
      } catch (fallbackError) {
        throw new Error(`❌ Menu file not found - Primary: ${path}, Fallback: ${fallbackPath}`);
      }
    } else {
      throw new Error(`❌ Menu file not found: ${path}`);
    }
  }

  // Check cache
  if (cached && cached.path === filePath && cached.mtimeMs === stat.mtimeMs) {
    return cached.menu;
  }

  const rawText = await fs.readFile(filePath, "utf-8");
  const rawJson = JSON.parse(rawText);

  const v1 = shimToV1(rawJson);
  const parsed = MenuBundleV1Schema.safeParse(v1);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Menu invalid:\n${msg}`);
  }

  cached = { path: filePath, mtimeMs: stat.mtimeMs, menu: parsed.data };
  return parsed.data;
}
