import type { WBContext } from "../bot.ts";
import { startFlow } from "../flows/start.flow.ts";
import { educationFlow } from "../flows/education.flow.ts";
import { browseFlow } from "../flows/browse.flow.ts";
import { orderFlow } from "../flows/order.flow.ts";
import { checkoutFlow } from "../flows/checkout.flow.ts";
import { statusFlow } from "../flows/status.flow.ts";
import { handleStaffAction } from "../staff/actions.ts";
import { cmdStaffTestOrder } from "../admin/commands.ts";

function cbData(ctx: WBContext): string {
  const d = (ctx.update as any)?.callback_query?.data;
  return typeof d === "string" ? d : "";
}

export async function routeUpdate(ctx: WBContext) {
  const data = cbData(ctx);
  const { menu, repos } = (ctx as any).wb;

  const text = (ctx.message as any)?.text;
  if (text === "/start") return startFlow(ctx, menu, repos);

  // Owner-only test helper
  if (text === "/staff_test_order") return cmdStaffTestOrder(ctx);

  // Staff commands (Mode A)
  if (text === "/shift_start" || text === "/shift_end") return handleStaffAction(ctx);

  // Staff callbacks
  if (data.startsWith("staff:")) return handleStaffAction(ctx);

  // Customer flows
  if (data.startsWith("home:")) return startFlow(ctx, menu, repos);
  if (data.startsWith("edu:")) return educationFlow(ctx, menu, repos);
  if (data.startsWith("browse:")) return browseFlow(ctx, menu, repos);
  if (data.startsWith("order:")) return orderFlow(ctx, menu, repos);
  if (data.startsWith("checkout:") || ctx.session.state === "S11_PROOF") return checkoutFlow(ctx, menu, repos);
  if (data.startsWith("status:")) return statusFlow(ctx, menu, repos);

  // Default safe
  return startFlow(ctx, menu, repos);
}
