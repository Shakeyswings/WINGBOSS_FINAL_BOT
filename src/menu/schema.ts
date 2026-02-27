import { z } from "zod";

/**
MenuBundle v1 (franchise-safe minimal core)
- Khmer-first UI supported via *_km fields (English still source-of-truth for IDs/tokens).
- This schema is intentionally strict on required fields, but allows safe extension via `extra`.
*/

export const HeatTierSchema = z.object({
  id: z.string().min(1),              // original|hot|spicy|extreme|revenge|nuclear|...
  label_en: z.string().min(1),
  label_km: z.string().optional(),
  price_delta_usd: z.number().nonnegative(),
  rank: z.number().int().nonnegative(),
});

export const FlavorSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(1),          // e.g. 1️⃣
  name_en: z.string().min(1),
  name_km: z.string().optional(),
  family: z.string().min(1),         // BBQ, Buffalo, etc.
  emoji_profile: z.string().optional(), // 🍯🧂🌶️ etc
  is_dry_rub: z.boolean().default(false),
  in_house_only: z.boolean().default(false),
  sold_out: z.boolean().default(false),
  heat_cap: z.enum(["original","hot","spicy","extreme","revenge","nuclear"]).default("extreme"),
});

export const PriceTableSchema = z.record(z.string().regex(/^\d+$/), z.number().positive());

export const WingPricingSchema = z.object({
  bone_in: PriceTableSchema,
  boneless: PriceTableSchema,
  extreme_bone_in: PriceTableSchema.optional(),
  extreme_boneless: PriceTableSchema.optional(),
});

export const FlavorCountRuleSchema = z.object({
  included: z.number().int().nonnegative(),
  extra_allowed: z.number().int().nonnegative().default(0),
  extra_price_usd: z.number().nonnegative().optional(),
});

export const FlavorCountsSchema = z.object({
  bone_in: z.record(z.string(), FlavorCountRuleSchema),
  boneless: z.record(z.string(), z.union([FlavorCountRuleSchema, z.number().int().nonnegative()])), // legacy compat
});

export const CatalogItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["wings","combo","side","drink","addon","burger","other"]).default("other"),
  name_en: z.string().min(1),
  name_km: z.string().optional(),
  description_en: z.string().optional(),
  description_km: z.string().optional(),
  price_usd: z.number().nonnegative().optional(),
  tags: z.array(z.string()).default([]),
  sold_out: z.boolean().default(false),
  extra: z.record(z.any()).optional(), // safe forward-compat
});

export const CategorySchema = z.object({
  id: z.string().min(1),
  sort: z.number().int().default(0),
  emoji: z.string().default(""),
  name_en: z.string().min(1),
  name_km: z.string().optional(),
  items: z.array(CatalogItemSchema).default([]),
});

export const MenuBundleV1Schema = z.object({
  bundle_version: z.literal("v1"),

  brand: z.object({
    name: z.string().min(1),
    slogan_en: z.string().min(1),
    slogan_km: z.string().optional(),
    currency_canonical: z.literal("USD"),
    currency_alt: z.literal("KHR"),
    usd_to_khr: z.number().int().positive(),
  }),

  meta: z.object({
    generated_at: z.string().min(10),
    source: z.string().optional(),
    notes: z.string().optional(),
  }),

  rules: z.object({
    wing_sizes_bone_in: z.array(z.number().int().positive()).default([6,12,20,36]),
    wing_sizes_boneless: z.array(z.number().int().positive()).default([8,12,20,36]),
    party_tray_no_mix: z.boolean().default(true),
    party_tray_flavor_cap: z.number().int().positive().default(4),
    extra_flavor_price_usd: z.number().nonnegative().default(1.0),
    max_flavors_total: z.number().int().positive().default(6),
  }).default({} as any),

  heat_tiers: z.array(HeatTierSchema).min(1),
  flavors: z.array(FlavorSchema).default([]),

  pricing: z.object({
    wings: WingPricingSchema,
    combos: z.record(z.string(), z.object({
      price_usd: z.number().positive(),
      drink: z.boolean().default(false),
      upgrades_allowed: z.boolean().default(false),
      extra: z.record(z.any()).optional(),
    })).default({}),
  }),

  flavor_counts: FlavorCountsSchema.optional(),

  catalog: z.object({
    categories: z.array(CategorySchema).min(1),
  }),
});

export type MenuBundleV1 = z.infer<typeof MenuBundleV1Schema>;
