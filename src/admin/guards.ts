import type { WBContext } from "../bot.ts";

function parseIdList(csv: string): Set<string> {
  return new Set(
    String(csv || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function isOwner(ctx: WBContext): boolean {
  return String(ctx.from?.id ?? "") === String(ctx.env.OWNER_TELEGRAM_ID);
}

export function isStaffAllowlisted(ctx: WBContext): boolean {
  const id = String(ctx.from?.id ?? "");
  if (id === String(ctx.env.OWNER_TELEGRAM_ID)) return true;
  const set = parseIdList((ctx.env as any).STAFF_ALLOWLIST_IDS ?? "");
  return set.has(id);
}

export function ensureOwner(ctx: WBContext): boolean {
  return isOwner(ctx);
}
