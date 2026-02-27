import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";

function cb(ctx: WBContext): string {
  const d = (ctx.update as any)?.callback_query?.data;
  return typeof d === "string" ? d : "";
}

export async function orderFlow(ctx: WBContext) {
  const data = cb(ctx);
  if (data.startsWith("order:add:")) {
    // scaffold: adds one test item
    ctx.session.cart = ctx.session.cart ?? { items: [] };
    ctx.session.cart.items.push({ sku: "test:wings12", qty: 1 });
    return ctx.reply("✅ Added to cart.", Markup.inlineKeyboard([[Markup.button.callback("🛒 View Cart", "order:cart")]]));
  }
  if (data === "order:cart") {
    const items = ctx.session.cart?.items ?? [];
    const lines = items.length ? items.map((i) => `• ${i.sku} × ${i.qty}`).join("\n") : "(empty)";
    return ctx.reply(`🛒 Cart\n${lines}`, Markup.inlineKeyboard([
      [Markup.button.callback("✅ Checkout", "checkout:start")],
      [Markup.button.callback("⬅️ Home", "start")]
    ]));
  }
  return ctx.reply("Order flow (scaffold).");
}
