import type { Order } from "../repos/types.ts";

export function renderStaffCardBody(order: Order): string {
  const lines: string[] = [];
  lines.push(`ORDER #${order.order_id}`);
  lines.push(`STATUS: ${order.status}`);
  lines.push("---");
  for (const it of order.items) lines.push(`• ${it.qty} × ${it.name_en}`);
  lines.push("---");
  lines.push(`TOTAL: $${order.totals.grand_total_usd.toFixed(2)}`);
  if (order.delivery?.mode) lines.push(`MODE: ${order.delivery.mode}`);
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
