import { z } from "zod";

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(10),
  BOT_USERNAME: z.string().min(3).optional(),

  OWNER_TELEGRAM_ID: z.coerce.string().min(1),
  STAFF_CHAT_ID: z.coerce.number().int(),

  STAFF_ALLOWLIST_IDS: z.string().optional(),

  RUNTIME_MODE: z.enum(["termux", "server"]).default("termux"),
  BACKEND_MODE: z.enum(["off", "db"]).default("off"),
  FAILOVER_MODE: z.enum(["local", "hard_fail"]).default("local"),

  DEFAULT_LANG: z.enum(["km", "en"]).default("km"),
  INCLUDE_ENGLISH_HINTS: z.coerce.number().int().default(1),

  MENU_PATH: z.string().default("./menu/menu_bundle.v1.json"),

  ACADEMY_PASS_PERCENT: z.coerce.number().int().min(1).max(100).default(80),

  GEOCODE_MODE: z.enum(["off", "osm"]).default("off"),
  GEOCODE_CACHE_TTL_HOURS: z.coerce.number().int().min(1).max(24*30).default(168),

  LOG_LEVEL: z.enum(["debug","info","warn","error"]).default("info"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): Env {
  const parsed = EnvSchema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid env:\n${msg}`);
  }
  return parsed.data;
}
