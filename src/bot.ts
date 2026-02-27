import { Telegraf, session } from "telegraf";
import type { Context } from "telegraf";
import type { Env } from "./config/env.ts";
import { loadMenu } from "./menu/loader.ts";
import { buildRepos } from "./repos/index.ts";
import { buildTranslator } from "./i18n/index.ts";
import { initSessionMiddleware, type WBSession } from "./state/sessions.ts";
import { routeUpdate } from "./state/machine.ts";
import { makeLogger } from "./utils/log.ts";

export type WBContext = Context & {
  session: WBSession;
  env: Env;
  t: ReturnType<typeof buildTranslator>;
  log: ReturnType<typeof makeLogger>;
  wb: { menu: Awaited<ReturnType<typeof loadMenu>>; repos: Awaited<ReturnType<typeof buildRepos>> };
};

export async function buildBot(env: Env) {
  const bot = new Telegraf<WBContext>(env.BOT_TOKEN);


  // Customer contact (opens your public operator handle)
  bot.command("contact", async (ctx) => {
    const u = String(ctx.env.CONTACT_USERNAME || "callwingboss").replace(/^@/, "");
    return ctx.reply("📩 Contact Wing⚡Boss:", {
      reply_markup: { inline_keyboard: [[{ text: "@" + u, url: "https://t.me/" + u }]] }
    });
  });

  const menu = await loadMenu(env.MENU_PATH);
  const repos = await buildRepos(env);

  bot.use(async (ctx, next) => {
    (ctx as WBContext).env = env;
    (ctx as WBContext).t = buildTranslator(env.DEFAULT_LANG, Boolean(env.INCLUDE_ENGLISH_HINTS));
    (ctx as WBContext).log = makeLogger(env);
    (ctx as any).wb = { menu, repos };
    return next();
  });

  bot.use(session({ defaultSession: () => ({}) }) as any);
  bot.use(initSessionMiddleware());

  bot.start((ctx) => routeUpdate(ctx));
  bot.on("callback_query", (ctx) => routeUpdate(ctx));
  bot.on("message", (ctx) => routeUpdate(ctx));

  return bot;
}


