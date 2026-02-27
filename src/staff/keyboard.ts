import { Markup } from "telegraf";

export function staffKeyboard(orderId: string) {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback("✅ Accept", `staff:accept:${orderId}`),
      Markup.button.callback("❌ Reject", `staff:reject:${orderId}`)
    ],
    [
      Markup.button.callback("🔥 Cooking", `staff:cooking:${orderId}`),
      Markup.button.callback("✅ Ready Checklist", `staff:ready_check:${orderId}`)
    ],
    [
      Markup.button.callback("✅ Ready", `staff:ready:${orderId}`),
      Markup.button.callback("🚗 Book Driver", `staff:dispatch:${orderId}`)
    ],
    [
      Markup.button.callback("📦 Picked", `staff:picked:${orderId}`),
      Markup.button.callback("🏁 Delivered", `staff:delivered:${orderId}`)
    ],
    [
      Markup.button.callback("📋 Dispatch Pack", `staff:dispatch_pack:${orderId}`),
      Markup.button.callback("⚠️ Issue", `staff:issue:${orderId}`)
    ]
  ]);
}
