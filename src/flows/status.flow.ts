import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import type { MenuBundleV1 } from "../menu/schema.ts";
import type { Repos } from "../repos/types.ts";

export async function statusFlow(ctx: WBContext, _menu: MenuBundleV1, _repos: Repos) {
  ctx.session.state = "S14_STATUS";
  return ctx.editMessageText("Status (scaffold).", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Home", "home:back")]]));
}
