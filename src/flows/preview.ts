import type { WBContext } from "../bot.ts";
import { isStaffAllowlisted } from "../admin/guards.ts";

export type PreviewSection = "boss" | "sweet";

export function canAccessArchitecturePreview(ctx: WBContext, section: PreviewSection): boolean {
  if (isStaffAllowlisted(ctx)) return true;
  if (ctx.env.DEPLOYMENT_ENV === "production") return false;
  if (section === "boss") return ctx.env.BOSS_MODE_PREVIEW_ENABLED;
  return ctx.env.SWEET_LAB_PREVIEW_ENABLED;
}
