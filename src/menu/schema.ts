import { z } from "zod";

export const HeatTierSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  price_delta_usd: z.number().nonnegative(),
  rank: z.number().int().nonnegative()
});

export const OptionSchema = z.object({
  id: z.string().min(1),
  name_en: z.string().min(1),
  price_usd: z.number().optional(),
  price_delta_usd: z.number().optional()
});

export const OptionGroupSchema = z.object({
  id: z.string().min(1),
  name_en: z.string().min(1),
  required: z.boolean(),
  max_select: z.number().int().positive(),
  options: z.array(OptionSchema).min(1)
});

export const FlavorSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(1),
  name_en: z.string().min(1),
  family: z.string().min(1),
  is_dry_rub: z.boolean(),
  dry_rub_icon: z.literal("🌵").optional(),
  in_house_only: z.boolean().default(false),
  heat_cap: z.enum(["original", "hot", "spicy", "extreme", "revenge", "nuclear"]).default("extreme")
}).superRefine((v, ctx) => {
  if (v.is_dry_rub && v.dry_rub_icon !== "🌵") {
    ctx.addIssue({ code: "custom", message: "Dry rub must use 🌵 icon", path: ["dry_rub_icon"] });
  }
});

export const CatalogItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["wing_line", "fixed_combo", "simple_item"]).default("simple_item"),
  name_en: z.string().min(1),
  description_en: z.string().optional(),
  price_usd: z.number().optional(),
  contents_en: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  flags: z.record(z.any()).optional(),
  constraints: z.record(z.any()).optional(),
  applies_option_groups: z.array(z.string()).optional()
});

export const CategorySchema = z.object({
  id: z.string().min(1),
  emoji: z.string().min(1),
  name_en: z.string().min(1),
  items: z.array(CatalogItemSchema).default([])
});

export const MenuBundleV1Schema = z.object({
  bundle_version: z.literal("v1"),
  brand: z.object({
    name: z.string().min(1),
    slogan: z.string().min(1),
    currency_canonical: z.literal("USD"),
    currency_alt: z.literal("KHR"),
    usd_to_khr: z.number().int().positive()
  }),
  meta: z.object({
    generated_at: z.string().min(10),
    notes: z.string().optional()
  }),
  heat_tiers: z.array(HeatTierSchema).min(1),
  option_groups: z.array(OptionGroupSchema).default([]),
  catalog: z.object({
    categories: z.array(CategorySchema).min(1),
    flavors: z.array(FlavorSchema).default([])
  })
});

export type MenuBundleV1 = z.infer<typeof MenuBundleV1Schema>;
