import { Telegraf, session } from "telegraf";
import type { Context } from "telegraf";
import type { Env } from "./config/env.ts";

import { loadMenu } from "./menu/loader.ts";
import { buildRepos } from "./repos/index.ts";
import { buildTranslator } from "./i18n/index.ts";
import { initSessionMiddleware, type WBSession } from "./state/sessions.ts";
import { routeUpdate } from "./state/machine.ts";
import { makeLogger } from "./utils/log.ts";
import { renderStaffCardBody } from "./staff/card.ts";
import { staffKeyboard } from "./staff/keyboard.ts";

export type WBContext = Context & {
  session: WBSession;
  env: Env;
  t: ReturnType<typeof buildTranslator>;
  log: ReturnType<typeof makeLogger>;
};

export async function buildBot(env: Env) {
  const bot = new Telegraf<WBContext>(env.BOT_TOKEN);

  const menu = await loadMenu(env.MENU_PATH, env.MENU_FALLBACK_PATH);
  const repos = await buildRepos(env);

  bot.use(async (ctx, next) => {
    (ctx as WBContext).env = env;
    (ctx as WBContext).t = buildTranslator(env.DEFAULT_LANG, env.INCLUDE_ENGLISH_HINTS);
    (ctx as WBContext).log = makeLogger(env);
    (ctx as any).wb = { menu, repos };
    await next();
  });

  bot.use(session({ defaultSession: () => ({}) as any }));
  bot.use(initSessionMiddleware());

  bot.command("diag", async (ctx) => {
    const chatId = String(ctx.chat?.id ?? "");
    const userId = String(ctx.from?.id ?? "");
    await ctx.reply(`diag:\nchat_id=${chatId}\nuser_id=${userId}\nENV STAFF_CHAT_ID=${env.STAFF_CHAT_ID}\nENV OWNER=${env.OWNER_TELEGRAM_ID}`);
  });

  bot.command("staff_test_order", async (ctx) => {
    const userId = String(ctx.from?.id ?? "");
    if (userId !== String(env.OWNER_TELEGRAM_ID)) return ctx.reply("⛔ Owner only.");

    const draft = await repos.orders.createDraft(userId);
    draft.items = [{ sku: "test:wings:12", name_en: "Test Wings 12 pc", qty: 1, unit_price_usd: 12.5 }];
    draft.totals.food_subtotal_usd = 12.5;
    draft.totals.fees_usd = 0;
    draft.totals.grand_total_usd = 12.5;

    // Default Phnom Penh pin so Dispatch Pack always has links
    draft.delivery = {
      mode: "delivery",
      address: "Test Address",
      phone: "012345678",
      recipient_name: "Test Customer",
      location: { lat: 11.5564, lon: 104.9282 }
    };

    draft.payment = { method: "bank_transfer", proof_file_id: "TEST_PROOF_FILE_ID" };
    draft.status = "SENT_TO_STAFF";
    await repos.orders.update(draft);

    const cardBody = renderStaffCardBody(draft);

    const msg = await ctx.telegram.sendMessage(env.STAFF_CHAT_ID, cardBody, staffKeyboard(draft.order_id));
    draft.staff = { staff_chat_id: env.STAFF_CHAT_ID, staff_message_id: msg.message_id, staff_card_body: cardBody } as any;
    await repos.orders.update(draft);

    await ctx.reply(`✅ Sent staff test card.\nOrder: ${draft.order_id}\nStaff msg_id: ${msg.message_id}`);
  });

  bot.start((ctx) => routeUpdate(ctx));
  bot.on("callback_query", (ctx) => routeUpdate(ctx));
  bot.on("message", (ctx) => routeUpdate(ctx));

  return bot;
}

import { versionCommand } from "./admin/version.ts";
