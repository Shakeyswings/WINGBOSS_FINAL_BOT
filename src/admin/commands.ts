import type { WBContext } from "../bot.ts";
import { ensureOwner } from "./guards.ts";
import { Markup } from "telegraf";
import { renderStaffCardBody } from "../staff/card.ts";

export async function cmdOpen(ctx: WBContext) {
  if (!ensureOwner(ctx)) return;
  await ctx.reply("✅ OPEN");
}

export async function cmdClose(ctx: WBContext) {
  if (!ensureOwner(ctx)) return;
  await ctx.reply("⛔ CLOSED");
}

export async function cmdBusyOn(ctx: WBContext) {
  if (!ensureOwner(ctx)) return;
  await ctx.reply("⏳ BUSY MODE ON");
}

export async function cmdBusyOff(ctx: WBContext) {
  if (!ensureOwner(ctx)) return;
  await ctx.reply("✅ BUSY MODE OFF");
}

/**
 * Owner-only: posts a fake staff card into STAFF_CHAT_ID so you can test buttons fast.
 * This does NOT affect real orders, but it does test routing + inline callbacks.
 */
export async function cmdStaffTestOrder(ctx: WBContext) {
  if (!ensureOwner(ctx)) return;

  const fakeOrder: any = {
    order_id: "TEST" + String(Date.now()).slice(-4),
    user_id: String(ctx.from?.id ?? ""),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "SENT_TO_STAFF",
    items: [{ sku: "test:item", name_en: "Test Wings 12 pc", qty: 1, unit_price_usd: 12.5 }],
    totals: { food_subtotal_usd: 12.5, fees_usd: 0, grand_total_usd: 12.5 },
    delivery: { mode: "delivery", address: "Test Address", phone: "012345678" },
    payment: { method: "bank_transfer", proof_file_id: "TEST_FILE_ID" }
  };

  const cardBody = renderStaffCardBody(fakeOrder);

  const kb = Markup.inlineKeyboard([
    [Markup.button.callback("✅ Accept", `staff:accept:${fakeOrder.order_id}`), Markup.button.callback("❌ Reject", `staff:reject:${fakeOrder.order_id}`)],
    [Markup.button.callback("🔥 Cooking", `staff:cooking:${fakeOrder.order_id}`), Markup.button.callback("✅ Ready", `staff:ready:${fakeOrder.order_id}`)],
    [Markup.button.callback("🚗 Book Driver", `staff:dispatch:${fakeOrder.order_id}`), Markup.button.callback("📦 Picked", `staff:picked:${fakeOrder.order_id}`)],
    [Markup.button.callback("🏁 Delivered", `staff:delivered:${fakeOrder.order_id}`), Markup.button.callback("⚠️ Issue", `staff:issue:${fakeOrder.order_id}`)]
  ]);

  await ctx.telegram.sendMessage(ctx.env.STAFF_CHAT_ID, cardBody, kb);
  await ctx.reply("✅ Sent test staff card to staff group.");
}
