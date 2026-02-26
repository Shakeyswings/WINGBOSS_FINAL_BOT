import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(10),
  OWNER_TELEGRAM_ID: z.coerce.number().int().positive(),
  STAFF_CHAT_ID: z.coerce.number().int(),

  RUNTIME_MODE: z.enum(["termux", "server"]).default("termux"),
  BACKEND_MODE: z.enum(["off", "db"]).default("off"),
  FAILOVER_MODE: z.enum(["local", "hard_fail"]).default("local"),

  TIMEZONE: z.string().default("Asia/Phnom_Penh"),
  USD_TO_KHR: z.coerce.number().int().positive().default(4100),
  DEFAULT_LANG: z.enum(["km", "en"]).default("km"),
  INCLUDE_ENGLISH_HINTS: z.coerce.number().int().min(0).max(1).default(0).transform((v) => v === 1),

  MENU_PATH: z.string().default("./menu/menu_bundle.v1.json"),
  MENU_FALLBACK_PATH: z.string().default("./menu/menu_single.v1.json"),

  CLOSED_MODE: z.coerce.number().int().min(0).max(1).default(0).transform((v) => v === 1),
  BUSY_MODE: z.coerce.number().int().min(0).max(1).default(0).transform((v) => v === 1),

  PAYMENT_PROOF_REQUIRED: z.coerce.number().int().min(0).max(1).default(1).transform((v) => v === 1),

  GEOCODE_MODE: z.enum(["off", "osm"]).default("osm"),
  GEOCODE_CACHE_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),

  OWNER_NOTIFY_ISSUES: z.coerce.number().int().min(0).max(1).default(0).transform((v) => v === 1)
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid env:\n${msg}`);
  }
  return parsed.data;
}
