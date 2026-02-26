import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import type { MenuBundleV1 } from "../menu/schema.ts";
import type { Repos } from "../repos/types.ts";

export async function orderFlow(ctx: WBContext, _menu: MenuBundleV1, repos: Repos) {
  const data = String((ctx.update as any)?.callback_query?.data ?? "order:start");
  const [, step, a, b] = data.split(":");

  if (!step || step === "start") {
    ctx.session.state = "S5_CHECKOUT";
    const userId = String(ctx.from?.id ?? "");
    const draft = await repos.orders.createDraft(userId);
    ctx.session.draft_order_id = draft.order_id;

    return ctx.editMessageText(
      "Choose wing type:",
      Markup.inlineKeyboard([
        [Markup.button.callback("🦴 Bone-in", "order:type:bone_in")],
        [Markup.button.callback("🍗 Boneless", "order:type:boneless")],
        [Markup.button.callback("⬅️ Home", "home:back")]
      ])
    );
  }

  if (step === "type") {
    return ctx.editMessageText(
      "Choose count:",
      Markup.inlineKeyboard([
        [Markup.button.callback("6", `order:size:6:${a}`), Markup.button.callback("12", `order:size:12:${a}`)],
        [Markup.button.callback("20", `order:size:20:${a}`)],
        [Markup.button.callback("⬅️ Back", "order:start")]
      ])
    );
  }

  if (step === "size") {
    const size = a!;
    const wingType = b as "bone_in" | "boneless";
    const oid = ctx.session.draft_order_id;
    if (!oid) return ctx.editMessageText("No draft. Restart.", Markup.inlineKeyboard([[Markup.button.callback("✅ Start", "order:start")]]));

    const order = await repos.orders.get(oid);
    if (!order) return ctx.editMessageText("Draft missing. Restart.", Markup.inlineKeyboard([[Markup.button.callback("✅ Start", "order:start")]]));

    const base = wingType === "boneless" ? 9.5 : 6.75;
    order.items = [{ sku: `wings:${wingType}:${size}`, name_en: `Wings ${wingType} ${size} pc`, qty: 1, unit_price_usd: base, meta: { wingType, size } }];
    order.totals.food_subtotal_usd = base;
    order.totals.fees_usd = 0;
    order.totals.grand_total_usd = base;
    await repos.orders.update(order);

    return ctx.editMessageText("✅ Added to cart.", Markup.inlineKeyboard([[Markup.button.callback("🛒 View Cart", "checkout:cart")],[Markup.button.callback("⬅️ Home", "home:back")]]));
  }

  return ctx.editMessageText("Order", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Home", "home:back")]]));
}
