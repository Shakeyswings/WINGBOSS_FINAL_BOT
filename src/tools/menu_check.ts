import "dotenv/config";
import { loadMenu } from "../menu/loader.ts";

const path = process.env.MENU_PATH ?? "./menu/menu_bundle.v1.json";
const menu = await loadMenu(path);

console.log("✅ Menu OK");
console.log("Brand:", menu.brand.name);
console.log("Categories:", menu.catalog.categories.length);
console.log("Flavors:", (menu.catalog?.flavors?.length ?? 0));
