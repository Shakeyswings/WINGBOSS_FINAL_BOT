import "dotenv/config";
import { loadEnv } from "../config/index.ts";
import { loadMenu } from "../menu/loader.ts";
import util from "node:util";

async function main() {
  const env = loadEnv(process.env);
  const menu = await loadMenu(env.MENU_PATH);
  console.log("✅ Menu OK");
  console.log("Brand:", menu.brand.name);
  console.log("Categories:", menu.catalog.categories.length);
  console.log("Flavors:", menu.catalog.flavors.length);
}

main().catch((e) => {
  console.error("❌ Menu check failed:");
  console.error(typeof e === "object" ? util.inspect(e, { depth: 10 }) : String(e));
  process.exit(1);
});
