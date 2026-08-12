import "dotenv/config";
import { loadMenu } from "../menu/loader.ts";
import util from "node:util";

const DEFAULT_MENU_PATH = "./menu/menu_bundle.v1.json";

async function main() {
  const menuPath = process.env.MENU_PATH || DEFAULT_MENU_PATH;
  const menu = await loadMenu(menuPath);
  console.log("✅ Menu OK");
  console.log("Source:", menuPath);
  console.log("Brand:", menu.brand.name);
  console.log("Categories:", menu.catalog.categories.length);
  console.log("Flavors:", menu.catalog.flavors.length);
}

main().catch((e) => {
  console.error("❌ Menu check failed:");
  console.error(typeof e === "object" ? util.inspect(e, { depth: 10 }) : String(e));
  process.exit(1);
});
