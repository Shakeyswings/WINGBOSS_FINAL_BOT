import "dotenv/config";
import { readFile } from "node:fs/promises";
import util from "node:util";
import { z } from "zod";

const CANONICAL_MENU_PATH = "./authoritative-sources/menu.current.json";

const MoneySchema = z.object({
  currency: z.literal("USD"),
  amount_minor: z.number().int().nonnegative(),
});

const AvailabilitySchema = z.object({
  status: z.string().min(1),
});

const VariantSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  price: MoneySchema.optional(),
  availability: AvailabilitySchema,
}).passthrough();

const CatalogItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  availability: AvailabilitySchema,
  variants: z.array(VariantSchema).optional(),
  price: MoneySchema.optional(),
  modifier_groups: z.array(z.string()).default([]),
}).passthrough().superRefine((item, ctx) => {
  const hasPrice = Boolean(item.price);
  const hasPricedVariant = item.variants?.some((variant) => Boolean(variant.price)) ?? false;
  if (!hasPrice && !hasPricedVariant) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Purchasable catalog item ${item.code} has no price or priced variant`,
    });
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
  id: z.string().min(1),
  price: MoneySchema.optional(),
}).passthrough();

const ModifierGroupSchema = z.object({
  id: z.string().min(1),
  options: z.array(ModifierOptionSchema),
}).passthrough();

const CurrentMenuSchema = z.object({
  schema_version: z.string().min(1),
  authority_status: z.literal("ACTIVE_CURRENT_MENU"),
  source_artifact: z.string().min(1),
  source_date: z.string().min(1),
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
  const groupIds = new Set(menu.catalog.modifier_groups.map((group) => group.id));

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

      for (const groupId of item.modifier_groups) {
        if (!groupIds.has(groupId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Item ${item.code} references missing modifier group ${groupId}`,
          });
        }
      }
    }
  }
});

async function main() {
  const raw = await readFile(CANONICAL_MENU_PATH, "utf8");
  const parsed = CurrentMenuSchema.parse(JSON.parse(raw));

  const itemCount = parsed.catalog.categories.reduce((count, category) => count + category.items.length, 0);
  console.log("✅ Canonical current menu OK");
  console.log("Source:", CANONICAL_MENU_PATH);
  console.log("Schema:", parsed.schema_version);
  console.log("Categories:", parsed.catalog.categories.length);
  console.log("Items:", itemCount);
  console.log("Modifier groups:", parsed.catalog.modifier_groups.length);
}

main().catch((error) => {
  console.error("❌ Canonical current menu check failed:");
  console.error(typeof error === "object" ? util.inspect(error, { depth: 10 }) : String(error));
  process.exit(1);
});
