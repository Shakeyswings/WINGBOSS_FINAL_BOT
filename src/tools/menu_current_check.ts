import "dotenv/config";
import { readFile } from "node:fs/promises";
import util from "node:util";
import { z } from "zod";

const CANONICAL_MENU_PATH = "./authoritative-sources/menu.current.json";
const SUPPORTED_SCHEMA_VERSION = "2026-08-12.current-menu.v1";
const AUTHORITATIVE_SOURCE_ARTIFACT = "authoritative-sources/00_CURRENT_MENU_APPROVED_2026-08-12.jpg";
const AUTHORITATIVE_SOURCE_DATE = "2026-08-12";

const MoneySchema = z.object({
  currency: z.literal("USD"),
  amount_minor: z.number().int().nonnegative(),
});

const AvailabilitySchema = z.object({
  status: z.enum(["active", "by_request"]),
});

const ActiveCatalogSourceSchema = z.enum(["image", "owner_decision"]);

const VariantPricingModelSchema = z.object({
  kind: z.literal("per_6_wings"),
  charge_units: z.literal("applicable_wing_quantity_divided_by_6"),
}).passthrough();

const GroupPricingModelSchema = z.object({
  kind: z.literal("per_6_wings"),
  charge_per_units: z.literal(6),
  amount_minor_per_unit: z.number().int().nonnegative(),
}).passthrough();

const VariantSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  display_name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  pricing_context: z.string().min(1).optional(),
  price: MoneySchema,
  availability: AvailabilitySchema,
  modifier_groups: z.array(z.string().min(1)).default([]),
  pricing_model: VariantPricingModelSchema.optional(),
  portion_ml: z.number().int().positive().optional(),
  eligible_sauces: z.array(z.string().min(1)).optional(),
  excluded_sauces: z.array(z.string().min(1)).optional(),
  source: ActiveCatalogSourceSchema.optional(),
}).passthrough();

const EligibilitySchema = z.object({
  minimum_wing_quantity: z.number().int().positive(),
  allowed_flavor_families: z.array(z.enum(["sauce", "dry_rub"])),
});

const CatalogItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  display_name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  aliases: z.array(z.string().min(1)).optional(),
  pricing_context: z.string().min(1).optional(),
  type: z.string().min(1),
  availability: AvailabilitySchema,
  variants: z.array(VariantSchema).optional(),
  price: MoneySchema.optional(),
  modifier_groups: z.array(z.string().min(1)).default([]),
  eligibility: EligibilitySchema.optional(),
  source: ActiveCatalogSourceSchema,
}).passthrough();

const CategorySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  display_order: z.number().int(),
  items: z.array(CatalogItemSchema),
}).passthrough();

const ModifierOptionSchema = z.object({
  ref: z.string().min(1),
  price: MoneySchema.optional(),
}).passthrough();

const ModifierGroupSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  minimum_select: z.number().int().nonnegative(),
  maximum_select: z.number().int().nonnegative(),
  selection_rule: z.string().min(1).optional(),
  options: z.array(ModifierOptionSchema),
  pricing_model: GroupPricingModelSchema.optional(),
  eligible_order_item_codes: z.array(z.string().min(1)).optional(),
  minimum_wing_quantity: z.number().int().positive().optional(),
  eligible_base_flavor_family: z.string().min(1).optional(),
  excluded_option_ids: z.array(z.string().min(1)).optional(),
  portion_ml: z.number().int().positive().optional(),
  choice_sets: z.array(z.array(z.string().min(1)).min(1)).optional(),
  source: ActiveCatalogSourceSchema,
}).passthrough();

const CurrentMenuSchema = z.object({
  schema_version: z.literal(SUPPORTED_SCHEMA_VERSION),
  authority_status: z.literal("ACTIVE_CURRENT_MENU"),
  source_artifact: z.literal(AUTHORITATIVE_SOURCE_ARTIFACT),
  source_date: z.literal(AUTHORITATIVE_SOURCE_DATE),
  currency: z.object({
    code: z.literal("USD"),
    amount_minor_unit: z.literal(2),
    representation: z.literal("amount_minor"),
  }),
  scope: z.object({
    business_scope: z.literal("Business"),
    location_override_policy: z.literal(
      "Optional location overrides may disable availability; they may not silently mutate canonical base menu data.",
    ),
  }),
  catalog: z.object({
    categories: z.array(CategorySchema),
    modifier_groups: z.array(ModifierGroupSchema),
    location_overrides: z.array(z.unknown()).max(
      0,
      "Location overrides must remain empty until explicit override semantics are implemented",
    ),
  }).passthrough(),
  owner_confirmation_required: z.tuple([
    z.object({
      field: z.literal("Most Popular block text"),
      item: z.literal("bottom-right promotional block"),
      what_is_unclear: z.literal("The exact transcription of one small promotional text fragment is not sufficiently clear in the source image."),
      what_was_not_guessed: z.literal("No active purchasable data was derived from the unclear fragment."),
    }),
  ]),
  historical_reference_boundary: z.object({
    historical_70_flavor_system: z.literal("reference_only"),
    active_customer_menu_authority: z.literal(true),
  }).passthrough(),
}).passthrough();

type Menu = z.infer<typeof CurrentMenuSchema>;
type Item = z.infer<typeof CatalogItemSchema>;
type Variant = z.infer<typeof VariantSchema>;
type ModifierGroup = z.infer<typeof ModifierGroupSchema>;

type ItemAuthority = {
  code: string;
  name: string;
  displayName: string;
  description?: string;
  aliases?: readonly string[];
  pricingContext?: string;
  type: string;
  category: string;
  price: number | null;
  availability: "active" | "by_request";
  source: "image" | "owner_decision";
  modifierGroups?: readonly string[];
  requiredModifierGroups?: readonly string[];
  compositionItemIds?: readonly string[];
};

type VariantAuthority = {
  parent: string;
  code: string;
  name: string;
  displayName?: string;
  type?: string;
  pricingContext?: string;
  price: number;
  availability: "active" | "by_request";
  source?: "owner_decision";
};

type GroupAuthority = {
  code: string;
  name: string;
  min: number;
  max: number;
  options: Readonly<Record<string, number | null>>;
  selectionRule?: string;
  eligibleOrderItemCodes?: readonly string[];
  minimumWingQuantity?: number;
  eligibleBaseFlavorFamily?: string;
  excludedOptionIds?: readonly string[];
  portionMl?: number;
  choiceSets?: readonly (readonly string[])[];
  pricingModel?: { kind: "per_6_wings"; charge_per_units: 6; amount_minor_per_unit: 50 };
};

const WING_PRIMARY_FLAVOR_GROUP_ID = "modifier_group_primary_flavor" as const;
const TRIPLE_DRIZZ_COMPONENT_IDS = ["d1_ranch", "d2_fireback", "d3_hot_honey"] as const;

const CATEGORY_AUTHORITY = {
  a_wings: { code: "A", name: "WINGS", order: 1, items: ["a1_bone_in_combo", "a2_boneless_combo", "a3_flavor_box", "a4_wings", "a5_boneless_wings"] },
  b_burgers: { code: "B", name: "BURGERS", order: 2, items: ["b1_single", "b2_double", "b3_western_bbq", "b4_sauce_boss"] },
  c_sides: { code: "C", name: "SIDES", order: 3, items: ["c1_cajun_fried_corn", "c2_cajun_fries", "c3_onion_rings", "c4_garlic_fries", "c5_sides_sampler"] },
  s_sauces: { code: "S", name: "SAUCES", order: 4, items: ["s1_fire_storm", "s2_jerk", "s3_buffalo", "s4_texas_bbq", "s5_korean", "s6_honey_teriyaki", "s7_spicy_peanut"] },
  r_dry_rub: { code: "R", name: "DRY RUB", order: 5, items: ["r1_cajun", "r2_midnight_rub", "r3_buffalo_dust", "r4_kampot_pepper_hot_honey", "r5_lemon_pepper", "r6_garlic_parm"] },
  d_drizzles: { code: "D", name: "DRIZZLES", order: 6, items: ["d1_ranch", "d2_fireback", "d3_hot_honey", "d4_triple_drizz"] },
  extras_panel: { code: "X", name: "EXTRAS", order: 7, items: ["x_a3_boneless_upgrade", "x_drink", "x_carrots", "x_gloves", "x_add_plus_one_sauce_rub", "x_add_plus_one_beef_patty", "x_add_plus_one_cheese", "x_add_plus_two_wings", "x_dip_ranch", "x_dip_fireback", "x_dip_ketchup", "x_dip_bbq", "x_spice_mild", "x_spice_hot", "x_spice_spicy", "x_spice_extreme", "x_spice_nuclear"] },
} as const;

const ITEM_AUTHORITY: Readonly<Record<string, ItemAuthority>> = {
  a1_bone_in_combo: { code: "A1", name: "BONE-IN COMBO", displayName: "Bone-In Combo", description: "Wings • Fries • Dip", type: "variant", category: "a_wings", price: null, availability: "active", source: "image", requiredModifierGroups: [WING_PRIMARY_FLAVOR_GROUP_ID] },
  a2_boneless_combo: { code: "A2", name: "BONELESS COMBO", displayName: "Boneless Combo", description: "Boneless Wings • Fries • Dip", type: "variant", category: "a_wings", price: null, availability: "active", source: "image", requiredModifierGroups: [WING_PRIMARY_FLAVOR_GROUP_ID] },
  a3_flavor_box: { code: "A3", name: "FLAVOR BOX", displayName: "Flavor Box", description: "Wings + XXL Fries + Dry Rub + Drizzle + Dip", type: "bundle", category: "a_wings", price: null, availability: "active", source: "owner_decision", modifierGroups: ["modifier_group_a3_boneless_upgrade"] },
  a4_wings: { code: "A4", name: "WINGS", displayName: "Wings", description: "Wing flavor allocation varies by size", type: "variant", category: "a_wings", price: null, availability: "active", source: "image", requiredModifierGroups: [WING_PRIMARY_FLAVOR_GROUP_ID] },
  a5_boneless_wings: { code: "A5", name: "BONELESS WINGS", displayName: "Boneless Wings", description: "12 Wings = 2 Flavors", type: "variant", category: "a_wings", price: null, availability: "active", source: "image", requiredModifierGroups: [WING_PRIMARY_FLAVOR_GROUP_ID] },
  b1_single: { code: "B1", name: "SINGLE", displayName: "Single", type: "product", category: "b_burgers", price: 400, availability: "active", source: "image", modifierGroups: [] },
  b2_double: { code: "B2", name: "DOUBLE", displayName: "Double", type: "product", category: "b_burgers", price: 700, availability: "active", source: "image", modifierGroups: [] },
  b3_western_bbq: { code: "B3", name: "WESTERN BBQ", displayName: "Western BBQ", type: "product", category: "b_burgers", price: 900, availability: "active", source: "image", modifierGroups: [] },
  b4_sauce_boss: { code: "B4", name: "SAUCE BOSS", displayName: "Sauce Boss", type: "product", category: "b_burgers", price: 900, availability: "active", source: "image", modifierGroups: [] },
  c1_cajun_fried_corn: { code: "C1", name: "CAJUN FRIED CORN", displayName: "Cajun Fried Corn", description: "Deep-fried battered corn on the cob.", aliases: ["FRIED CORN", "DEEP FRIED CORN"], type: "product", category: "c_sides", price: 400, availability: "active", source: "owner_decision", modifierGroups: ["modifier_group_c1_dry_rub", "modifier_group_c1_finish_choice"] },
  c2_cajun_fries: { code: "C2", name: "CAJUN FRIES", displayName: "Cajun Fries", type: "product", category: "c_sides", price: 400, availability: "active", source: "image", modifierGroups: [] },
  c3_onion_rings: { code: "C3", name: "ONION RINGS", displayName: "Onion Rings", type: "product", category: "c_sides", price: 500, availability: "active", source: "image", modifierGroups: [] },
  c4_garlic_fries: { code: "C4", name: "GARLIC FRIES", displayName: "Garlic Fries", type: "product", category: "c_sides", price: 500, availability: "active", source: "image", modifierGroups: [] },
  c5_sides_sampler: { code: "C5", name: "SIDES SAMPLER", displayName: "Sides Sampler", description: "All 4 Sides + Dip", type: "bundle", category: "c_sides", price: 1300, availability: "active", source: "image", modifierGroups: [] },
  s1_fire_storm: { code: "S1", name: "FIRE STORM", displayName: "Fire Storm", pricingContext: "included_primary_flavor", type: "modifier", category: "s_sauces", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  s2_jerk: { code: "S2", name: "JERK", displayName: "Jerk", pricingContext: "included_primary_flavor", type: "modifier", category: "s_sauces", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  s3_buffalo: { code: "S3", name: "BUFFALO", displayName: "Buffalo", pricingContext: "included_primary_flavor", type: "modifier", category: "s_sauces", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  s4_texas_bbq: { code: "S4", name: "TEXAS BBQ", displayName: "Texas BBQ", pricingContext: "included_primary_flavor", type: "modifier", category: "s_sauces", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  s5_korean: { code: "S5", name: "KOREAN", displayName: "Korean", pricingContext: "included_primary_flavor", type: "modifier", category: "s_sauces", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  s6_honey_teriyaki: { code: "S6", name: "HONEY TERIYAKI", displayName: "Honey Teriyaki", pricingContext: "included_primary_flavor", type: "modifier", category: "s_sauces", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  s7_spicy_peanut: { code: "S7", name: "SPICY PEANUT", displayName: "Spicy Peanut", pricingContext: "included_primary_flavor", type: "modifier", category: "s_sauces", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  r1_cajun: { code: "R1", name: "CAJUN", displayName: "Cajun", pricingContext: "included_primary_flavor", type: "modifier", category: "r_dry_rub", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  r2_midnight_rub: { code: "R2", name: "MIDNIGHT RUB", displayName: "Midnight Rub", pricingContext: "included_primary_flavor", type: "modifier", category: "r_dry_rub", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  r3_buffalo_dust: { code: "R3", name: "BUFFALO DUST", displayName: "Buffalo Dust", pricingContext: "included_primary_flavor", type: "modifier", category: "r_dry_rub", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  r4_kampot_pepper_hot_honey: { code: "R4", name: "KAMPOT PEPPER HOT HONEY", displayName: "Kampot Pepper Hot Honey", pricingContext: "included_primary_flavor", type: "modifier", category: "r_dry_rub", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  r5_lemon_pepper: { code: "R5", name: "LEMON PEPPER", displayName: "Lemon Pepper", pricingContext: "included_primary_flavor", type: "modifier", category: "r_dry_rub", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  r6_garlic_parm: { code: "R6", name: "GARLIC PARM", displayName: "Garlic Parm", pricingContext: "included_primary_flavor", type: "modifier", category: "r_dry_rub", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  d1_ranch: { code: "D1", name: "RANCH", displayName: "Ranch", pricingContext: "paid_drizzle", type: "modifier", category: "d_drizzles", price: 50, availability: "active", source: "owner_decision", modifierGroups: [] },
  d2_fireback: { code: "D2", name: "FIREBACK", displayName: "Fireback", pricingContext: "paid_drizzle", type: "modifier", category: "d_drizzles", price: 50, availability: "active", source: "owner_decision", modifierGroups: [] },
  d3_hot_honey: { code: "D3", name: "HOT HONEY", displayName: "Hot Honey", pricingContext: "paid_drizzle", type: "modifier", category: "d_drizzles", price: 50, availability: "active", source: "owner_decision", modifierGroups: [] },
  d4_triple_drizz: { code: "D4", name: "TRIPLE DRIZZ", displayName: "Triple Drizz", aliases: ["ALL 3"], pricingContext: "triple_drizz", type: "modifier", category: "d_drizzles", price: 100, availability: "active", source: "owner_decision", compositionItemIds: TRIPLE_DRIZZ_COMPONENT_IDS },
  x_a3_boneless_upgrade: { code: "A3_BONeless", name: "BONELESS UPGRADE", displayName: "Boneless", pricingContext: "upgrade_modifier", type: "modifier", category: "extras_panel", price: 150, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_drink: { code: "DRINK", name: "DRINK", displayName: "Drink", type: "modifier", category: "extras_panel", price: 125, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_carrots: { code: "CARROTS", name: "CARROTS", displayName: "Carrots", type: "modifier", category: "extras_panel", price: 75, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_gloves: { code: "GLOVES", name: "GLOVES", displayName: "Gloves", type: "modifier", category: "extras_panel", price: 50, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_add_plus_one_sauce_rub: { code: "+1_SAUCE_RUB", name: "ADD +1 WING FLAVOR", displayName: "Add +1 Wing Flavor", pricingContext: "additional_wing_flavor", type: "modifier", category: "extras_panel", price: 100, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_add_plus_one_beef_patty: { code: "+1_BEEF_PATTY", name: "ADD +1 BEEF PATTY", displayName: "Add +1 Beef Patty", type: "modifier", category: "extras_panel", price: 225, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_add_plus_one_cheese: { code: "+1_CHEESE", name: "ADD +1 CHEESE", displayName: "Add +1 Cheese", type: "modifier", category: "extras_panel", price: 75, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_add_plus_two_wings: { code: "+2_WINGS", name: "ADD +2 WINGS", displayName: "Add +2 Wings", type: "modifier", category: "extras_panel", price: 250, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_dip_ranch: { code: "DIP_RANCH", name: "DIP RANCH", displayName: "Ranch Dip", type: "modifier", category: "extras_panel", price: 75, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_dip_fireback: { code: "DIP_FIREBACK", name: "DIP FIREBACK", displayName: "Fireback Dip", type: "modifier", category: "extras_panel", price: 75, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_dip_ketchup: { code: "DIP_KETCHUP", name: "DIP KETCHUP", displayName: "Ketchup Dip", type: "modifier", category: "extras_panel", price: 75, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_dip_bbq: { code: "DIP_BBQ", name: "DIP BBQ", displayName: "BBQ Dip", type: "modifier", category: "extras_panel", price: 75, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_spice_mild: { code: "MILD", name: "MILD", displayName: "Mild", pricingContext: "heat_upgrade", type: "modifier", category: "extras_panel", price: 0, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_spice_hot: { code: "HOT", name: "HOT", displayName: "Hot", pricingContext: "heat_upgrade", type: "modifier", category: "extras_panel", price: 25, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_spice_spicy: { code: "SPICY", name: "SPICY", displayName: "Spicy", pricingContext: "heat_upgrade", type: "modifier", category: "extras_panel", price: 50, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_spice_extreme: { code: "EXTREME", name: "EXTREME", displayName: "Extreme", pricingContext: "heat_upgrade", type: "modifier", category: "extras_panel", price: 75, availability: "active", source: "owner_decision", modifierGroups: [] },
  x_spice_nuclear: { code: "NUCLEAR", name: "NUCLEAR", displayName: "Nuclear", pricingContext: "heat_upgrade", type: "modifier", category: "extras_panel", price: 100, availability: "active", source: "owner_decision", modifierGroups: [] },
};

const VARIANT_AUTHORITY: Readonly<Record<string, VariantAuthority>> = {
  a1_6pc: { parent: "a1_bone_in_combo", code: "6pc", name: "6pc", price: 1095, availability: "active" },
  a1_10pc: { parent: "a1_bone_in_combo", code: "10pc", name: "10pc", price: 1495, availability: "active" },
  a2_8pc: { parent: "a2_boneless_combo", code: "8pc", name: "8pc", price: 1395, availability: "active" },
  a2_12pc: { parent: "a2_boneless_combo", code: "12pc", name: "12pc", price: 1795, availability: "active" },
  a3_8pc: { parent: "a3_flavor_box", code: "8pc", name: "8pc", price: 1495, availability: "active" },
  a4_6pc: { parent: "a4_wings", code: "6pc", name: "6pc", price: 675, availability: "active" },
  a4_10pc: { parent: "a4_wings", code: "10pc", name: "10pc", price: 1295, availability: "active" },
  a4_20pc: { parent: "a4_wings", code: "20pc", name: "20pc", price: 2075, availability: "active" },
  a4_36pc: { parent: "a4_wings", code: "36pc", name: "36pc", price: 3595, availability: "active" },
  a4_50pc: { parent: "a4_wings", code: "50pc", name: "50pc", price: 4995, availability: "active" },
  a4_extra_sauce: { parent: "a4_wings", code: "extra_sauce", name: "Extra Sauce", price: 100, availability: "active" },
  a4_sauce_on_side: { parent: "a4_wings", code: "sauce_on_side", name: "Sauce On The Side", displayName: "Sauce on the Side", type: "side_sauce", pricingContext: "side_sauce", price: 100, availability: "by_request", source: "owner_decision" },
  a4_dusted_rub: { parent: "a4_wings", code: "dusted_rub", name: "DUSTED RUB", displayName: "Dusted Rub", type: "quantity_scaled_modifier", price: 50, availability: "active", source: "owner_decision" },
  a5_8pc: { parent: "a5_boneless_wings", code: "8pc", name: "8pc", price: 950, availability: "active" },
  a5_12pc: { parent: "a5_boneless_wings", code: "12pc", name: "12pc", price: 1395, availability: "active" },
  a5_24pc: { parent: "a5_boneless_wings", code: "24pc", name: "24pc", price: 2650, availability: "active" },
  a5_48pc: { parent: "a5_boneless_wings", code: "48pc", name: "48pc", price: 5195, availability: "active" },
};

const GROUP_AUTHORITY: Readonly<Record<string, GroupAuthority>> = {
  modifier_group_primary_flavor: {
    code: "PRIMARY_FLAVOR", name: "Primary Flavor", min: 1, max: 1, selectionRule: "sauce_or_dry_rub",
    options: { s1_fire_storm: 0, s2_jerk: 0, s3_buffalo: 0, s4_texas_bbq: 0, s5_korean: 0, s6_honey_teriyaki: 0, s7_spicy_peanut: 0, r1_cajun: 0, r2_midnight_rub: 0, r3_buffalo_dust: 0, r4_kampot_pepper_hot_honey: 0, r5_lemon_pepper: 0, r6_garlic_parm: 0 },
  },
  modifier_group_wing_flavor_upgrade: {
    code: "WING_FLAVOR_UPGRADE", name: "Wing Flavor Upgrade", min: 0, max: 1,
    eligibleOrderItemCodes: ["A4"], minimumWingQuantity: 20,
    options: { x_add_plus_one_sauce_rub: 100 },
  },
  modifier_group_sauce_on_the_side: {
    code: "SIDE_SAUCE", name: "Sauce On The Side", min: 0, max: 1,
    eligibleOrderItemCodes: ["A4"], excludedOptionIds: ["s1_fire_storm"], portionMl: 30,
    options: { s2_jerk: 100, s3_buffalo: 100, s4_texas_bbq: 100, s5_korean: 100, s6_honey_teriyaki: 100, s7_spicy_peanut: 100 },
  },
  modifier_group_dusted_rub: {
    code: "DUSTED_RUB", name: "Dusted Rub", min: 0, max: 1,
    eligibleOrderItemCodes: ["A4"], eligibleBaseFlavorFamily: "dry_rub",
    pricingModel: { kind: "per_6_wings", charge_per_units: 6, amount_minor_per_unit: 50 },
    options: { r1_cajun: null, r2_midnight_rub: null, r3_buffalo_dust: null, r4_kampot_pepper_hot_honey: null, r5_lemon_pepper: null, r6_garlic_parm: null },
  },
  modifier_group_a3_boneless_upgrade: { code: "A3_BONUS", name: "A3 Boneless Upgrade", min: 0, max: 1, options: { x_a3_boneless_upgrade: 150 } },
  modifier_group_c1_dry_rub: { code: "C1_DRY_RUB", name: "C1 Dry Rub", min: 1, max: 1, options: { r1_cajun: 0, r2_midnight_rub: 0, r3_buffalo_dust: 0, r4_kampot_pepper_hot_honey: 0, r5_lemon_pepper: 0, r6_garlic_parm: 0 } },
  modifier_group_c1_finish_choice: {
    code: "C1_FINISH", name: "C1 Finish Choice", min: 1, max: 1, selectionRule: "one_of_two_families",
    choiceSets: [["d1_ranch", "d2_fireback", "d3_hot_honey"], ["x_dip_ranch", "x_dip_fireback", "x_dip_ketchup", "x_dip_bbq"]],
    options: { d1_ranch: 0, d2_fireback: 0, d3_hot_honey: 0, x_dip_ranch: 0, x_dip_fireback: 0, x_dip_ketchup: 0, x_dip_bbq: 0 },
  },
  modifier_group_additional_dry_rub: { code: "ADD_DRY_RUB", name: "Additional Dry Rub", min: 0, max: 1, options: { r1_cajun: 50, r2_midnight_rub: 50, r3_buffalo_dust: 50, r4_kampot_pepper_hot_honey: 50, r5_lemon_pepper: 50, r6_garlic_parm: 50 } },
  modifier_group_additional_drizzle: { code: "ADD_DRIZZLE", name: "Additional Drizzle", min: 0, max: 1, options: { d1_ranch: 50, d2_fireback: 50, d3_hot_honey: 50 } },
  modifier_group_triple_drizz: { code: "TRIPLE_DRIZZ", name: "Triple Drizz", min: 0, max: 1, options: { d4_triple_drizz: 100 } },
  modifier_group_spice_level: { code: "SPICE_LEVEL", name: "Spice Level", min: 0, max: 1, selectionRule: "order_level_heat_upgrade", options: { x_spice_mild: 0, x_spice_hot: 25, x_spice_spicy: 50, x_spice_extreme: 75, x_spice_nuclear: 100 } },
  modifier_group_dips: { code: "DIPS", name: "Dips", min: 0, max: 1, options: { x_dip_ranch: 75, x_dip_fireback: 75, x_dip_ketchup: 75, x_dip_bbq: 75 } },
};

const SIDE_SAUCE_ELIGIBLE = ["s2_jerk", "s3_buffalo", "s4_texas_bbq", "s5_korean", "s6_honey_teriyaki", "s7_spicy_peanut"] as const;
const SIDE_SAUCE_EXCLUDED = ["s1_fire_storm"] as const;

function exactArray(actual: readonly string[] | undefined, expected: readonly string[] | undefined): boolean {
  if (!actual && !expected) return true;
  if (!actual || !expected || actual.length !== expected.length) return false;
  return actual.every((value, index) => value === expected[index]);
}

function exactChoiceSets(actual: readonly (readonly string[])[] | undefined, expected: readonly (readonly string[])[] | undefined): boolean {
  if (!actual && !expected) return true;
  if (!actual || !expected || actual.length !== expected.length) return false;
  return actual.every((set, index) => exactArray(set, expected[index]));
}

function issue(ctx: z.RefinementCtx, message: string): void {
  ctx.addIssue({ code: z.ZodIssueCode.custom, message });
}

function validateItem(item: Item, categoryId: string, modifierGroupsById: ReadonlyMap<string, ModifierGroup>, ctx: z.RefinementCtx): void {
  const authority = ITEM_AUTHORITY[item.id];
  if (!authority) {
    issue(ctx, `Unexpected canonical catalog item ${item.id}`);
    return;
  }
  if (authority.category !== categoryId) issue(ctx, `Item ${item.id} must remain under canonical category ${authority.category}`);
  if (item.code !== authority.code) issue(ctx, `Item ${item.id} must preserve canonical code ${authority.code}`);
  if (item.name !== authority.name) issue(ctx, `Item ${item.id} must preserve canonical name`);
  if (item.display_name !== authority.displayName) issue(ctx, `Item ${item.id} must preserve canonical display name`);
  if (item.description !== authority.description) issue(ctx, `Item ${item.id} must preserve canonical description`);
  if (!exactArray(item.aliases, authority.aliases)) issue(ctx, `Item ${item.id} must preserve canonical aliases`);
  if (item.pricing_context !== authority.pricingContext) issue(ctx, `Item ${item.id} must preserve canonical pricing context`);
  if (item.type !== authority.type) issue(ctx, `Item ${item.id} must preserve canonical type ${authority.type}`);
  if (item.availability.status !== authority.availability) issue(ctx, `Item ${item.id} must preserve canonical availability ${authority.availability}`);
  if (item.source !== authority.source) issue(ctx, `Item ${item.id} must preserve canonical source ${authority.source}`);
  if (authority.modifierGroups && !exactArray(item.modifier_groups, authority.modifierGroups)) issue(ctx, `Item ${item.id} must preserve canonical modifier-group attachments`);

  if (authority.requiredModifierGroups) {
    for (const groupId of authority.requiredModifierGroups) {
      if (!modifierGroupsById.has(groupId)) issue(ctx, `Item ${item.id} must preserve canonical required modifier group ${groupId}`);
    }
  }

  if (authority.compositionItemIds) {
    const tripleDrizzGroup = modifierGroupsById.get("modifier_group_additional_drizzle");
    if (!tripleDrizzGroup || !exactArray(tripleDrizzGroup.options.map((option) => option.ref), authority.compositionItemIds)) {
      issue(ctx, `Item ${item.id} must preserve canonical Ranch, Fireback, and Hot Honey composition`);
    }
  }

  if (authority.price === null) {
    if (item.price) issue(ctx, `Variant-backed item ${item.id} must not define a base price`);
  } else if (item.price?.amount_minor !== authority.price) {
    issue(ctx, `Item ${item.id} must preserve canonical price ${authority.price}`);
  }

  if (item.id === "x_add_plus_one_sauce_rub") {
    if (
      item.eligibility?.minimum_wing_quantity !== 20
      || !exactArray(item.eligibility.allowed_flavor_families, ["sauce", "dry_rub"])
    ) {
      issue(ctx, "x_add_plus_one_sauce_rub must preserve canonical 20-wing sauce/dry-rub eligibility");
    }
  } else if (item.eligibility) {
    issue(ctx, `Item ${item.id} must not define noncanonical wing eligibility`);
  }
}

function validateVariant(variant: Variant, parentItemId: string, ctx: z.RefinementCtx): void {
  const authority = VARIANT_AUTHORITY[variant.id];
  if (!authority) {
    issue(ctx, `Unexpected canonical variant ${variant.id}`);
    return;
  }
  if (authority.parent !== parentItemId) issue(ctx, `Variant ${variant.id} must remain under canonical parent ${authority.parent}`);
  if (variant.code !== authority.code) issue(ctx, `Variant ${variant.id} must preserve canonical code ${authority.code}`);
  if (variant.name !== authority.name) issue(ctx, `Variant ${variant.id} must preserve canonical name`);
  if (variant.display_name !== authority.displayName) issue(ctx, `Variant ${variant.id} must preserve canonical display name`);
  if (variant.type !== authority.type) issue(ctx, `Variant ${variant.id} must preserve canonical type`);
  if (variant.pricing_context !== authority.pricingContext) issue(ctx, `Variant ${variant.id} must preserve canonical pricing context`);
  if (variant.price.amount_minor !== authority.price) issue(ctx, `Variant ${variant.id} must preserve canonical price ${authority.price}`);
  if (variant.availability.status !== authority.availability) issue(ctx, `Variant ${variant.id} must preserve canonical availability ${authority.availability}`);
  if (variant.source !== authority.source) issue(ctx, `Variant ${variant.id} must preserve canonical provenance`);
  if (variant.modifier_groups.length !== 0) issue(ctx, `Variant ${variant.id} must not attach noncanonical modifier groups`);
  if (variant.eligibility !== undefined) issue(ctx, `Variant ${variant.id} must not define noncanonical wing eligibility`);

  if (variant.id === "a4_dusted_rub") {
    if (
      variant.pricing_model?.kind !== "per_6_wings"
      || variant.pricing_model.charge_units !== "applicable_wing_quantity_divided_by_6"
    ) {
      issue(ctx, "a4_dusted_rub must preserve canonical per-six-wings pricing semantics");
    }
  } else if (variant.pricing_model) {
    issue(ctx, `Variant ${variant.id} must not define noncanonical quantity-scaled pricing`);
  }

  if (variant.id === "a4_sauce_on_side") {
    if (variant.portion_ml !== 30) issue(ctx, "a4_sauce_on_side must preserve canonical 30 ml portion");
    if (!exactArray(variant.eligible_sauces, SIDE_SAUCE_ELIGIBLE)) issue(ctx, "a4_sauce_on_side must preserve canonical eligible sauce set");
    if (!exactArray(variant.excluded_sauces, SIDE_SAUCE_EXCLUDED)) issue(ctx, "a4_sauce_on_side must preserve canonical Fire Storm exclusion");
  } else if (variant.portion_ml !== undefined || variant.eligible_sauces || variant.excluded_sauces) {
    issue(ctx, `Variant ${variant.id} must not define side-sauce-only metadata`);
  }
}

function validateModifierGroup(group: ModifierGroup, ctx: z.RefinementCtx): void {
  const authority = GROUP_AUTHORITY[group.id];
  if (!authority) {
    issue(ctx, `Unexpected canonical modifier group ${group.id}`);
    return;
  }
  if (group.code !== authority.code) issue(ctx, `Modifier group ${group.id} must preserve canonical code ${authority.code}`);
  if (group.name !== authority.name) issue(ctx, `Modifier group ${group.id} must preserve canonical name ${authority.name}`);
  if (group.minimum_select !== authority.min || group.maximum_select !== authority.max) issue(ctx, `Modifier group ${group.id} must preserve canonical selection bounds ${authority.min}/${authority.max}`);
  if (group.selection_rule !== authority.selectionRule) issue(ctx, `Modifier group ${group.id} must preserve canonical selection rule`);
  if (!exactArray(group.eligible_order_item_codes, authority.eligibleOrderItemCodes)) issue(ctx, `Modifier group ${group.id} must preserve canonical order-item eligibility`);
  if (group.minimum_wing_quantity !== authority.minimumWingQuantity) issue(ctx, `Modifier group ${group.id} must preserve canonical minimum-wing eligibility`);
  if (group.eligible_base_flavor_family !== authority.eligibleBaseFlavorFamily) issue(ctx, `Modifier group ${group.id} must preserve canonical base-flavor eligibility`);
  if (!exactArray(group.excluded_option_ids, authority.excludedOptionIds)) issue(ctx, `Modifier group ${group.id} must preserve canonical excluded options`);
  if (group.portion_ml !== authority.portionMl) issue(ctx, `Modifier group ${group.id} must preserve canonical portion metadata`);
  if (!exactChoiceSets(group.choice_sets, authority.choiceSets)) issue(ctx, `Modifier group ${group.id} must preserve canonical choice-set partition`);

  if (authority.pricingModel) {
    if (
      group.pricing_model?.kind !== authority.pricingModel.kind
      || group.pricing_model.charge_per_units !== authority.pricingModel.charge_per_units
      || group.pricing_model.amount_minor_per_unit !== authority.pricingModel.amount_minor_per_unit
    ) {
      issue(ctx, `Modifier group ${group.id} must preserve canonical per-six-wings pricing model`);
    }
  } else if (group.pricing_model) {
    issue(ctx, `Modifier group ${group.id} must not define noncanonical group pricing`);
  }

  const expectedRefs = Object.keys(authority.options);
  const actualRefs = group.options.map((option) => option.ref);
  if (!exactArray(actualRefs, expectedRefs)) issue(ctx, `Modifier group ${group.id} must preserve canonical option membership and order`);

  const seenRefs = new Set<string>();
  for (const option of group.options) {
    if (seenRefs.has(option.ref)) issue(ctx, `Modifier group ${group.id} has duplicate option ref ${option.ref}`);
    seenRefs.add(option.ref);
    if (!(option.ref in authority.options)) continue;
    const expectedPrice = authority.options[option.ref];
    if (expectedPrice === null) {
      if (option.price) issue(ctx, `Modifier group ${group.id} option ${option.ref} must remain unpriced under group pricing`);
    } else if (option.price?.amount_minor !== expectedPrice) {
      issue(ctx, `Modifier group ${group.id} option ${option.ref} must preserve canonical price ${expectedPrice}`);
    }
  }

  if (group.source !== "owner_decision") issue(ctx, `Modifier group ${group.id} must preserve owner_decision provenance`);
}

function validateCanonicalMenu(menu: Menu): void {
  const issues: z.ZodIssue[] = [];
  const ctx: z.RefinementCtx = {
    addIssue: (entry) => issues.push(entry as z.ZodIssue),
    path: [],
  };

  const expectedCategoryIds = Object.keys(CATEGORY_AUTHORITY);
  const actualCategoryIds = menu.catalog.categories.map((category) => category.id);
  if (!exactArray(actualCategoryIds, expectedCategoryIds)) issue(ctx, "Canonical category membership/order must match the approved current menu");

  if (menu.historical_reference_boundary.notes !== "Historical menu/flavor data does not populate active current-menu data.") {
    issue(ctx, "Historical reference boundary notes must preserve canonical active/current-menu separation");
  }

  const modifierGroupsById = new Map(menu.catalog.modifier_groups.map((group) => [group.id, group] as const));

  const itemIds = new Set<string>();
  const itemCodes = new Set<string>();
  const variantIds = new Set<string>();

  for (const category of menu.catalog.categories) {
    const categoryAuthority = CATEGORY_AUTHORITY[category.id as keyof typeof CATEGORY_AUTHORITY];
    if (!categoryAuthority) {
      issue(ctx, `Unexpected canonical category ${category.id}`);
      continue;
    }
    if (category.code !== categoryAuthority.code || category.display_order !== categoryAuthority.order) issue(ctx, `Category ${category.id} must preserve canonical code/display order`);
    if (!exactArray(category.items.map((item) => item.id), categoryAuthority.items)) issue(ctx, `Category ${category.id} must preserve canonical item membership/order`);

    for (const item of category.items) {
      if (itemIds.has(item.id)) issue(ctx, `Duplicate item id ${item.id}`);
      itemIds.add(item.id);
      if (itemCodes.has(item.code)) issue(ctx, `Duplicate item code ${item.code}`);
      itemCodes.add(item.code);
      validateItem(item, category.id, modifierGroupsById, ctx);

      for (const variant of item.variants ?? []) {
        if (variantIds.has(variant.id)) issue(ctx, `Duplicate variant id ${variant.id}`);
        if (itemIds.has(variant.id)) issue(ctx, `Catalog id ${variant.id} is shared by an item and variant`);
        variantIds.add(variant.id);
        validateVariant(variant, item.id, ctx);
      }
    }
  }

  for (const itemId of itemIds) if (variantIds.has(itemId)) issue(ctx, `Catalog id ${itemId} is shared by an item and variant`);
  if (!exactArray([...itemIds], Object.keys(ITEM_AUTHORITY))) issue(ctx, "Canonical item membership must exactly match approved current menu");
  if (!exactArray([...variantIds], Object.keys(VARIANT_AUTHORITY))) issue(ctx, "Canonical variant membership must exactly match approved current menu");

  const groupIds = new Set<string>();
  for (const group of menu.catalog.modifier_groups) {
    if (groupIds.has(group.id)) issue(ctx, `Duplicate modifier group id ${group.id}`);
    groupIds.add(group.id);
    validateModifierGroup(group, ctx);
  }
  if (!exactArray([...groupIds], Object.keys(GROUP_AUTHORITY))) issue(ctx, "Canonical modifier-group membership must exactly match approved current menu");

  const catalogEntryIds = new Set([...itemIds, ...variantIds]);
  for (const group of menu.catalog.modifier_groups) {
    for (const option of group.options) if (!catalogEntryIds.has(option.ref)) issue(ctx, `Modifier group ${group.id} references missing catalog entry ${option.ref}`);
    for (const itemCode of group.eligible_order_item_codes ?? []) if (!itemCodes.has(itemCode)) issue(ctx, `Modifier group ${group.id} references missing eligible item code ${itemCode}`);
  }

  if (issues.length > 0) {
    throw new z.ZodError(issues);
  }
}

async function main() {
  const raw = await readFile(CANONICAL_MENU_PATH, "utf8");
  const parsed = CurrentMenuSchema.parse(JSON.parse(raw));
  validateCanonicalMenu(parsed);

  const itemCount = parsed.catalog.categories.reduce((count, category) => count + category.items.length, 0);
  const variantCount = parsed.catalog.categories.reduce(
    (count, category) => count + category.items.reduce((total, item) => total + (item.variants?.length ?? 0), 0),
    0,
  );

  console.log("✅ Canonical current menu OK");
  console.log("Source:", CANONICAL_MENU_PATH);
  console.log("Schema:", parsed.schema_version);
  console.log("Categories:", parsed.catalog.categories.length);
  console.log("Items:", itemCount);
  console.log("Variants:", variantCount);
  console.log("Modifier groups:", parsed.catalog.modifier_groups.length);
}

main().catch((error) => {
  console.error("❌ Canonical current menu check failed:");
  console.error(typeof error === "object" ? util.inspect(error, { depth: 10 }) : String(error));
  process.exit(1);
});
