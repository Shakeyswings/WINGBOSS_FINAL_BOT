import "dotenv/config";
import { readFile } from "node:fs/promises";
import util from "node:util";
import { z } from "zod";

const CANONICAL_MENU_PATH = "./authoritative-sources/menu.current.json";
const SUPPORTED_SCHEMA_VERSION = "2026-08-12.current-menu.v1";
const AUTHORITATIVE_SOURCE_ARTIFACT = "authoritative-sources/00_CURRENT_MENU_APPROVED_2026-08-12.jpg";
const AUTHORITATIVE_SOURCE_DATE = "2026-08-12";

const AUTHORITATIVE_SIDE_SAUCE_ELIGIBLE = [
  "s2_jerk",
  "s3_buffalo",
  "s4_texas_bbq",
  "s5_korean",
  "s6_honey_teriyaki",
  "s7_spicy_peanut",
] as const;
const AUTHORITATIVE_SIDE_SAUCE_EXCLUDED = ["s1_fire_storm"] as const;
const REQUIRED_MODIFIER_GROUP_IDS = [
  "modifier_group_wing_flavor_upgrade",
  "modifier_group_sauce_on_the_side",
  "modifier_group_dusted_rub",
  "modifier_group_a3_boneless_upgrade",
  "modifier_group_c1_dry_rub",
  "modifier_group_c1_finish_choice",
] as const;

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

const LocationOverridesSchema = z.array(z.unknown()).max(
  0,
  "Location overrides must remain empty until explicit override semantics are implemented",
);

const VariantSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  price: MoneySchema.optional(),
  availability: AvailabilitySchema,
  modifier_groups: z.array(z.string().min(1)).default([]),
  pricing_model: VariantPricingModelSchema.optional(),
  eligible_sauces: z.array(z.string().min(1)).optional(),
  excluded_sauces: z.array(z.string().min(1)).optional(),
  source: ActiveCatalogSourceSchema.optional(),
}).passthrough().superRefine((variant, ctx) => {
  if (!variant.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Purchasable variant ${variant.code} has no authoritative price`,
    });
  }

  const seenModifierGroups = new Set<string>();
  for (const groupId of variant.modifier_groups) {
    if (seenModifierGroups.has(groupId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Variant ${variant.code} has duplicate modifier group attachment ${groupId}`,
      });
    }
    seenModifierGroups.add(groupId);
  }

  if (variant.id === "a4_sauce_on_side") {
    const eligibleSauces = variant.eligible_sauces ?? [];
    const excludedSauces = variant.excluded_sauces ?? [];
    if (
      eligibleSauces.length !== AUTHORITATIVE_SIDE_SAUCE_ELIGIBLE.length
      || AUTHORITATIVE_SIDE_SAUCE_ELIGIBLE.some((id) => !eligibleSauces.includes(id))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Variant a4_sauce_on_side must preserve the authoritative eligible sauce set",
      });
    }
    if (
      excludedSauces.length !== AUTHORITATIVE_SIDE_SAUCE_EXCLUDED.length
      || AUTHORITATIVE_SIDE_SAUCE_EXCLUDED.some((id) => !excludedSauces.includes(id))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Variant a4_sauce_on_side must preserve the authoritative Fire Storm exclusion",
      });
    }
  }
});

const CatalogItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  availability: AvailabilitySchema,
  variants: z.array(VariantSchema).optional(),
  price: MoneySchema.optional(),
  modifier_groups: z.array(z.string().min(1)).default([]),
  source: ActiveCatalogSourceSchema,
}).passthrough().superRefine((item, ctx) => {
  const hasVariants = (item.variants?.length ?? 0) > 0;
  if (!hasVariants && !item.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Purchasable catalog item ${item.code} has no authoritative price`,
    });
  }

  const seenModifierGroups = new Set<string>();
  for (const groupId of item.modifier_groups) {
    if (seenModifierGroups.has(groupId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Item ${item.code} has duplicate modifier group attachment ${groupId}`,
      });
    }
    seenModifierGroups.add(groupId);
  }

  const seenVariantCodes = new Set<string>();
  for (const variant of item.variants ?? []) {
    if (seenVariantCodes.has(variant.code)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Item ${item.code} has duplicate variant code ${variant.code}`,
      });
    }
    seenVariantCodes.add(variant.code);
  }
});

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

function optionRefMatchesGroupFamily(groupId: string, ref: string): boolean {
  switch (groupId) {
    case "modifier_group_primary_flavor":
      return /^s[1-7]_/.test(ref) || /^r[1-6]_/.test(ref);
    case "modifier_group_wing_flavor_upgrade":
      return ref === "x_add_plus_one_sauce_rub";
    case "modifier_group_sauce_on_the_side":
      return AUTHORITATIVE_SIDE_SAUCE_ELIGIBLE.includes(ref as typeof AUTHORITATIVE_SIDE_SAUCE_ELIGIBLE[number]);
    case "modifier_group_dusted_rub":
    case "modifier_group_c1_dry_rub":
    case "modifier_group_additional_dry_rub":
      return /^r[1-6]_/.test(ref);
    case "modifier_group_c1_finish_choice":
      return /^d[1-3]_/.test(ref) || /^x_dip_/.test(ref);
    case "modifier_group_additional_drizzle":
      return /^d[1-3]_/.test(ref);
    case "modifier_group_triple_drizz":
      return ref === "d4_triple_drizz";
    case "modifier_group_spice_level":
      return /^x_spice_/.test(ref);
    case "modifier_group_dips":
      return /^x_dip_/.test(ref);
    case "modifier_group_a3_boneless_upgrade":
      return ref === "x_a3_boneless_upgrade";
    default:
      return true;
  }
}

const ModifierGroupSchema = z.object({
  id: z.string().min(1),
  minimum_select: z.number().int().nonnegative(),
  maximum_select: z.number().int().nonnegative(),
  options: z.array(ModifierOptionSchema),
  pricing_model: GroupPricingModelSchema.optional(),
  eligible_order_item_codes: z.array(z.string().min(1)).optional(),
  minimum_wing_quantity: z.number().int().positive().optional(),
  choice_sets: z.array(z.array(z.string().min(1)).min(1)).optional(),
  source: ActiveCatalogSourceSchema,
}).passthrough().superRefine((group, ctx) => {
  if (group.minimum_select > group.maximum_select) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Modifier group ${group.id} has minimum_select greater than maximum_select`,
    });
  }
  if (group.maximum_select > group.options.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Modifier group ${group.id} allows more selections than available options`,
    });
  }

  if (group.pricing_model && group.id !== "modifier_group_dusted_rub") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Modifier group ${group.id} cannot use the Dusted Rub per-six-wings pricing model`,
    });
  }

  const hasOptionWithoutPrice = group.options.some((option) => !option.price);
  if (hasOptionWithoutPrice && group.id !== "modifier_group_dusted_rub") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Modifier group ${group.id} has unpriced options outside the authoritative Dusted Rub pricing model`,
    });
  }
  if (group.id === "modifier_group_dusted_rub") {
    if (!group.pricing_model || group.pricing_model.amount_minor_per_unit !== 50) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Modifier group ${group.id} must preserve the authoritative $0.50 per 6 wings amount`,
      });
    }
  }

  for (const option of group.options) {
    if (!optionRefMatchesGroupFamily(group.id, option.ref)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Modifier group ${group.id} contains option ${option.ref} outside its authoritative catalog family`,
      });
    }
  }

  if (group.id === "modifier_group_wing_flavor_upgrade") {
    if (group.minimum_wing_quantity !== 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Modifier group ${group.id} must require the authoritative minimum wing quantity of 20`,
      });
    }
    if (
      group.eligible_order_item_codes?.length !== 1
      || group.eligible_order_item_codes[0] !== "A4"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Modifier group ${group.id} must be eligible only for authoritative order item A4`,
      });
    }
  }
  if (group.id === "modifier_group_sauce_on_the_side" || group.id === "modifier_group_dusted_rub") {
    if (
      group.eligible_order_item_codes?.length !== 1
      || group.eligible_order_item_codes[0] !== "A4"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Modifier group ${group.id} must be eligible only for authoritative order item A4`,
      });
    }
  }
  if (group.id === "modifier_group_c1_finish_choice") {
    if (group.minimum_select !== 1 || group.maximum_select !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Modifier group ${group.id} must require exactly one authoritative finish choice`,
      });
    }
  }

  const optionRefs = new Set<string>();
  for (const option of group.options) {
    if (optionRefs.has(option.ref)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Modifier group ${group.id} has duplicate option ref ${option.ref}`,
      });
    }
    optionRefs.add(option.ref);
  }

  const choiceSetMembership = new Map<string, number>();
  for (const choiceSet of group.choice_sets ?? []) {
    for (const ref of choiceSet) {
      if (!optionRefs.has(ref)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Modifier group ${group.id} choice set references option ${ref} outside the authoritative option set`,
        });
      }
      const membershipCount = (choiceSetMembership.get(ref) ?? 0) + 1;
      choiceSetMembership.set(ref, membershipCount);
      if (membershipCount > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Modifier group ${group.id} assigns option ${ref} to multiple choice sets`,
        });
      }
    }
  }

  if (group.id === "modifier_group_c1_finish_choice") {
    for (const ref of optionRefs) {
      if (choiceSetMembership.get(ref) !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Modifier group ${group.id} must assign authoritative option ${ref} to exactly one choice set`,
        });
      }
    }
  }
});

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
  catalog: z.object({
    categories: z.array(CategorySchema).min(1),
    modifier_groups: z.array(ModifierGroupSchema),
    location_overrides: LocationOverridesSchema,
  }).passthrough(),
  historical_reference_boundary: z.object({
    historical_70_flavor_system: z.literal("reference_only"),
    active_customer_menu_authority: z.literal(true),
  }).passthrough(),
}).passthrough().superRefine((menu, ctx) => {
  const categoryIds = new Set<string>();
  const itemIds = new Set<string>();
  const itemCodes = new Set<string>();
  const variantIds = new Set<string>();
  const groupIds = new Set<string>();
  const groupsById = new Map(menu.catalog.modifier_groups.map((group) => [group.id, group] as const));

  for (const group of menu.catalog.modifier_groups) {
    if (groupIds.has(group.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate modifier group id: ${group.id}` });
    }
    groupIds.add(group.id);
  }
  for (const requiredGroupId of REQUIRED_MODIFIER_GROUP_IDS) {
    if (!groupIds.has(requiredGroupId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing required authoritative modifier group: ${requiredGroupId}`,
      });
    }
  }

  for (const category of menu.catalog.categories) {
    if (categoryIds.has(category.id)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate category id: ${category.id}` });
    }
    categoryIds.add(category.id);

    for (const item of category.items) {
      if (itemIds.has(item.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate item id: ${item.id}` });
      }
      itemIds.add(item.id);

      if (itemCodes.has(item.code)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate item code: ${item.code}` });
      }
      itemCodes.add(item.code);

      for (const variant of item.variants ?? []) {
        if (variantIds.has(variant.id)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate variant id: ${variant.id}` });
        }
        if (itemIds.has(variant.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Catalog id ${variant.id} is shared by an item and variant`,
          });
        }
        variantIds.add(variant.id);
      }
    }
  }

  for (const itemId of itemIds) {
    if (variantIds.has(itemId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Catalog id ${itemId} is shared by an item and variant`,
      });
    }
  }

  const catalogEntryIds = new Set([...itemIds, ...variantIds]);

  for (const category of menu.catalog.categories) {
    for (const item of category.items) {
      if (item.code === "A3" && !item.modifier_groups.includes("modifier_group_a3_boneless_upgrade")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Authoritative A3 item must attach modifier_group_a3_boneless_upgrade",
        });
      }

      if (item.code === "C1") {
        for (const requiredGroupId of ["modifier_group_c1_dry_rub", "modifier_group_c1_finish_choice"] as const) {
          if (!item.modifier_groups.includes(requiredGroupId)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Authoritative C1 item must attach ${requiredGroupId}`,
            });
          }
        }
      }

      for (const groupId of item.modifier_groups) {
        const group = groupsById.get(groupId);
        if (!group) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Item ${item.code} references missing modifier group ${groupId}`,
          });
          continue;
        }
        if (group.eligible_order_item_codes && !group.eligible_order_item_codes.includes(item.code)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Item ${item.code} attaches modifier group ${groupId} but is outside its eligibility scope`,
          });
        }
      }

      for (const variant of item.variants ?? []) {
        if (variant.id === "a4_sauce_on_side") {
          const eligibleSauces = variant.eligible_sauces ?? [];
          const excludedSauces = new Set(variant.excluded_sauces ?? []);

          for (const sauceId of eligibleSauces) {
            if (!catalogEntryIds.has(sauceId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Variant ${variant.id} references missing eligible sauce ${sauceId}`,
              });
            }
            if (excludedSauces.has(sauceId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Variant ${variant.id} lists sauce ${sauceId} as both eligible and excluded`,
              });
            }
          }

          for (const sauceId of excludedSauces) {
            if (!catalogEntryIds.has(sauceId)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Variant ${variant.id} references missing excluded sauce ${sauceId}`,
              });
            }
          }
        }

        if (variant.id === "a4_dusted_rub") {
          const dustedRubGroup = groupsById.get("modifier_group_dusted_rub");
          if (
            variant.price?.amount_minor !== 50
            || dustedRubGroup?.pricing_model?.amount_minor_per_unit !== variant.price.amount_minor
          ) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "A4 Dusted Rub variant and modifier group must agree on the authoritative $0.50 per-six-wings amount",
            });
          }
        }

        for (const groupId of variant.modifier_groups) {
          const group = groupsById.get(groupId);
          if (!group) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Variant ${variant.code} references missing modifier group ${groupId}`,
            });
            continue;
          }
          if (group.eligible_order_item_codes && !group.eligible_order_item_codes.includes(item.code)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Variant ${variant.code} of item ${item.code} attaches modifier group ${groupId} but the item is outside its eligibility scope`,
            });
          }
        }
      }
    }
  }

  for (const group of menu.catalog.modifier_groups) {
    for (const option of group.options) {
      if (!catalogEntryIds.has(option.ref)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Modifier group ${group.id} references missing catalog entry ${option.ref}`,
        });
      }
    }

    for (const itemCode of group.eligible_order_item_codes ?? []) {
      if (!itemCodes.has(itemCode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Modifier group ${group.id} references missing eligible order item code ${itemCode}`,
        });
      }
    }
  }
});

async function main() {
  const raw = await readFile(CANONICAL_MENU_PATH, "utf8");
  const parsed = CurrentMenuSchema.parse(JSON.parse(raw));

  const itemCount = parsed.catalog.categories.reduce((count, category) => count + category.items.length, 0);
  const variantCount = parsed.catalog.categories.reduce(
    (count, category) => count + category.items.reduce((itemCount, item) => itemCount + (item.variants?.length ?? 0), 0),
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
