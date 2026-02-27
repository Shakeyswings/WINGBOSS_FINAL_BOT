import type { Env } from "../config/env.ts";

function redact(s: string): string {
  return s.replace(/(BOT_TOKEN=)([^\s]+)/g, "$1[REDACTED]");
}

export function makeLogger(env: Env) {
  const level = env.LOG_LEVEL;
  const rank: Record<string, number> = { debug: 10, info: 20, warn: 30, error: 40 };
  const min = rank[level] ?? 20;

  function out(lvl: keyof typeof rank, msg: string, meta?: unknown) {
    if ((rank[lvl] ?? 99) < min) return;
    const base = `[${lvl.toUpperCase()}] ${redact(msg)}`;
    // Keep meta small; never log env.
    if (meta === undefined) console.log(base);
    else console.log(base, meta);
  }

  return { debug: (m: string, meta?: unknown) => out("debug", m, meta),
           info:  (m: string, meta?: unknown) => out("info", m, meta),
           warn:  (m: string, meta?: unknown) => out("warn", m, meta),
           error: (m: string, meta?: unknown) => out("error", m, meta) };
}
