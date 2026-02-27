import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";

export async function browseFlow(ctx: WBContext) {
  const cats = ctx.wb.menu.catalog.categories;
  const rows = cats.slice(0, 8).map((c) => [
    Markup.button.callback(`${c.emoji} ${c.name_en}`, `order:add:${c.id}`)
  ]);
  rows.push([Markup.button.callback("⬅️ Home", "start")]);
  return ctx.reply("Browse categories (scaffold):", Markup.inlineKeyboard(rows));
}
