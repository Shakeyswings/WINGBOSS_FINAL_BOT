import type { WBContext } from "../bot.ts";
import { ensureOwner } from "./guards.ts";

export async function handleAdminCommands(ctx: WBContext) {
  const text = (ctx.message as any)?.text;
  if (typeof text !== "string") return;

  if (text === "/diag") {
    const chatId = String(ctx.chat?.id ?? "");
    const userId = String(ctx.from?.id ?? "");
    return ctx.reply(`diag:\nchat_id=${chatId}\nuser_id=${userId}\nENV STAFF_CHAT_ID=${ctx.env.STAFF_CHAT_ID}\nENV OWNER=${ctx.env.OWNER_TELEGRAM_ID}`);
  }

  if (text === "/staff_test_order") {
    if (!ensureOwner(ctx)) return;
    const userId = String(ctx.from?.id ?? "");
    const draft = await ctx.wb.repos.orders.createDraft(userId);
    draft.status = "SENT_TO_STAFF";
    await ctx.wb.repos.orders.update(draft);

    const { renderStaffCardBody } = await import("../staff/card.ts");
    const { Markup } = await import("telegraf");
    const body = renderStaffCardBody(draft);
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback("✅ Accept", `staff:accept:${draft.order_id}`), Markup.button.callback("❌ Reject", `staff:reject:${draft.order_id}`)],
      [Markup.button.callback("🔥 Cooking", `staff:cooking:${draft.order_id}`), Markup.button.callback("✅ Ready", `staff:ready:${draft.order_id}`)],
      [Markup.button.callback("🚗 Book Driver", `staff:dispatch:${draft.order_id}`), Markup.button.callback("📦 Picked", `staff:picked:${draft.order_id}`)],
      [Markup.button.callback("🏁 Delivered", `staff:delivered:${draft.order_id}`), Markup.button.callback("⚠️ Issue", `staff:issue:${draft.order_id}`)],
      [Markup.button.callback("📋 Dispatch Pack", `staff:pack:${draft.order_id}`)],
    ]);

    const msg = await ctx.telegram.sendMessage(ctx.env.STAFF_CHAT_ID, body, kb);
    draft.staff = { staff_chat_id: ctx.env.STAFF_CHAT_ID, staff_message_id: msg.message_id, staff_card_body: body };
    await ctx.wb.repos.orders.update(draft);

    return ctx.reply(`✅ Sent staff test card.\nOrder: ${draft.order_id}\nStaff msg_id: ${msg.message_id}`);
  }
}
