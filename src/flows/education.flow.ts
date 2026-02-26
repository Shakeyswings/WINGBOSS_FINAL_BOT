import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import type { MenuBundleV1 } from "../menu/schema.ts";
import type { Repos } from "../repos/types.ts";

export async function educationFlow(ctx: WBContext, _menu: MenuBundleV1, _repos: Repos) {
  ctx.session.state = "S1_EDU";
  const text = `${ctx.t("educator_note")}\n\nReady to order?`;
  return ctx.editMessageText(
    text,
    Markup.inlineKeyboard([
      [Markup.button.callback("✅ Start Order", "order:start")],
      [Markup.button.callback("⬅️ Home", "home:back")]
    ])
  );
}
