import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";

export async function startFlow(ctx: WBContext) {
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback("🍗 Start Order", "edu:start")],
    [Markup.button.callback("📋 Menu", "browse:cats")],
    [Markup.button.callback("🛒 View Cart", "order:cart")],
    [Markup.button.callback("✅ Checkout", "checkout:start")],
    [Markup.button.callback("🎓 Academy", "academy:home")],
  ]);

  return ctx.reply(ctx.t.hint("សួស្តី! 😊 សូមជ្រើសរើស:", "Hi! Choose:"), kb);
}
