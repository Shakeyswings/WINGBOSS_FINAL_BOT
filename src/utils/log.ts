import type { Env } from "../config/env.ts";

const REDACT_KEYS = ["BOT_TOKEN", "DATABASE_URL"];

export function makeLogger(env: Env) {
  const redact = (meta: unknown) => {
    try {
      const s = typeof meta === "string" ? meta : JSON.stringify(meta);
      let out = s;
      for (const k of REDACT_KEYS) {
        const v = (env as any)[k];
        if (v) out = out.split(String(v)).join("[REDACTED]");
      }
      return out;
    } catch {
      return "[unserializable]";
    }
  };

  return {
    info: (m: string, meta?: unknown) => console.log(`[INFO] ${m}`, meta ? redact(meta) : ""),
    warn: (m: string, meta?: unknown) => console.warn(`[WARN] ${m}`, meta ? redact(meta) : ""),
    error: (m: string, meta?: unknown) => console.error(`[ERR ] ${m}`, meta ? redact(meta) : "")
  };
}
