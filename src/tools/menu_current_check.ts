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
  const hasOptionWithoutPrice = group.options.some((option) => !option.price);
  if (hasOptionWithoutPrice && !group.pricing_model) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Modifier group ${group.id} has unpriced options without an authoritative pricing model`,
    });
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