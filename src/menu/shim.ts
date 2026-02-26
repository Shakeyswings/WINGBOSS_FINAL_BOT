import type { MenuBundleV1 } from "./schema.ts";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "x";
}

function splitTokenAndName(display: string): { token: string; name_en: string } {
  const parts = display.trim().split(/\s+/);
  if (parts.length <= 1) return { token: display.trim(), name_en: display.trim() };
  return { token: parts[0]!, name_en: parts.slice(1).join(" ") };
}

/**
 * Accepts:
 * - New v1 bundle: { bundle_version:"v1", brand, meta, heat_tiers, catalog... }
 * - Old "bundle" export: { version, meta:{restaurant_name,slogan,usd_to_khr...}, rules:{spice_tiers...}, categories:[{id,label...}], flavors:{classic:[...], dry_rub:[...], ...} }
 * - Old "single-file" export: { meta:{version,generated...}, rules, pricing, combos, flavor_counts, in_house_only_flavor_ids }
 */
export function shimToV1(raw: any): MenuBundleV1 {
  if (raw?.bundle_version === "v1") return raw as MenuBundleV1;

  const usdToKhr =
    Number(raw?.brand?.usd_to_khr ?? raw?.meta?.usd_to_khr ?? raw?.meta?.usd_to_khr_rate ?? 4100) || 4100;

  const brandName = raw?.brand?.name ?? raw?.meta?.restaurant_name ?? "WING⚡BOSS";
  const slogan = raw?.brand?.slogan ?? raw?.meta?.slogan ?? "Hand-Cut Daily • Never Frozen";
  const generated = raw?.meta?.generated_at ?? raw?.meta?.generated ?? new Date().toISOString();

  // Heat tiers
  const spice = raw?.rules?.spice_tiers;
  const heat_tiers =
    Array.isArray(spice) && spice.length
      ? spice.map((t: any, i: number) => ({
          id: String(t.id),
          label: `${t.label ?? t.id} ${t.icon ?? ""}`.trim(),
          price_delta_usd: Number(t.price ?? t.price_delta_usd ?? 0),
          rank: i
        }))
      : [{ id: "original", label: "Original 🚫", price_delta_usd: 0, rank: 0 }];

  // Categories: old exports store only label like "🍗 Wings • Classic"
  const catsRaw = raw?.catalog?.categories ?? raw?.categories ?? [];
  const categories = (Array.isArray(catsRaw) ? catsRaw : []).map((c: any) => {
    const label = String(c.name_en ?? c.label ?? c.name ?? "Menu");
    const m = label.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation})\s*(.*)$/u);
    const emoji = c.emoji ?? (m ? m[1] : "📋");
    const name_en = c.name_en ?? (m ? m[2] : label);
    return { id: String(c.id ?? slug(name_en)), emoji: String(emoji), name_en: String(name_en).trim(), items: [] };
  });
  if (categories.length === 0) categories.push({ id: "menu", emoji: "📋", name_en: "Menu", items: [] });

  // Flavors: old bundle export stores grouped dict: {classic:[...], dry_rub:[...]}
  const inHouseIds: string[] = raw?.in_house_only_flavor_ids ?? raw?.rules?.in_house_only_flavor_ids ?? [];
  const flavorsGrouped = raw?.catalog?.flavors ?? raw?.flavors ?? {};
  const flat: any[] = [];
  if (Array.isArray(flavorsGrouped)) {
    for (const f of flavorsGrouped) flat.push(f);
  } else if (flavorsGrouped && typeof flavorsGrouped === "object") {
    for (const [groupKey, arr] of Object.entries(flavorsGrouped)) {
      if (!Array.isArray(arr)) continue;
      for (const f of arr) flat.push({ ...f, __group: groupKey });
    }
  }

  const flavors = flat.map((f: any) => {
    const display = String(f.display ?? f.name_en ?? f.name ?? f.code ?? "Flavor");
    const { token, name_en } = splitTokenAndName(display);
    const group = String(f.__group ?? "");
    const isDry = group === "dry_rub" || String(f.family ?? "").toLowerCase().includes("dry");
    const code = String(f.code ?? f.id ?? slug(name_en));
    const id = String(f.id ?? `f_${code}_${slug(name_en)}`);
    const in_house_only = inHouseIds.includes(String(f.code ?? "")) || Boolean(f.in_house_only);
    return {
      id,
      token,
      name_en,
      family: String(f.family ?? group ?? "classic"),
      is_dry_rub: isDry,
      dry_rub_icon: isDry ? "🌵" : undefined,
      in_house_only,
      heat_cap: "extreme"
    };
  });

  return {
    bundle_version: "v1",
    brand: {
      name: String(brandName),
      slogan: String(slogan),
      currency_canonical: "USD",
      currency_alt: "KHR",
      usd_to_khr: usdToKhr
    },
    meta: {
      generated_at: String(generated),
      notes: "shimmed from legacy export"
    },
    heat_tiers,
    option_groups: [],
    catalog: { categories, flavors }
  };
}
