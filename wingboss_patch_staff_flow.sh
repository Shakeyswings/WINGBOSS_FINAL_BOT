#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

ROOT="$HOME/WINGBOSS_FINAL_BOT"
cd "$ROOT"

# ---------- staff card ----------
cat > src/staff/card.ts <<'EOT'
import type { Order } from "../repos/types.js";

export function renderStaffCardBody(order: Order): string {
  const lines: string[] = [];
  lines.push(`ORDER #${order.order_id}`);
  lines.push(`STATUS: ${order.status}`);
  lines.push(`---`);
  for (const it of order.items) lines.push(`• ${it.qty} × ${it.name_en}`);
  lines.push(`---`);
  lines.push(`TOTAL: $${order.totals.grand_total_usd.toFixed(2)}`);
  if (order.delivery?.mode) lines.push(`MODE: ${order.delivery.mode.toUpperCase()}`);
  if (order.delivery?.address) lines.push(`ADDR: ${order.delivery.address}`);
  if (order.delivery?.phone) lines.push(`PHONE: ${order.delivery.phone}`);
  return lines.join("\n");
}

export function replaceStatusLine(cardBody: string, nextStatus: string): string {
  const lines = cardBody.split("\n");
  const idx = lines.findIndex((l) => l.startsWith("STATUS:"));
  if (idx >= 0) lines[idx] = `STATUS: ${nextStatus}`;
  return lines.join("\n");
}
EOT

# ---------- staff action handler (strict sequence + events) ----------
cat > src/staff/actions.ts <<'EOT'
import type { WBContext } from "../bot.js";
import { randomUUID } from "node:crypto";
import { StaffEventsRepo } from "./score/repo.js";
import type { StaffEvent, StaffEventType } from "./score/events.js";
import { isStaffAllowlisted } from "../admin/guards.js";
import { replaceStatusLine } from "./card.js";
import type { Order, OrderStatus } from "../repos/types.js";

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

function requiresPaidBeforeCooking(env: WBContext["env"], order: Order): boolean {
  return Boolean(env.PAYMENT_PROOF_REQUIRED) && order.payment?.method === "bank_transfer";
}

async function setOrderStatus(ctx: WBContext, order: Order, next: OrderStatus, reason?: string) {
  if (!allowedTransition(order.status, next)) {
    await ctx.answerCbQuery("❌ Invalid sequence", { show_alert: true });
    await emit(ctx, "ISSUE_RAISED", order.order_id, { reason: "SEQUENCE_VIOLATION", from: order.status, to: next });
    return;
  }

  if (next === "COOKING" && requiresPaidBeforeCooking(ctx.env, order) && !order.payment?.proof_file_id) {
    await ctx.answerCbQuery("❌ Need payment proof", { show_alert: true });
    await emit(ctx, "ISSUE_RAISED", order.order_id, { reason: "PAYMENT_NOT_VERIFIED" });
    return;
  }

  order.status = next;
  await (ctx as any).wb.repos.orders.update(order);

  const staff = order.staff ?? {};
  const baseBody = (staff as any).staff_card_body as string | undefined;
  const updatedText = replaceStatusLine(baseBody ?? "", next);

  if (staff.staff_chat_id && staff.staff_message_id && updatedText.trim().length) {
    try {
      await ctx.telegram.editMessageText(staff.staff_chat_id, staff.staff_message_id, undefined, updatedText);
    } catch {
      // ok: message may be deleted
    }
  }

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

  await ctx.answerCbQuery("✅", { show_alert: false });
}

export async function handleStaffAction(ctx: WBContext) {
  // attendance mode A
  if ((ctx.message as any)?.text === "/shift_start") {
    if (!ensureStaff(ctx)) return;
    await emit(ctx, "ATTENDANCE_OVERRIDE", undefined, { action: "SHIFT_START" });
    return ctx.reply("✅ Shift started (logged).");
  }
  if ((ctx.message as any)?.text === "/shift_end") {
    if (!ensureStaff(ctx)) return;
    await emit(ctx, "ATTENDANCE_OVERRIDE", undefined, { action: "SHIFT_END" });
    return ctx.reply("✅ Shift ended (logged).");
  }

  const data = cbData(ctx);
  if (!data) return;

  if (!ensureStaff(ctx)) {
    await ctx.answerCbQuery("⛔ Staff only", { show_alert: true });
    return;
  }

  const [, action, orderId] = data.split(":");
  const order = await (ctx as any).wb.repos.orders.get(orderId);
  if (!order) return ctx.answerCbQuery("Order not found", { show_alert: true });

  if (action === "accept") return setOrderStatus(ctx, order, "ACCEPTED");
  if (action === "cooking") return setOrderStatus(ctx, order, "COOKING");
  if (action === "ready") return setOrderStatus(ctx, order, "READY", "READY_CHECKLIST_CONFIRMED");
  if (action === "dispatch") return setOrderStatus(ctx, order, "BOOK_DRIVER");
  if (action === "picked") return setOrderStatus(ctx, order, "DRIVER_PICKED_UP");
  if (action === "delivered") return setOrderStatus(ctx, order, "DELIVERED");
  if (action === "issue") return setOrderStatus(ctx, order, "ISSUE", "STAFF_RAISED");
  if (action === "reject") return setOrderStatus(ctx, order, "REJECTED", "STAFF_REJECTED");

  return ctx.answerCbQuery("Unknown action", { show_alert: true });
}
EOT

# ---------- patch state router: staff:* ----------
# append staff route if missing (simple safe insert after other imports)
if ! grep -q 'handleStaffAction' src/state/machine.ts; then
  perl -0777 -i -pe 's/(import\s+\{[^}]*\}\s+from\s+"\.\.\/flows\/status\.flow\.js";\n)/$1import { handleStaffAction } from "..\/staff\/actions.js";\n/s' src/state/machine.ts
fi

if ! grep -q 'data\.startsWith\("staff:"\)' src/state/machine.ts; then
  perl -0777 -i -pe 's/(if \(data\.startsWith\("status:"\)\)\s+return statusFlow\(ctx, menu, repos\);\n)/$1  if (data.startsWith("staff:")) return handleStaffAction(ctx);\n/s' src/state/machine.ts
fi

# ---------- patch repos/types.ts to allow staff_card_body ----------
if ! grep -q 'staff_card_body' src/repos/types.ts; then
  perl -0777 -i -pe 's/(staff\?:\s*\{\s*[^}]*staff_message_id\?:\s*number;\s*\n\s*\};)/$1\n  \n  \n/s' src/repos/types.ts
  # safer: insert inside staff block
  perl -0777 -i -pe 's/(staff_message_id\?:\s*number;)/$1\n    staff_card_body?: string;/s' src/repos/types.ts
fi

# ---------- overwrite checkout flow with staff send hook (safe scaffold) ----------
cat > src/flows/checkout.flow.ts <<'EOT'
import { Markup } from "telegraf";
import type { WBContext } from "../bot.js";
import type { MenuBundleV1 } from "../menu/schema.js";
import type { Repos } from "../repos/types.js";
import { isTelegramFileId } from "../utils/telegram_media.js";
import { renderStaffCardBody } from "../staff/card.js";

export async function checkoutFlow(ctx: WBContext, _menu: MenuBundleV1, repos: Repos) {
  const data = (ctx.update as any)?.callback_query?.data ?? "checkout:cart";
  const [, step] = String(data).split(":");

  const oid = ctx.session.draft_order_id;
  const order = oid ? await repos.orders.get(oid) : null;

  if (step === "cart") {
    ctx.session.state = "S4_CART";
    if (!order) {
      return ctx.editMessageText(
        "Cart is empty.",
        Markup.inlineKeyboard([[Markup.button.callback("✅ Order Now", "order:start")], [Markup.button.callback("⬅️ Home", "home:back")]])
      );
    }

    const lines = [
      `🛒 Cart`,
      ...order.items.map((it) => `• ${it.name_en} — $${it.unit_price_usd.toFixed(2)}`),
      `\nTotal: $${order.totals.grand_total_usd.toFixed(2)}`
    ].join("\n");

    return ctx.editMessageText(
      lines,
      Markup.inlineKeyboard([
        [Markup.button.callback("🚚 Delivery", "checkout:mode:delivery"), Markup.button.callback("🏃 Pickup", "checkout:mode:pickup")],
        [Markup.button.callback("⬅️ Home", "home:back")]
      ])
    );
  }

  if (step === "mode") {
    const mode = (String(data).split(":")[2] ?? "delivery") as "delivery" | "pickup";
    if (!order) return ctx.editMessageText("No draft.", Markup.inlineKeyboard([[Markup.button.callback("✅ Order", "order:start")]]));

    order.delivery = { mode };
    order.status = ctx.env.BANK_TRANSFER_ENABLED ? "AWAITING_PAYMENT" : "DRAFT";
    await repos.orders.update(order);

    if (mode === "delivery") {
      ctx.session.state = "S5_CHECKOUT";
      return ctx.editMessageText(ctx.t("need_location"), Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "checkout:cart")]]));
    }

    return ctx.editMessageText(
      ctx.t("pay_before_cook"),
      Markup.inlineKeyboard([
        [Markup.button.callback("🏦 Bank transfer", "checkout:pay:bank_transfer")],
        [Markup.button.callback("💵 Cash", "checkout:pay:cash")],
        [Markup.button.callback("⬅️ Back", "checkout:cart")]
      ])
    );
  }

  if (ctx.message && "location" in ctx.message) {
    if (!order) return;
    order.delivery = order.delivery ?? { mode: "delivery" };
    order.delivery.location = { lat: ctx.message.location.latitude, lon: ctx.message.location.longitude };
    await repos.orders.update(order);

    return ctx.reply(
      ctx.t("pay_before_cook"),
      Markup.inlineKeyboard([
        [Markup.button.callback("🏦 Bank transfer", "checkout:pay:bank_transfer")],
        [Markup.button.callback("💵 Cash", "checkout:pay:cash")]
      ])
    );
  }

  if (step === "pay") {
    const method = (String(data).split(":")[2] ?? "bank_transfer") as "bank_transfer" | "cash";
    if (!order) return ctx.editMessageText("No draft.", Markup.inlineKeyboard([[Markup.button.callback("✅ Order", "order:start")]]));

    order.payment = { method };
    await repos.orders.update(order);

    if (method === "bank_transfer" && ctx.env.PAYMENT_PROOF_REQUIRED) {
      ctx.session.state = "S11_PROOF";
      return ctx.editMessageText("🔒 Upload payment proof photo.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "checkout:cart")]]));
    }

    return ctx.editMessageText("✅ Payment saved.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Home", "home:back")]]));
  }

  if (ctx.session.state === "S11_PROOF" && ctx.message && "photo" in ctx.message) {
    const photo = ctx.message.photo?.at(-1);
    const fileId = photo?.file_id;
    if (!order || !fileId || !isTelegramFileId(fileId)) return;

    order.payment = { ...(order.payment ?? { method: "bank_transfer" }), proof_file_id: fileId };
    order.status = "PAID";
    await repos.orders.update(order);

    // Send ONE staff message per order (first time only)
    if (!order.staff?.staff_message_id) {
      const cardBody = renderStaffCardBody(order);

      const kb = Markup.inlineKeyboard([
        [Markup.button.callback("✅ Accept", `staff:accept:${order.order_id}`), Markup.button.callback("❌ Reject", `staff:reject:${order.order_id}`)],
        [Markup.button.callback("🔥 Cooking", `staff:cooking:${order.order_id}`), Markup.button.callback("✅ Ready", `staff:ready:${order.order_id}`)],
        [Markup.button.callback("🚗 Book Driver", `staff:dispatch:${order.order_id}`), Markup.button.callback("📦 Picked", `staff:picked:${order.order_id}`)],
        [Markup.button.callback("🏁 Delivered", `staff:delivered:${order.order_id}`), Markup.button.callback("⚠️ Issue", `staff:issue:${order.order_id}`)]
      ]);

      const msg = await ctx.telegram.sendMessage(ctx.env.STAFF_CHAT_ID, cardBody, kb);

      order.staff = {
        staff_chat_id: ctx.env.STAFF_CHAT_ID,
        staff_message_id: msg.message_id,
        staff_card_body: cardBody
      } as any;

      order.status = "SENT_TO_STAFF";
      await repos.orders.update(order);
    }

    ctx.session.state = "S14_STATUS";
    return ctx.reply("✅ Proof received. Sent to staff.");
  }
}
EOT

echo "✅ Staff flow patch applied."
echo "Next:"
echo "  npm run menu:check"
echo "  bash scripts/termux_run.sh"
