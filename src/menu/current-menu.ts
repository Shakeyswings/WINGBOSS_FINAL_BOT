import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

export const CURRENT_MENU_PATH = "./authoritative-sources/menu.current.json";

const MoneySchema = z.object({
  currency: z.literal("USD"),
  amount_minor: z.number().int().nonnegative()
});

const AvailabilitySchema = z.object({
  status: z.string().min(1)
});

const VariantSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  price: MoneySchema.optional(),
  availability: AvailabilitySchema
}).passthrough();

const CatalogItemSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  display_name: z.string().optional(),
  type: z.string().optional(),
  price: MoneySchema.optional(),
  variants: z.array(VariantSchema).optional(),
  modifier_groups: z.array(z.string()).default([])
}).passthrough();

const CategorySchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  display_order: z.number().int(),
  items: z.array(CatalogItemSchema)
}).passthrough();

const ModifierOptionSchema = z.object({
  ref: z.string().min(1),
  price: MoneySchema.optional()
}).passthrough();

const ModifierGroupSchema = z.object({
  id: z.string().min(1),
  code: z.string().optional(),
  name: z.string().min(1),
  options: z.array(ModifierOptionSchema)
}).passthrough();

export const CurrentMenuSchema = z.object({
  schema_version: z.string().min(1),
  authority_status: z.literal("ACTIVE_CURRENT_MENU"),
  source_artifact: z.string().min(1),
  source_date: z.string().min(1),
  currency: z.object({
    code: z.literal("USD"),
    amount_minor_unit: z.literal(2),
    representation: z.literal("amount_minor")
  }),
  scope: z.object({
    business_scope: z.string().min(1),
    location_override_policy: z.string().min(1)
  }).passthrough(),
  catalog: z.object({
    categories: z.array(CategorySchema).min(1),
    modifier_groups: z.array(ModifierGroupSchema)
  }).passthrough(),
  historical_reference_boundary: z.object({
    historical_70_flavor_system: z.literal("reference_only"),
    active_customer_menu_authority: z.literal(true)
  }).passthrough()
}).passthrough();

export type CurrentMenuDocument = z.infer<typeof CurrentMenuSchema>;

export type CurrentMenuItemEntry = {
  id: string;
  label: string;
  price_minor: number | null;
  categoryCode: string;
};

export type CurrentMenuOptionEntry = {
  id: string;
  label: string;
  price_minor: number | null;
  groupId: string;
};

export type CurrentMenuIndex = {
  menu: CurrentMenuDocument;
  itemsById: Map<string, CurrentMenuItemEntry>;
  optionsById: Map<string, CurrentMenuOptionEntry>;
  groupsById: Map<string, ModifierGroupSchemaType>;
};

type ModifierGroupSchemaType = z.infer<typeof ModifierGroupSchema>;

let cached: { path: string; mtimeMs: number; index: CurrentMenuIndex } | null = null;

function resolveFilePath(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
}

function labelForItem(item: z.infer<typeof CatalogItemSchema>): string {
  return String(item.display_name ?? item.name ?? item.code ?? item.id);
}

function priceMinorForPrice(price?: z.infer<typeof MoneySchema>): number | null {
  return price ? price.amount_minor : null;
}

export function buildCurrentMenuIndex(menu: CurrentMenuDocument): CurrentMenuIndex {
  const itemsById = new Map<string, CurrentMenuItemEntry>();
  const optionsById = new Map<string, CurrentMenuOptionEntry>();
  const groupsById = new Map<string, ModifierGroupSchemaType>();

  for (const category of menu.catalog.categories) {
    for (const item of category.items) {
      itemsById.set(item.id, {
        id: item.id,
        label: labelForItem(item),
        price_minor: priceMinorForPrice(item.price),
        categoryCode: category.code
      });
    }
  }

  for (const group of menu.catalog.modifier_groups) {
    groupsById.set(group.id, group);
    for (const option of group.options) {
      const item = itemsById.get(option.ref);
      optionsById.set(option.ref, {
        id: option.ref,
        label: item?.label ?? option.ref,
        price_minor: option.price?.amount_minor ?? item?.price_minor ?? null,
        groupId: group.id
      });
    }
  }

  return { menu, itemsById, optionsById, groupsById };
}

export function loadCurrentMenuDocument(filePath = CURRENT_MENU_PATH): CurrentMenuDocument {
  return getCurrentMenuIndex(filePath).menu;
}

export function getCurrentMenuIndex(filePath = CURRENT_MENU_PATH): CurrentMenuIndex {
  const absolute = resolveFilePath(filePath);
  const stat = fs.statSync(absolute);

  if (cached && cached.path === absolute && cached.mtimeMs === stat.mtimeMs) {
    return cached.index;
  }

  const menu = CurrentMenuSchema.parse(JSON.parse(fs.readFileSync(absolute, "utf8")));
  const index = buildCurrentMenuIndex(menu);
  cached = { path: absolute, mtimeMs: stat.mtimeMs, index };
  return index;
}

export function getCurrentMenuItemEntry(ref: string, filePath = CURRENT_MENU_PATH): CurrentMenuItemEntry | null {
  return getCurrentMenuIndex(filePath).itemsById.get(ref) ?? null;
}

export function getCurrentMenuOptionEntry(ref: string, filePath = CURRENT_MENU_PATH): CurrentMenuOptionEntry | null {
  return getCurrentMenuIndex(filePath).optionsById.get(ref) ?? null;
}

export function getCurrentMenuGroupOptions(groupId: string, filePath = CURRENT_MENU_PATH): CurrentMenuOptionEntry[] {
  const index = getCurrentMenuIndex(filePath);
  const group = index.groupsById.get(groupId);
  if (!group) return [];
  return group.options.map((option) => {
    const item = index.itemsById.get(option.ref);
    return {
      id: option.ref,
      label: item?.label ?? option.ref,
      price_minor: option.price?.amount_minor ?? item?.price_minor ?? null,
      groupId: group.id
    };
  });
}

export function getCurrentMenuItemsByCategoryCode(categoryCode: string, filePath = CURRENT_MENU_PATH): CurrentMenuItemEntry[] {
  return [...getCurrentMenuIndex(filePath).itemsById.values()].filter((item) => item.categoryCode === categoryCode);
}
