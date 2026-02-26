import type { WBContext } from "../bot.ts";

export async function ordersToday(ctx: WBContext) {
  const iso = new Date().toISOString().slice(0, 10);
  const repos = (ctx as any).wb?.repos;
  const orders = repos ? await repos.orders.listTodayISO(iso) : [];
  await ctx.reply(`Orders today (${iso}): ${orders.length}`);
}
