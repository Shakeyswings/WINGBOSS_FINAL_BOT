import { describe, it, expect } from "vitest";
import { buildRepos } from "../src/repos/index.ts";

describe("repo toggle", () => {
  it("termux always uses local repos", async () => {
    const repos = await buildRepos({
      BOT_TOKEN: "x".repeat(20),
      OWNER_TELEGRAM_ID: "1",
      STAFF_CHAT_ID: -1,
      RUNTIME_MODE: "termux",
      BACKEND_MODE: "db",
      FAILOVER_MODE: "local",
      DEFAULT_LANG: "en",
      INCLUDE_ENGLISH_HINTS: 1,
      MENU_PATH: "./menu/menu_bundle.v1.json",
      ACADEMY_PASS_PERCENT: 80,
      GEOCODE_MODE: "off",
      GEOCODE_CACHE_TTL_HOURS: 168,
      LOG_LEVEL: "info",
    } as any);
    expect(typeof repos.orders.createDraft).toBe("function");
  });
});
