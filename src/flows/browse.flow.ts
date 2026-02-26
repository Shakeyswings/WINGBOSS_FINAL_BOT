import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import type { MenuBundleV1 } from "../menu/schema.ts";
import type { Repos } from "../repos/types.ts";

export async function browseFlow(ctx: WBContext, menu: MenuBundleV1, _repos: Repos) {
  ctx.session.state = "S2_BROWSE";
  const data = String((ctx.update as any)?.callback_query?.data ?? "browse:root");
  const [, sub, id] = data.split(":");

  if (!sub || sub === "root") {
    const rows = menu.catalog.categories.map((c) => [Markup.button.callback(`${c.emoji} ${c.name_en}`, `browse:cat:${c.id}`)]);
    rows.push([Markup.button.callback("⬅️ Home", "home:back")]);
    return ctx.editMessageText("Browse menu — pick a category:", Markup.inlineKeyboard(rows));
  }

  if (sub === "cat") {
    const cat = menu.catalog.categories.find((c) => c.id === id);
    if (!cat) return ctx.editMessageText("Not found.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "browse:root")]]));
    return ctx.editMessageText(`${cat.emoji} ${cat.name_en}\n\n(Items wiring next)`, Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "browse:root")]]));
  }

  return ctx.editMessageText("Browse", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Home", "home:back")]]));
}
