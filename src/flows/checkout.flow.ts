import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import { photoToFileRef } from "../utils/telegram_media.ts";

function cb(ctx: WBContext): string {
  const d = (ctx.update as any)?.callback_query?.data;
  return typeof d === "string" ? d : "";
}

function isPrivateChat(ctx: WBContext): boolean {
  return ctx.chat?.type === "private";
}

export async function checkoutFlow(ctx: WBContext) {
  const data = cb(ctx);

  if (!isPrivateChat(ctx)) {
    // DM-only: Telegram cannot request location in groups.
    const url = ctx.env.BOT_USERNAME ? `https://t.me/${ctx.env.BOT_USERNAME}` : "Open bot in private chat";
    // WB_DM_BUTTON: In groups, checkout must be done in DM (location + privacy). Provide a one-tap DM link.
    const botUser = String(ctx.env.BOT_USERNAME || "WingsBoss_bot").replace(/^@/,"");
    const url = botUser ? `https://t.me/${botUser}` : "https://t.me/";
    // Popup (existing behavior)
    ctx.answerCbQuery("DM-only. Open bot in private.", { show_alert: true }).catch(() => null);
    // Helpful message with button (new behavior)
    await ctx.reply("✅ Checkout continues in DM (private chat). Tap below:", Markup.inlineKeyboard([
      [Markup.button.url("📩 Open DM with bot", url)]
    ])).catch(() => null);
    return;
  }

  if (data === "checkout:start") {
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback("📍 Share Location", "checkout:request_location")],
      [Markup.button.callback("📸 Upload Payment Proof", "checkout:proof")],
      [Markup.button.callback("⬅️ Home", "start")]
    ]);
    return ctx.reply("Checkout (DM-only):", kb);
  }

  if (data === "checkout:request_location") {
    if (ctx.chat?.type !== "private") {
      const handle = ctx.env.BOT_USERNAME ? `@${ctx.env.BOT_USERNAME}` : "this bot";
      return ctx.reply(`📍 Location share works in private chat only.
Open ${handle} in DM and tap Checkout again.`);
    }
    return ctx.reply(
      "📍 Tap the button below to share your location (delivery).",
      Markup.keyboard([[Markup.button.locationRequest("📍 Share Location")]]).oneTime().resize()
    );
  }

  if (data === "checkout:proof") {
    return ctx.reply("Send a payment proof photo now.");
  }

  // Photo proof capture
  if ((ctx.message as any)?.photo) {
    const ref = photoToFileRef(ctx.message);
    if (!ref) return;

    // remove reply keyboard
    await ctx.reply("✅ Proof received.", Markup.removeKeyboard());
    return ctx.reply("Next: staff will confirm. (scaffold)", Markup.inlineKeyboard([[Markup.button.callback("📦 Status", "status:home")]]));
  }

  // Location capture
  const loc = (ctx.message as any)?.location;
  if (loc?.latitude && loc?.longitude) {
    await ctx.reply("✅ Location received.", Markup.removeKeyboard());
    return ctx.reply("Next: upload payment proof (if bank transfer).", Markup.inlineKeyboard([[Markup.button.callback("📸 Proof", "checkout:proof")]]));
  }
}
