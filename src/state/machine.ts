import type { WBContext } from "../bot.ts";
import { startFlow } from "../flows/start.flow.ts";
import { educationFlow } from "../flows/education.flow.ts";
import { browseFlow } from "../flows/browse.flow.ts";
import { orderFlow } from "../flows/order.flow.ts";
import { checkoutFlow } from "../flows/checkout.flow.ts";
import { statusFlow } from "../flows/status.flow.ts";
import { academyFlow } from "../staff_academy/flows.ts";
import { handleStaffAction } from "../staff/actions.ts";
import { handleAdminCommands } from "../admin/commands.ts";

function cb(ctx: WBContext): string {
  const d = (ctx.update as any)?.callback_query?.data;
  return typeof d === "string" ? d : "";
}
function txt(ctx: WBContext): string {
  const t = (ctx.message as any)?.text;
  return typeof t === "string" ? t : "";
}

export async function routeUpdate(ctx: WBContext) {
  // staff buttons
  if (cb(ctx).startsWith("staff:")) return handleStaffAction(ctx);

  // admin commands
  if (txt(ctx).startsWith("/")) return handleAdminCommands(ctx);

  // academy
  if (txt(ctx) === "/academy" || cb(ctx).startsWith("academy:")) return academyFlow(ctx);

  const data = cb(ctx);

  if (data.startsWith("edu:")) return educationFlow(ctx);
  if (data.startsWith("browse:")) return browseFlow(ctx);
  if (data.startsWith("order:")) return orderFlow(ctx);
  if (data.startsWith("checkout:")) return checkoutFlow(ctx);
  if (data.startsWith("status:")) return statusFlow(ctx);

  return startFlow(ctx);
}
