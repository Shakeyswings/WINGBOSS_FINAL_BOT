import type { MiddlewareFn } from "telegraf";
import type { WBContext } from "../bot.ts";

export type WBSession = {
  state: "S0_HOME" | "S1_EDU" | "S2_BROWSE" | "S4_CART" | "S5_CHECKOUT" | "S11_PROOF" | "S14_STATUS";
  draft_order_id?: string;
  lang?: "km" | "en";
};

export function initSessionMiddleware(): MiddlewareFn<WBContext> {
  return async (ctx, next) => {
    if (!ctx.session || typeof ctx.session !== "object") (ctx as any).session = {} as WBSession;
    if (!(ctx.session as any).state) (ctx.session as any).state = "S0_HOME";
    await next();
  };
}
