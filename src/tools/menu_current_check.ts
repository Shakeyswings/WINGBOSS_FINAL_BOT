import "dotenv/config";
import util from "node:util";
import { loadCurrentMenuDocument, getCurrentMenuIndex, CURRENT_MENU_PATH } from "../menu/current-menu.ts";

async function main() {
  const parsed = loadCurrentMenuDocument(CURRENT_MENU_PATH);
  const index = getCurrentMenuIndex(CURRENT_MENU_PATH);
  const itemCount = parsed.catalog.categories.reduce((count, category) => count + category.items.length, 0);
  const variantCount = parsed.catalog.categories.reduce((count, category) => count + category.items.reduce((total, item) => total + (item.variants?.length ?? 0), 0), 0);

  console.log("✅ Canonical current menu OK");
  console.log("Source:", CURRENT_MENU_PATH);
  console.log("Schema:", parsed.schema_version);
  console.log("Categories:", parsed.catalog.categories.length);
  console.log("Items:", itemCount);
  console.log("Variants:", variantCount);
  console.log("Modifier groups:", parsed.catalog.modifier_groups.length);
  console.log("Indexed items:", index.itemsById.size);
}

main().catch((error) => {
  console.error("❌ Canonical current menu check failed:");
  console.error(typeof error === "object" ? util.inspect(error, { depth: 10 }) : String(error));
  process.exit(1);
});
