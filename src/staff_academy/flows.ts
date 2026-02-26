import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";

function staffId(ctx: WBContext) {
  return String(ctx.from?.id ?? "");
}

function isAllowed(ctx: WBContext) {
  const id = staffId(ctx);
  if (id === String(ctx.env.OWNER_TELEGRAM_ID)) return true;

  const csv = String((ctx.env as any).STAFF_ALLOWLIST_IDS ?? "");
  const allow = new Set(csv.split(",").map((s) => s.trim()).filter(Boolean));
  return allow.has(id);
}

export async function academyFlow(ctx: WBContext) {
  if (!isAllowed(ctx)) return ctx.reply("⛔ Staff Academy is gated.");

  const data = String((ctx.update as any)?.callback_query?.data ?? "academy:home");
  const [, step] = data.split(":");

  if (step === "home") {
    return ctx.reply(
      "🎓 Staff Academy\nTrain → Drill → Verify → Certify",
      Markup.inlineKeyboard([
        [Markup.button.callback("📘 Modules (coming soon)", "academy:coming")],
        [Markup.button.callback("🧾 My Progress (coming soon)", "academy:coming")]
      ])
    );
  }

  return ctx.reply("✅ Academy scaffold installed. More modules coming next.");
}
