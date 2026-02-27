import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import { renderStaffCardBody, replaceStatusLine } from "./card.ts";
import { buildDispatchPack } from "./dispatch_pack.ts";

const ALLOWED_SEQ: Record<string, string[]> = {
  SENT_TO_STAFF: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["COOKING"],
  COOKING: ["READY"],
  READY: ["DISPATCHED"],
  DISPATCHED: ["PICKED"],
  PICKED: ["DELIVERED"],
};

function cb(ctx: WBContext): string {
  const d = (ctx.update as any)?.callback_query?.data;
  return typeof d === "string" ? d : "";
}

function okNext(current: string, next: string): boolean {
  const allowed = ALLOWED_SEQ[current] ?? [];
  return allowed.includes(next);
}

function kb(orderId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("✅ Accept", `staff:accept:${orderId}`), Markup.button.callback("❌ Reject", `staff:reject:${orderId}`)],
    [Markup.button.callback("🔥 Cooking", `staff:cooking:${orderId}`), Markup.button.callback("✅ Ready", `staff:ready:${orderId}`)],
    [Markup.button.callback("🚗 Book Driver", `staff:dispatch:${orderId}`), Markup.button.callback("📦 Picked", `staff:picked:${orderId}`)],
    [Markup.button.callback("🏁 Delivered", `staff:delivered:${orderId}`), Markup.button.callback("⚠️ Issue", `staff:issue:${orderId}`)],
    [Markup.button.callback("📋 Dispatch Pack", `staff:pack:${orderId}`)],
  ]);
}

export async function handleStaffAction(ctx: WBContext) {
  const data = cb(ctx);
  if (!data.startsWith("staff:")) return;

  const [, action, orderId] = data.split(":");
  const order = await ctx.wb.repos.orders.get(orderId);
  if (!order) return ctx.answerCbQuery("Order not found", { show_alert: true });

  // Acknowledge quickly
  await ctx.answerCbQuery();

  const map: Record<string, string> = {
    accept: "ACCEPTED",
    reject: "REJECTED",
    cooking: "COOKING",
    ready: "READY",
    dispatch: "DISPATCHED",
    picked: "PICKED",
    delivered: "DELIVERED",
    issue: "ISSUE",
  };

  if (action === "pack") {
    const pack = await buildDispatchPack(order, ctx.env);
    await ctx.reply(pack);
    return;
  }

  const next = map[action] ?? "";
  if (!next) return ctx.reply("Unknown action.");

  if (!okNext(order.status, next) && !(order.status === "SENT_TO_STAFF" && (next === "ACCEPTED" || next === "REJECTED"))) {
    return ctx.answerCbQuery("❌ Invalid sequence", { show_alert: true });
  }

  // edit card message if possible
  order.status = next as any;
  await ctx.wb.repos.orders.update(order);

  if (ctx.callbackQuery?.message && "message_id" in ctx.callbackQuery.message) {
    const msgId = (ctx.callbackQuery.message as any).message_id;
    const chatId = (ctx.callbackQuery.message as any).chat.id;
    const currentBody = order.staff?.staff_card_body ?? renderStaffCardBody(order);
    const nextBody = replaceStatusLine(currentBody, order.status);
    order.staff = { staff_chat_id: chatId, staff_message_id: msgId, staff_card_body: nextBody };
    await ctx.wb.repos.orders.update(order);
    await ctx.telegram.editMessageText(chatId, msgId, undefined, nextBody, { reply_markup: kb(orderId).reply_markup });
  }
}
