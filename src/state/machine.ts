import type { WBContext } from "../bot.ts";
import { startFlow } from "../flows/start.flow.ts";
import { educationFlow } from "../flows/education.flow.ts";
import { browseFlow } from "../flows/browse.flow.ts";
import { orderFlow } from "../flows/order.flow.ts";
import { checkoutFlow } from "../flows/checkout.flow.ts";
import { statusFlow } from "../flows/status.flow.ts";
import { handleStaffAction } from "../staff/actions.ts";
import { academyFlow } from "../staff_academy/flows.ts";
import { Markup } from "telegraf";

function cbData(ctx: WBContext): string {
  const d = (ctx.update as any)?.callback_query?.data;
  return typeof d === "string" ? d : "";
}

function isPrivate(ctx: WBContext): boolean {
  return String((ctx.chat as any)?.type ?? "") === "private";
}

function dmUrl(ctx: WBContext): string | null {
  const u = String((ctx as any).wb?.botUsername ?? "").trim();
  if (!u) return null;
  return `https://t.me/${u}`;
}

async function dmOnlyNudge(ctx: WBContext) {
  const url = dmUrl(ctx);
  const text = "🔒 Ordering works in private chat only.\nTap below to open the bot.";
  const kb = url ? Markup.inlineKeyboard([[Markup.button.url("✅ Open Bot (Private)", url)]]) : undefined;

  // callback_query → show alert + drop a helper message
  if ((ctx.update as any)?.callback_query) {
    try {
      await ctx.answerCbQuery("Open the bot in DM to order.", { show_alert: true });
    } catch {
      // ignore
    }
    try {
      await ctx.reply(text, kb as any);
    } catch {
      // ignore
    }
    return;
  }

  // normal message in group
  return ctx.reply(text, kb as any);
}

export async function routeUpdate(ctx: WBContext) {
  const data = cbData(ctx);
  const { menu, repos } = (ctx as any).wb;
  const text = (ctx.message as any)?.text;

  // Staff academy (DM/group OK depending on your policy; keep as-is)
  if (text === "/academy") return academyFlow(ctx);
  if (data.startsWith("academy:")) return academyFlow(ctx);

  // Staff actions (staff group OK)
  if (data.startsWith("staff:")) return handleStaffAction(ctx);

  // Customer ordering should be DM-only (press button -> opens DM)
  const isCustomerRoute =
    text === "/start" ||
    data.startsWith("home:") ||
    data.startsWith("edu:") ||
    data.startsWith("browse:") ||
    data.startsWith("order:") ||
    data.startsWith("checkout:") ||
    data.startsWith("status:") ||
    ctx.session.state === "S11_PROOF" ||
    (ctx.session.state === "S5_CHECKOUT" && ctx.message && "location" in ctx.message);

  if (isCustomerRoute && !isPrivate(ctx)) {
    return dmOnlyNudge(ctx);
  }

  // DM customer flows
  if (text === "/start") return startFlow(ctx, menu, repos);

  if (ctx.session.state === "S5_CHECKOUT" && ctx.message && "location" in ctx.message) {
    return checkoutFlow(ctx, menu, repos);
  }

  if (data.startsWith("home:")) return startFlow(ctx, menu, repos);
  if (data.startsWith("edu:")) return educationFlow(ctx, menu, repos);
  if (data.startsWith("browse:")) return browseFlow(ctx, menu, repos);
  if (data.startsWith("order:")) return orderFlow(ctx, menu, repos);
  if (data.startsWith("checkout:") || ctx.session.state === "S11_PROOF") return checkoutFlow(ctx, menu, repos);
  if (data.startsWith("status:")) return statusFlow(ctx, menu, repos);

  return startFlow(ctx, menu, repos);
}
