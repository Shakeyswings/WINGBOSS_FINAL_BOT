import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";

export async function statusFlow(ctx: WBContext) {
  return ctx.reply("📦 Status (scaffold).", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Home", "start")]]));
}
