import { Markup } from "telegraf";
import type { WBContext } from "../bot.ts";
import type { MenuBundleV1 } from "../menu/schema.ts";
import type { Repos } from "../repos/types.ts";
import { isTelegramFileId } from "../utils/telegram_media.ts";
import { renderStaffCardBody } from "../staff/card.ts";
import { staffKeyboard } from "../staff/keyboard.ts";

export async function checkoutFlow(ctx: WBContext, _menu: MenuBundleV1, repos: Repos) {
  const data = (ctx.update as any)?.callback_query?.data ?? "checkout:cart";
  const [, step, a] = String(data).split(":");

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
    return ctx.editMessageText(
      `🛒 Cart\n\nTotal: $${order.totals.grand_total_usd.toFixed(2)}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🚚 Delivery", "checkout:mode:delivery"), Markup.button.callback("🏃 Pickup", "checkout:mode:pickup")],
        [Markup.button.callback("⬅️ Home", "home:back")]
      ])
    );
  }

  if (step === "mode") {
    const mode = (a ?? "delivery") as "delivery" | "pickup";
    if (!order) return;

    order.delivery = { ...(order.delivery ?? {}), mode };
    order.status = ctx.env.PAYMENT_PROOF_REQUIRED ? "AWAITING_PAYMENT" : "DRAFT";
    await repos.orders.update(order);

    if (mode === "delivery") {
      ctx.session.state = "S5_CHECKOUT";
      return ctx.editMessageText(
        ctx.t("need_location"),
        Markup.inlineKeyboard([
          [Markup.button.callback("📍 Request Location", "checkout:request_location")],
          [Markup.button.callback("⬅️ Back", "checkout:cart")]
        ])
      );
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

  // NEW: one-tap location request (reply keyboard)
  if (step === "request_location") {
    await ctx.reply(
      "📍 Tap the button below to share your location (delivery).",
      Markup.keyboard([[Markup.button.locationRequest("📍 Share Location")]])
        .oneTime()
        .resize()
    );
    return;
  }

  // Customer sends location pin
  if (ctx.message && "location" in ctx.message) {
    if (!order) return;
    order.delivery = order.delivery ?? { mode: "delivery" };
    order.delivery.location = { lat: ctx.message.location.latitude, lon: ctx.message.location.longitude };
    await repos.orders.update(order);

    await ctx.reply("✅ Location received.", Markup.removeKeyboard());

    return ctx.reply(
      ctx.t("pay_before_cook"),
      Markup.inlineKeyboard([
        [Markup.button.callback("🏦 Bank transfer", "checkout:pay:bank_transfer")],
        [Markup.button.callback("💵 Cash", "checkout:pay:cash")]
      ])
    );
  }

  if (step === "pay") {
    const method = (a ?? "bank_transfer") as "bank_transfer" | "cash";
    if (!order) return;

    order.payment = { method };
    await repos.orders.update(order);

    if (method === "bank_transfer" && ctx.env.PAYMENT_PROOF_REQUIRED) {
      ctx.session.state = "S11_PROOF";
      return ctx.editMessageText("🔒 Upload payment proof photo.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Back", "checkout:cart")]]));
    }

    return ctx.editMessageText("✅ Payment saved.", Markup.inlineKeyboard([[Markup.button.callback("⬅️ Home", "home:back")]]));
  }

  // Proof upload -> send staff card ONCE
  if (ctx.session.state === "S11_PROOF" && ctx.message && "photo" in ctx.message) {
    const photo = ctx.message.photo?.at(-1);
    const fileId = photo?.file_id;
    if (!order || !fileId || !isTelegramFileId(fileId)) return;

    order.payment = { ...(order.payment ?? { method: "bank_transfer" }), proof_file_id: fileId };
    order.status = "PAID";
    await repos.orders.update(order);

    if (!order.staff?.staff_message_id) {
      const cardBody = renderStaffCardBody(order);
      const msg = await ctx.telegram.sendMessage(ctx.env.STAFF_CHAT_ID, cardBody, staffKeyboard(order.order_id));
      order.staff = { staff_chat_id: ctx.env.STAFF_CHAT_ID, staff_message_id: msg.message_id, staff_card_body: cardBody } as any;
      order.status = "SENT_TO_STAFF";
      await repos.orders.update(order);
    }

    ctx.session.state = "S14_STATUS";
    return ctx.reply("✅ Proof received. Sent to staff.");
  }
}
