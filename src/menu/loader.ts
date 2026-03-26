import fs from "node:fs/promises";
import { MenuBundleV1Schema, type MenuBundleV1 } from "./schema.ts";
import { shimToV1 } from "./shim.ts";

let cached: { path: string; mtimeMs: number; menu: MenuBundleV1 } | null = null;


function normalizeMenuRaw(raw: any) {
  if (!raw || typeof raw !== "object") return raw;

  // 1) Accept both legacy top-level flavors and newer catalog.flavors
  if (raw.flavors && raw.catalog && !raw.catalog.flavors) {
    raw.catalog.flavors = raw.flavors;
  }
  if (raw.catalog && raw.catalog.flavors && !raw.flavors) {
    raw.flavors = raw.catalog.flavors;
  }

  // 2) Backfill brand.slogan + heat tier labels if older keys were used
  if (raw.brand) {
    if (!raw.brand.slogan && raw.brand.slogan_en) raw.brand.slogan = raw.brand.slogan_en;
    if (!raw.brand.slogan) raw.brand.slogan = "Hand-Cut Daily • Never Frozen";
  }
  if (Array.isArray(raw.heat_tiers)) {
    for (const t of raw.heat_tiers) {
      if (t && !t.label && t.label_en) t.label = t.label_en;
      if (t && !t.label_en && t.label) t.label_en = t.label;
    }
  }

  // 3) Normalize item.kind values (some drafts used 'combo' etc.)
  const kindMap: Record<string, string> = {
    combo: "fixed_combo",
    fixedcombo: "fixed_combo",
    fixed_combo: "fixed_combo",
    wing: "wing_line",
    wingline: "wing_line",
    wing_line: "wing_line",
    item: "simple_item",
    simple: "simple_item",
    simple_item: "simple_item",
  };
  const fixKind = (it: any) => {
    if (!it || typeof it !== "object") return;
    if (typeof it.kind === "string") {
      const k = it.kind.toLowerCase().trim();
      it.kind = kindMap[k] ?? it.kind;
    }
  };
  try {
    const cats = raw.catalog?.categories;
    if (Array.isArray(cats)) {
      for (const c of cats) {
        if (Array.isArray(c?.items)) for (const it of c.items) fixKind(it);
      }
    }
  } catch {}

  // 4) Flavor backfill: family + is_dry_rub must exist (schema may require them)
  const fl = raw.catalog?.flavors ?? raw.flavors;
  if (Array.isArray(fl)) {
    for (const f of fl) {
      if (!f) continue;
      if (typeof f.is_dry_rub !== "boolean") f.is_dry_rub = false;
      if (!f.family) f.family = "House";
      if (!f.heat_cap) f.heat_cap = "extreme";
    }
    // keep both pointers aligned
    if (raw.catalog) raw.catalog.flavors = fl;
    raw.flavors = fl;
  }

  return raw;
}

export async function loadMenu(path: string): Promise<MenuBundleV1> {
  const stat = await fs.stat(path);
  if (cached && cached.path === path && cached.mtimeMs === stat.mtimeMs) return cached.menu;

  const rawText = await fs.readFile(path, "utf-8");
  const rawJson = normalizeMenuRaw(JSON.parse(rawText));

  const v1 = shimToV1(rawJson);
  // PRESERVE_ITEMS_RAW_TO_V1: shim may drop catalog.items; keep it for category->item resolution
  const rawAny: any = rawJson;
  const v1Any: any = v1;
  if (rawAny?.catalog?.items && !v1Any?.catalog?.items) {
    v1Any.catalog = { ...(v1Any.catalog || {}), items: rawAny.catalog.items };
  }

  const parsed = MenuBundleV1Schema.safeParse(v1);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Menu invalid:\n${msg}`);
  }

    // PRESERVE_CATALOG_ITEMS_FROM_V1: schema may strip catalog.items; keep from v1 for category->item resolution
  const __v1_keep: any = v1;
  const outAny: any = parsed.data;
  if (__v1_keep?.catalog?.items && !outAny?.catalog?.items) {
    outAny.catalog = { ...(outAny.catalog || {}), items: __v1_keep.catalog.items };
  }

// PRESERVE_CATEGORY_ITEMS_AFTER_SAFE_PARSE: schema may strip/empty category.items; merge from v1
try {
  const rawCats = (v1 as any)?.catalog?.categories;
  const menuAny: any = parsed.data as any;
  const menuCats = menuAny?.catalog?.categories;
  if (Array.isArray(rawCats) && Array.isArray(menuCats)) {
    const rawById = new Map(rawCats.map((c:any)=>[String(c?.id), c]));
    for (const c of menuCats) {
      const rc = rawById.get(String(c?.id));
      if (rc?.items && (!Array.isArray((c as any).items) || (c as any).items.length === 0)) {
        (c as any).items = rc.items;
      }
    }
  }
} catch {}

cached = { path, mtimeMs: stat.mtimeMs, menu: parsed.data };
  return parsed.data;
}


/**
 * Telegram-safe flavor list (MENU70).
 * - Source of truth: menu.catalog.flavors (fallback: menu.flavors.classic)
 * - Filters in-house-only numbers: 16,19,23,34,38,53,65,69,70
 */
export function getTelegramFlavors(menu: any) {
  const inHouseOnly = new Set([16, 19, 23, 34, 38, 53, 65, 69, 70]);

  const list =
    (menu?.catalog?.flavors && Array.isArray(menu.catalog.flavors) ? menu.catalog.flavors : null) ||
    (menu?.flavors?.classic && Array.isArray(menu.flavors.classic) ? menu.flavors.classic : null) ||
    [];

  return list
    .map((f: any, i: number) => {
      const number = Number(f?.number ?? (i + 1));
      const name = String(f?.name ?? "").trim();
      const token = String(f?.token ?? "").trim();
      const family = String(f?.family ?? "Other").trim();
      const is_dry_rub = Boolean(f?.is_dry_rub);
      const display = String(f?.display ?? (token && name ? `${token} ${name}` : name)).trim();
      return { ...f, number, name, token, family, is_dry_rub, display };
    })
    .filter((f: any) => f.number >= 1 && f.number <= 70)
    .filter((f: any) => !inHouseOnly.has(f.number))
    .filter((f: any) => f.name && f.token && f.display);
}
