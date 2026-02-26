import type { Order, OrderStatus } from "../repos/types.ts";

function nextHint(status: OrderStatus): string {
  switch (status) {
    case "SENT_TO_STAFF":
      return "✅ Accept";
    case "ACCEPTED":
      return "🔥 Cooking";
    case "COOKING":
      return "✅ Ready Checklist → ✅ Ready";
    case "READY":
      return "🚗 Book Driver";
    case "BOOK_DRIVER":
      return "📦 Picked";
    case "DRIVER_PICKED_UP":
      return "🏁 Delivered";
    case "DELIVERED":
      return "Done";
    case "REJECTED":
      return "Done";
    case "ISSUE":
      return "Handle issue";
    default:
      return "—";
  }
}

export function renderStaffCardBody(order: Order): string {
  const lines: string[] = [];
  lines.push(`ORDER #${order.order_id}`);
  lines.push(`STATUS: ${order.status}`);
  lines.push(`NEXT: ${nextHint(order.status)}`);
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

  const nextIdx = lines.findIndex((l) => l.startsWith("NEXT:"));
  if (nextIdx >= 0) {
    // best-effort mapping; if status unknown, keep dash
    const hint = nextHint(nextStatus as any);
    lines[nextIdx] = `NEXT: ${hint}`;
  }

  return lines.join("\n");
}
