import type { WBContext } from "../bot.ts";
import { execSync } from "node:child_process";

function safeGitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "no-git";
  }
}

export async function versionCommand(ctx: WBContext) {
  const sha = safeGitSha();
  const msg =
    "🧾 WING⚡BOSS VERSION\n" +
    `Commit: ${sha}\n` +
    `Node: ${process.version}\n` +
    `RUNTIME_MODE: ${ctx.env.RUNTIME_MODE}\n` +
    `BACKEND_MODE: ${ctx.env.BACKEND_MODE}\n` +
    `FAILOVER_MODE: ${ctx.env.FAILOVER_MODE}\n`;
  return ctx.reply(msg);
}
