import type { MenuBundleV1 } from "./schema.ts";

/**
Compatibility shim:
- Accepts current legacy exports:
  A) { bundle_version:"v1", ... }  -> passthrough
  B) "single-file" export (meta/rules/pricing/flavor_counts/combos/in_house_only_flavor_ids)
  C) "bundle" export (categories[], flavors{classic/dry_rub/...}, rules.spice_tiers)
- Produces MenuBundleV1.
*/

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40) || "x";
}

function splitTokenAndName(display: string): { token: string; name_en: string } {
  const parts = display.trim().split(/\s+/);
  if (parts.length <= 1) return { token: display.trim(), name_en: display.trim() };
  return { token: parts[0]!, name_en: parts.slice(1).join(" ") };
}

export function shimToV1(raw: any): MenuBundleV1 {
  if (raw?.bundle_version === "v1") return raw as MenuBundleV1;

  const usdToKhr = Number(raw?.brand?.usd_to_khr ?? raw?.meta?.usd_to_khr ?? raw?.meta?.usd_to_khr_rate ?? 4100) || 4100;
  const brandName = raw?.brand?.name ?? raw?.meta?.restaurant_name ?? "WING⚡BOSS";
  const slogan = raw?.brand?.slogan ?? raw?.meta?.slogan ?? "Hand-Cut Daily • Never Frozen";
  const generated = raw?.meta?.generated_at ?? raw?.meta?.generated ?? new Date().toISOString();

  // Heat tiers
  const spiceMap = raw?.rules?.spice_tiers;
  const tiers = [];
  const defaultTier = [
    { id: "original", label_en: "Original", price_delta_usd: 0, rank: 0 },
    { id: "hot", label_en: "Hot", price_delta_usd: 0.25, rank: 1 },
    { id: "spicy", label_en: "Spicy", price_delta_usd: 0.5, rank: 2 },
    { id: "extreme", label_en: "Extreme", price_delta_usd: 0.75, rank: 3 },
    { id: "revenge", label_en: "Revenge", price_delta_usd: 1.0, rank: 4 },
    { id: "nuclear", label_en: "Nuclear", price_delta_usd: 1.5, rank: 5 },
  ];
  if (spiceMap && typeof spiceMap === "object") {
    const entries = Object.entries(spiceMap);
    for (let i=0;i<entries.length;i++) {
      const [label, price] = entries[i]!;
      tiers.push({ id: slug(label), label_en: String(label), price_delta_usd: Number(price) || 0, rank: i });
    }
  }

  // Categories (legacy)
  const catsRaw = raw?.catalog?.categories ?? raw?.categories ?? [];
  const categories = (Array.isArray(catsRaw) ? catsRaw : []).map((c: any) => {
    const label = String(c.name_en ?? c.label ?? c.name ?? "Menu");
    const m = label.match(/^(\p{Extended_Pictographic}|\p{Emoji_Presentation})\s*(.*)$/u);
    const emoji = String(c.emoji ?? (m ? m[1] : ""))
    const name_en = String(c.name_en ?? (m ? m[2] : label)).trim();
    return {
      id: String(c.id ?? slug(name_en)),
      sort: Number(c.sort ?? 0),
      emoji,
      name_en,
      items: [],
    };
  });
  if (categories.length === 0) categories.push({ id: "menu", sort: 0, emoji: "", name_en: "Menu", items: [] });

  // Flavors (legacy grouped or array)
  const inHouseIds: Array<string|number> = raw?.in_house_only_flavor_ids ?? raw?.rules?.in_house_only_flavor_ids ?? [];
  const inHouseSet = new Set(inHouseIds.map((x) => String(x)));

  const flavorsGrouped = raw?.catalog?.flavors ?? raw?.flavors ?? {};
  const flat: any[] = [];
  if (Array.isArray(flavorsGrouped)) flat.push(...flavorsGrouped);
  else if (flavorsGrouped && typeof flavorsGrouped === "object") {
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
    const in_house_only = inHouseSet.has(String(f.code ?? "")) || Boolean(f.in_house_only);
    return {
      id,
      token,
      name_en,
      family: String(f.family ?? group ?? "classic"),
      emoji_profile: f.emoji_profile ? String(f.emoji_profile) : undefined,
      is_dry_rub: Boolean(isDry),
      in_house_only,
      sold_out: false,
      heat_cap: "extreme",
    };
  });

  // Pricing (legacy shapes)
  const pricing = raw?.pricing ?? {};
  const combos = raw?.combos ?? raw?.pricing?.combos ?? {};

  const out: MenuBundleV1 = {
    bundle_version: "v1",
    brand: {
      name: String(brandName),
      slogan_en: String(slogan),
      currency_canonical: "USD",
      currency_alt: "KHR",
      usd_to_khr: usdToKhr,
    },
    meta: { generated_at: String(generated), source: "shim", notes: "shimmed from legacy export" },
    rules: {
      wing_sizes_bone_in: [6,12,20,36],
      wing_sizes_boneless: [8,12,20,36],
      party_tray_no_mix: true,
      party_tray_flavor_cap: 4,
      extra_flavor_price_usd: 1.0,
      max_flavors_total: 6,
    },
    heat_tiers: tiers.length ? tiers : defaultTier,
    flavors,
    pricing: {
      wings: {
        bone_in: pricing.bone_in ?? { "6": 6.75, "12": 12.5, "20": 19.95 },
        boneless: pricing.boneless ?? { "8": 9.5, "12": 14.0, "20": 22.0 },
        extreme_bone_in: pricing.extreme_bone_in,
        extreme_boneless: pricing.extreme_boneless,
      },
      combos: Object.fromEntries(Object.entries(combos).map(([k, v]: any) => [String(k), {
        price_usd: Number(v.price ?? v.price_usd ?? 0) || 0,
        drink: Boolean(v.drink),
        upgrades_allowed: Boolean(v.upgrades_allowed),
        extra: v,
      }])),
    },
    flavor_counts: raw?.flavor_counts,
    catalog: { categories },
  };

  return out;
}
