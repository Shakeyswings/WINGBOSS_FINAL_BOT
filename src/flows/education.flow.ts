import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";

export async function educationFlow(ctx: WBContext) {
  const kb = Markup.inlineKeyboard([
    [Markup.button.callback("✅ Order Now", "browse:cats")],
    [Markup.button.callback("⬅️ Back", "start")],
  ]);
  return ctx.reply(
    ctx.t.hint(
      "Hand-Cut Daily • Never Frozen\nចាប់ផ្តើមពី Best Sellers មុន។",
      "Hand-Cut Daily • Never Frozen\nStart with Best Sellers first."
    ),
    kb
  );
}
