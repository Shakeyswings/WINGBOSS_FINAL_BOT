import type { MiddlewareFn } from "telegraf";
import type { WBContext } from "../bot.ts";

export type WBSession = {
  state: string;
  lang?: "km" | "en";
  cart?: { items: Array<{ sku: string; qty: number }> };
};

export function initSessionMiddleware(): MiddlewareFn<WBContext> {
  return async (ctx, next) => {
    const s = (ctx.session ?? {}) as WBSession;
    if (!s.state) s.state = "S0_HOME";
    ctx.session = s as any;
    return next();
  };
}
