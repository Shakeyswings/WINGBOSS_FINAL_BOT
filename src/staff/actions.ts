import type { WBContext } from "../bot.ts";
import { randomUUID } from "node:crypto";

import { StaffEventsRepo } from "./score/repo.ts";
import type { StaffEventType, StaffEvent } from "./score/events.ts";
import { replaceStatusLine } from "./card.ts";
import type { Order, OrderStatus } from "../repos/types.ts";
import { isStaffAllowlisted } from "../admin/guards.ts";
import { buildDispatchPack } from "./dispatch_pack.ts";
import { staffKeyboard } from "./keyboard.ts";
import { ISSUE_REASON_LABELS, type IssueReason } from "./issue_reasons.ts";
import { Markup } from "telegraf";

function cbData(ctx: WBContext): string {
  return String((ctx.update as any)?.callback_query?.data ?? "");
}

function staffId(ctx: WBContext): string {
  return String(ctx.from?.id ?? "");
}

function ensureStaff(ctx: WBContext): boolean {
  const inStaffChat = String(ctx.chat?.id ?? "") === String(ctx.env.STAFF_CHAT_ID);
  return inStaffChat || isStaffAllowlisted(ctx);
}

async function emit(ctx: WBContext, type: StaffEventType, order_id?: string, meta?: Record<string, unknown>) {
  const repo = new StaffEventsRepo();
  const ev: StaffEvent = {
    event_id: randomUUID().slice(0, 10),
    staff_id: staffId(ctx),
    order_id,
    type,
    ts: new Date().toISOString(),
    meta
  };
  await repo.append(ev);
}

function allowedTransition(current: OrderStatus, next: OrderStatus): boolean {
  const ok: Record<OrderStatus, OrderStatus[]> = {
    DRAFT: ["AWAITING_PAYMENT", "PAID", "SENT_TO_STAFF", "REJECTED", "ISSUE"],
    AWAITING_PAYMENT: ["PAID", "REJECTED", "ISSUE"],
    PAID: ["SENT_TO_STAFF", "ACCEPTED", "REJECTED", "ISSUE"],
    SENT_TO_STAFF: ["ACCEPTED", "REJECTED", "ISSUE"],
    ACCEPTED: ["COOKING", "REJECTED", "ISSUE"],
    COOKING: ["READY", "ISSUE"],
    READY: ["BOOK_DRIVER", "ISSUE"],
    BOOK_DRIVER: ["DRIVER_PICKED_UP", "ISSUE"],
    DRIVER_PICKED_UP: ["DELIVERED", "ISSUE"],
    DELIVERED: [],
    REJECTED: [],
    ISSUE: []
  };
  return ok[current]?.includes(next) ?? false;
}

function nextHintFor(current: OrderStatus, next: OrderStatus): string {
  if (next === "READY" && current !== "COOKING") {
    if (current === "SENT_TO_STAFF") return "Next: ✅ Accept → 🔥 Cooking → ✅ Ready Checklist → ✅ Ready";
    if (current === "ACCEPTED") return "Next: 🔥 Cooking (then checklist, then Ready)";
    if (current === "READY") return "Already READY. Next: 🚗 Book Driver";
    return `Next: reach COOKING first (current=${current})`;
  }
  if (next === "COOKING" && current !== "ACCEPTED") {
    if (current === "SENT_TO_STAFF") return "Next: ✅ Accept first";
    return `Next: ✅ Accept first (current=${current})`;
  }
  return `Follow SOP order (current=${current})`;
}

function requiresPaidBeforeCooking(env: WBContext["env"], order: Order): boolean {
  return Boolean(env.PAYMENT_PROOF_REQUIRED) && order.payment?.method === "bank_transfer";
}

function readyChecklistConfirmed(order: Order): boolean {
  return Boolean((order.staff as any)?.ready_checklist_confirmed);
}

async function updateStaffMessageStatus(ctx: WBContext, order: Order) {
  const staff = order.staff ?? {};
  const baseBody = (staff as any).staff_card_body as string | undefined;
  if (!baseBody || !staff.staff_chat_id || !staff.staff_message_id) return;

  const updatedText = replaceStatusLine(baseBody, order.status);

  try {
    await ctx.telegram.editMessageText(
      staff.staff_chat_id,
      staff.staff_message_id,
      undefined,
      updatedText,
      staffKeyboard(order.order_id)
    );
  } catch {
    // ignore
  }
}

async function setOrderStatus(ctx: WBContext, order: Order, next: OrderStatus, reason?: string) {
  if (!allowedTransition(order.status, next)) {
    const hint = nextHintFor(order.status, next);
    await ctx.answerCbQuery(`❌ Invalid sequence\n${hint}`, { show_alert: true });
    await emit(ctx, "ISSUE_RAISED", order.order_id, { reason: "SEQUENCE_VIOLATION", from: order.status, to: next });
    return;
  }

  if (next === "COOKING" && requiresPaidBeforeCooking(ctx.env, order) && !order.payment?.proof_file_id) {
    await ctx.answerCbQuery("❌ Need payment proof", { show_alert: true });
    await emit(ctx, "ISSUE_RAISED", order.order_id, { reason: "PAYMENT_NOT_VERIFIED" });
    return;
  }

  if (next === "READY" && !readyChecklistConfirmed(order)) {
    await ctx.answerCbQuery("✅ Tap Ready Checklist first", { show_alert: true });
    return;
  }

  order.status = next;
  await (ctx as any).wb.repos.orders.update(order);
  await updateStaffMessageStatus(ctx, order);

  const map: Record<OrderStatus, StaffEventType | null> = {
    DRAFT: null,
    AWAITING_PAYMENT: null,
    PAID: "PAYMENT_VERIFIED",
    SENT_TO_STAFF: null,
    ACCEPTED: "ORDER_ACCEPTED",
    COOKING: "COOKING_STARTED",
    READY: "MARKED_READY",
    BOOK_DRIVER: "DISPATCH_PACK_GENERATED",
    DRIVER_PICKED_UP: "DRIVER_PICKED_UP",
    DELIVERED: "DELIVERED",
    REJECTED: "ORDER_REJECTED",
    ISSUE: "ISSUE_RAISED"
  };

  const evType = map[next];
  if (evType) await emit(ctx, evType, order.order_id, reason ? { reason } : undefined);

  await ctx.answerCbQuery(`✅ ${next}`, { show_alert: false });
}

function issueReasonKeyboard(orderId: string) {
  const keys = Object.keys(ISSUE_REASON_LABELS) as IssueReason[];
  const rows = keys.map((k) => [Markup.button.callback(ISSUE_REASON_LABELS[k], `staff:issue_reason:${orderId}:${k}`)]);
  rows.push([Markup.button.callback("⬅️ Cancel", `staff:issue_cancel:${orderId}`)]);
  return Markup.inlineKeyboard(rows);
}

async function notifyOwnerIssue(ctx: WBContext, order: Order, reason: IssueReason) {
  if (!ctx.env.OWNER_NOTIFY_ISSUES) return;
  try {
    const txt = [
      "⚠️ ISSUE LOGGED",
      `Order: ${order.order_id}`,
      `Reason: ${ISSUE_REASON_LABELS[reason]}`,
      order.delivery?.address ? `Addr: ${order.delivery.address}` : null
    ].filter(Boolean).join("\n");
    await ctx.telegram.sendMessage(ctx.env.OWNER_TELEGRAM_ID, txt);
  } catch {
    // ignore
  }
}

export async function handleStaffAction(ctx: WBContext) {
  const data = cbData(ctx);
  if (!data) return;

  if (!ensureStaff(ctx)) return ctx.answerCbQuery("⛔ Staff only", { show_alert: true });

  const parts = data.split(":");
  const action = parts[1];
  const orderId = parts[2];

  const order = await (ctx as any).wb.repos.orders.get(orderId);
  if (!order) return ctx.answerCbQuery("Order not found", { show_alert: true });

  if (action === "dispatch_pack") {
    await emit(ctx, "DISPATCH_PACK_GENERATED", order.order_id, { source: "button" });
    await ctx.reply(await buildDispatchPack(order, ctx.env));
    return ctx.answerCbQuery("📋 Sent", { show_alert: false });
  }

  if (action === "ready_check") {
    order.staff = { ...(order.staff ?? {}), ready_checklist_confirmed: true } as any;
    await (ctx as any).wb.repos.orders.update(order);
    await ctx.reply("✅ Ready checklist confirmed:\n- Wings count\n- Dips\n- Carrots\n- Packaging");
    return ctx.answerCbQuery("✅ Checklist", { show_alert: false });
  }

  if (action === "issue") {
    await ctx.reply("⚠️ Issue — choose a reason:", issueReasonKeyboard(order.order_id));
    return ctx.answerCbQuery("Select reason", { show_alert: false });
  }

  if (action === "issue_cancel") return ctx.answerCbQuery("Cancelled", { show_alert: false });

  if (action === "issue_reason") {
    const reason = parts[3] as IssueReason | undefined;
    if (!reason || !(reason in ISSUE_REASON_LABELS)) {
      return ctx.answerCbQuery("Unknown reason", { show_alert: true });
    }

    order.status = "ISSUE";
    order.staff = { ...(order.staff ?? {}), issue_reason: reason } as any;
    await (ctx as any).wb.repos.orders.update(order);
    await updateStaffMessageStatus(ctx, order);

    await emit(ctx, "ISSUE_RAISED", order.order_id, { reason });
    await notifyOwnerIssue(ctx, order, reason);

    await ctx.reply(`⚠️ Issue logged: ${ISSUE_REASON_LABELS[reason]}`);
    return ctx.answerCbQuery("✅ Logged", { show_alert: false });
  }

  if (action === "accept") return setOrderStatus(ctx, order, "ACCEPTED");
  if (action === "cooking") return setOrderStatus(ctx, order, "COOKING");
  if (action === "ready") return setOrderStatus(ctx, order, "READY", "READY_CHECKLIST_CONFIRMED");
  if (action === "dispatch") return setOrderStatus(ctx, order, "BOOK_DRIVER");
  if (action === "picked") return setOrderStatus(ctx, order, "DRIVER_PICKED_UP");
  if (action === "delivered") return setOrderStatus(ctx, order, "DELIVERED");
  if (action === "reject") return setOrderStatus(ctx, order, "REJECTED", "STAFF_REJECTED");

  return ctx.answerCbQuery("Unknown action", { show_alert: true });
}
