import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import { loadMenu, getTelegramFlavors } from "../menu/loader.ts";

/**
 * Minimal, production-safe menu-driven order flow:
 * - Categories -> Items -> Item detail -> (Wings only) Flavor picker -> Add to cart
 * - Keeps UX tight; avoids dumping full menu early.
 */

type MenuAny = any;

function cb(ctx: WBContext): string {
  const d = (ctx.update as any)?.callback_query?.data;
  return typeof d === "string" ? d : "";
}

function isWingsCategory(cat: any): boolean {
  const id = String(cat?.id ?? "").toLowerCase();
  const name = String(cat?.name_en ?? cat?.name ?? "").toLowerCase();
  return id.includes("wing") || name.includes("wing");
}

function isWingsItem(item: any, cat?: any): boolean {
  const id = String(item?.id ?? item?.sku ?? "").toLowerCase();
  const name = String(item?.name_en ?? item?.name ?? "").toLowerCase();
  const kind = String(item?.kind ?? item?.type ?? "").toLowerCase();
  return kind.includes("wing") || id.includes("wing") || name.includes("wing") || (cat ? isWingsCategory(cat) : false);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getMenu(ctx: WBContext): Promise<MenuAny> {
  // Always load from configured path; loader should cache internally.
  return loadMenu(ctx.env.MENU_PATH);
}

function getCategories(menu: MenuAny): any[] {
  const cats =
    (menu?.catalog?.categories && Array.isArray(menu.catalog.categories) ? menu.catalog.categories : null) ||
    (menu?.categories && Array.isArray(menu.categories) ? menu.categories : null) ||
    [];
  return cats;
}

function getAllItems(menu: MenuAny): any[] {
  const items =
    (menu?.catalog?.items && Array.isArray(menu.catalog.items) ? menu.catalog.items : null) ||
    (menu?.items && Array.isArray(menu.items) ? menu.items : null) ||
    [];
  return items;
}

function buildItemIndex(items: any[]): Map<string, any> {
  const m = new Map<string, any>();
  for (const it of items) {
    const id = String(it?.id ?? it?.sku ?? "");
    if (id) m.set(id, it);
  }
  return m;
}

function itemsForCategory(menu: MenuAny, cat: any): any[] {
  // Supports:
  // - cat.items: embedded item objects
  // - cat.item_ids: ids referencing catalog.items
  // - cat.skus: ids referencing catalog.items
  if (Array.isArray(cat?.items)) return cat.items;

  const allItems = getAllItems(menu);
  const idx = buildItemIndex(allItems);

  const ids =
    (Array.isArray(cat?.item_ids) ? cat.item_ids : null) ||
    (Array.isArray(cat?.skus) ? cat.skus : null) ||
    [];

  const resolved = ids.map((x: any) => idx.get(String(x))).filter(Boolean);
  if (resolved.length) return resolved;

  // fallback: filter items by category_id
  const catId = String(cat?.id ?? "");
  return allItems.filter((it) => String(it?.category_id ?? it?.category ?? "") === catId);
}

function fmtName(ctx: WBContext, obj: any): string {
  // Khmer priority if present
  const km = String(obj?.name_km ?? obj?.km ?? "").trim();
  const en = String(obj?.name_en ?? obj?.name ?? obj?.en ?? "").trim();
  const lang = (ctx.session.lang ?? ctx.env.DEFAULT_LANG) === "km" ? "km" : "en";
  if (lang === "km" && km) return km;
  return en || km || "-";
}

function cartInit(ctx: WBContext) {
  ctx.session.cart = ctx.session.cart ?? { items: [] as any[] };
}

function addToCart(ctx: WBContext, line: any) {
  cartInit(ctx);
  ctx.session.cart!.items.push(line);
}

function cartLines(ctx: WBContext): string {
  const items = ctx.session.cart?.items ?? [];
  if (!items.length) return "(empty)";
  return items
    .map((it: any, i: number) => {
      const flavor = it?.flavor_display ? ` — ${it.flavor_display}` : "";
      return `${i + 1}) ${it.name ?? it.item_id ?? it.sku}${flavor} × ${it.qty ?? 1}`;
    })
    .join("\n");
}

function kb(rows: any[][]) {
  return Markup.inlineKeyboard(rows);
}

export async function orderFlow(ctx: WBContext) {
  const data = cb(ctx);
  const menu = await getMenu(ctx);

  // default entry
  if (!data || data === "order" || data === "order:home") {
    const cats = getCategories(menu);
    if (!cats.length) return ctx.reply("⚠️ Menu categories missing.");
    const rows = cats.slice(0, 8).map((c) => [Markup.button.callback(`🍽️ ${fmtName(ctx, c)}`, `order:cat:${c.id}`)]);
    rows.push([Markup.button.callback("🛒 View Cart", "order:cart")]);
    rows.push([Markup.button.callback("⬅️ Home", "start")]);
    return ctx.reply("Choose a category:", kb(rows));
  }

  if (data === "order:cart") {
    return ctx.reply(`🛒 Cart\n${cartLines(ctx)}`, kb([
      [Markup.button.callback("✅ Checkout", "checkout:start")],
      [Markup.button.callback("⬅️ Categories", "order:home")]
    ]));
  }

  // Category -> list items
  if (data.startsWith("order:cat:")) {
    const catId = data.split(":")[2] ?? "";
    const cats = getCategories(menu);
    const cat = cats.find((c) => String(c.id) === String(catId));
    if (!cat) return ctx.reply("⚠️ Category not found.", kb([[Markup.button.callback("⬅️ Categories", "order:home")]]));

    const items = itemsForCategory(menu, cat);
    if (!items.length) return ctx.reply("⚠️ No items in this category.", kb([[Markup.button.callback("⬅️ Categories", "order:home")]]));

    // show first 10
    const page = 0;
    const pages = chunk(items, 10);
    const rows = pages[page].map((it) => {
      const label = fmtName(ctx, it);
      const id = String(it?.id ?? it?.sku ?? "");
      return [Markup.button.callback(label, `order:item:${catId}:${id}`)];
    });
    if (pages.length > 1) rows.push([Markup.button.callback("➡️ Next", `order:cat_page:${catId}:1`)]);
    rows.push([Markup.button.callback("⬅️ Categories", "order:home"), Markup.button.callback("🛒 Cart", "order:cart")]);
    return ctx.reply(`📂 ${fmtName(ctx, cat)}`, kb(rows));
  }

  if (data.startsWith("order:cat_page:")) {
    const [, , catId, pageStr] = data.split(":");
    const page = Math.max(0, Number(pageStr ?? "0"));
    const cats = getCategories(menu);
    const cat = cats.find((c) => String(c.id) === String(catId));
    if (!cat) return ctx.reply("⚠️ Category not found.", kb([[Markup.button.callback("⬅️ Categories", "order:home")]]));

    const items = itemsForCategory(menu, cat);
    const pages = chunk(items, 10);
    const p = Math.min(page, pages.length - 1);

    const rows = pages[p].map((it) => {
      const label = fmtName(ctx, it);
      const id = String(it?.id ?? it?.sku ?? "");
      return [Markup.button.callback(label, `order:item:${catId}:${id}`)];
    });

    const nav: any[] = [];
    if (p > 0) nav.push(Markup.button.callback("⬅️ Prev", `order:cat_page:${catId}:${p - 1}`));
    if (p < pages.length - 1) nav.push(Markup.button.callback("➡️ Next", `order:cat_page:${catId}:${p + 1}`));
    if (nav.length) rows.push(nav);
    rows.push([Markup.button.callback("⬅️ Categories", "order:home"), Markup.button.callback("🛒 Cart", "order:cart")]);

    return ctx.reply(`📂 ${fmtName(ctx, cat)} (page ${p + 1}/${pages.length})`, kb(rows));
  }

  // Item detail -> if wings, go to flavor picker; else add directly
  if (data.startsWith("order:item:")) {
    const [, , catId, itemId] = data.split(":");
    const cats = getCategories(menu);
    const cat = cats.find((c) => String(c.id) === String(catId));
    const items = cat ? itemsForCategory(menu, cat) : getAllItems(menu);
    const item = items.find((it) => String(it?.id ?? it?.sku ?? "") === String(itemId));
    if (!item) return ctx.reply("⚠️ Item not found.", kb([[Markup.button.callback("⬅️ Back", `order:cat:${catId}`)]]));

    const name = fmtName(ctx, item);
    const isWings = isWingsItem(item, cat);

    if (isWings) {
      // route to flavor selection (page 0)
      return ctx.reply(
        `🍗 ${name}\nChoose a flavor:`,
        kb([
          [Markup.button.callback("🌶️ Pick Flavor", `order:flavor:${itemId}:0`)],
          [Markup.button.callback("⬅️ Back", `order:cat:${catId}`), Markup.button.callback("🛒 Cart", "order:cart")]
        ])
      );
    }

    // non-wings: add directly (qty 1)
    addToCart(ctx, { item_id: itemId, name, qty: 1 });
    return ctx.reply("✅ Added to cart.", kb([
      [Markup.button.callback("🛒 View Cart", "order:cart")],
      [Markup.button.callback("⬅️ Continue", `order:cat:${catId}`)]
    ]));
  }

  // Flavor picker for wings (uses menu.catalog.flavors normalized + filtered)
  if (data.startsWith("order:flavor:")) {
    const [, , itemId, pageStr] = data.split(":");
    const page = Math.max(0, Number(pageStr ?? "0"));

    const flavors = getTelegramFlavors(menu); // already filters in-house-only
    const pages = chunk(flavors, 12);
    const p = Math.min(page, pages.length - 1);

    const rows = pages[p].map((f: any) => {
      const label = `${f.token} ${f.name}`;
      return [Markup.button.callback(label, `order:add_wings:${itemId}:${f.number}`)];
    });

    const nav: any[] = [];
    if (p > 0) nav.push(Markup.button.callback("⬅️ Prev", `order:flavor:${itemId}:${p - 1}`));
    if (p < pages.length - 1) nav.push(Markup.button.callback("➡️ Next", `order:flavor:${itemId}:${p + 1}`));
    if (nav.length) rows.push(nav);

    rows.push([Markup.button.callback("🛒 Cart", "order:cart"), Markup.button.callback("⬅️ Categories", "order:home")]);
    return ctx.reply(`🌶️ Choose flavor (page ${p + 1}/${pages.length})`, kb(rows));
  }

  // Add wings line with selected flavor number
  if (data.startsWith("order:add_wings:")) {
    const [, , itemId, flavorNumStr] = data.split(":");
    const flavorNum = Number(flavorNumStr ?? "0");
    const flavors = getTelegramFlavors(menu);
    const f = flavors.find((x: any) => Number(x.number) === flavorNum);

    const allItems = getAllItems(menu);
    const idx = buildItemIndex(allItems);
    const item = idx.get(String(itemId));
    const name = item ? fmtName(ctx, item) : `Wings ${itemId}`;

    addToCart(ctx, {
      item_id: itemId,
      name,
      qty: 1,
      flavor_number: flavorNum,
      flavor_display: f ? `${f.token} ${f.name}` : `#${flavorNum}`
    });

    return ctx.reply("✅ Added wings to cart.", kb([
      [Markup.button.callback("🛒 View Cart", "order:cart")],
      [Markup.button.callback("➕ Add More", "order:home")]
    ]));
  }

  return ctx.reply("Order flow.", kb([[Markup.button.callback("⬅️ Categories", "order:home")]]));
}
