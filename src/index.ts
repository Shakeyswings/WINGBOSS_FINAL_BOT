import "dotenv/config";
import { loadEnv } from "./config/index.ts";
import { buildBot } from "./bot.ts";

async function main() {
  const env = loadEnv(process.env);
  console.log("✅ Boot:", { RUNTIME_MODE: env.RUNTIME_MODE, BACKEND_MODE: env.BACKEND_MODE, FAILOVER_MODE: env.FAILOVER_MODE });

  const bot = await buildBot(env);
  await 
/* WB_DEBUG_INCOMING */
bot.on("message", async (ctx, next) => {
  try {
    const chatId = ctx.chat?.id;
    const threadId = ctx.message?.message_thread_id;
    const text = ctx.message?.text;
    if (text) console.log("[MSG]", { chatId, threadId, text });
  } catch {}
  return next();
});

bot.on("callback_query", async (ctx, next) => {
  try {
    const chatId = ctx.chat?.id;
    const threadId = (ctx.callbackQuery && "message" in ctx.callbackQuery) ? (ctx.callbackQuery.message?.message_thread_id) : undefined;
    const data = (ctx.callbackQuery && "data" in ctx.callbackQuery) ? ctx.callbackQuery.data : undefined;
    if (data) console.log("[CB]", { chatId, threadId, data });
  } catch {}
  return next();
});
/* /WB_DEBUG_INCOMING */

bot.launch({ dropPendingUpdates: true });
  console.log("✅ Bot launched (long-polling)");

  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}

main().catch((e) => { console.error(e); process.exit(1); });
