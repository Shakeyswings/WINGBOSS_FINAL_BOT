import "dotenv/config";
import { loadEnv } from "./config/index.ts";
import { buildBot } from "./bot.ts";

async function main() {
  const env = loadEnv(process.env);
  console.log("✅ Boot:", { RUNTIME_MODE: env.RUNTIME_MODE, BACKEND_MODE: env.BACKEND_MODE, FAILOVER_MODE: env.FAILOVER_MODE });
  const bot = await buildBot(env);
  await bot.launch();
  console.log("✅ Bot launched (long-polling)");
  process.once("SIGINT", () => bot.stop("SIGINT"));
  process.once("SIGTERM", () => bot.stop("SIGTERM"));
}
main().catch((e) => { console.error(e); process.exit(1); });
