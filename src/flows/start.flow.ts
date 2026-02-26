import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import type { MenuBundleV1 } from "../menu/schema.ts";
import type { Repos } from "../repos/types.ts";

function cb(ctx: WBContext): string {
  return String((ctx.update as any)?.callback_query?.data ?? "");
}

export async function startFlow(ctx: WBContext, _menu: MenuBundleV1, repos: Repos) {
  const data = cb(ctx);

  if (data === "home:help") {
    return ctx.editMessageText(ctx.t("help_contact"), Markup.inlineKeyboard([[Markup.button.callback("⬅️ Home", "home:back")]]));
  }
  if (data === "home:currency") {
    return ctx.editMessageText(ctx.t("currency_note"), Markup.inlineKeyboard([[Markup.button.callback("⬅️ Home", "home:back")]]));
  }

  const userId = String(ctx.from?.id ?? "");
  const lang = ctx.session.lang ?? ctx.env.DEFAULT_LANG;
  ctx.session.lang = lang;

  await repos.users.getOrCreate(userId, lang);

  const text = [
    ctx.t("home_title"),
    ctx.env.BUSY_MODE ? `\n\n${ctx.t("busy")}` : "",
    `\n\n${ctx.t("start_here")}`
  ].join("");

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback(ctx.t("btn_order_now"), "order:start")],
    [Markup.button.callback(ctx.t("btn_browse"), "browse:root")],
    [Markup.button.callback(ctx.t("btn_cart"), "checkout:cart")],
    [Markup.button.callback(ctx.t("btn_currency"), "home:currency"), Markup.button.callback(ctx.t("btn_help"), "home:help")]
  ]);

  if ((ctx.update as any).callback_query) await ctx.editMessageText(text, kb);
  else await ctx.reply(text, kb);

  ctx.session.state = "S0_HOME";
}
