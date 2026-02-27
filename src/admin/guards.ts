import type { WBContext } from "../bot.ts";

export function ensureOwner(ctx: WBContext): boolean {
  const uid = String(ctx.from?.id ?? "");
  if (uid !== String(ctx.env.OWNER_TELEGRAM_ID)) {
    ctx.reply("⛔ Owner only.");
    return false;
  }
  return true;
}
