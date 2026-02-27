import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LockFlavor = {
  number: number;
  name_en: string;
  family: string;
  is_dry_rub: boolean;
  in_house_only: boolean;
  token: string;
  heat_icon?: string;
};

const ROOT = path.resolve(__dirname, "../..");
const LOCK_PATH = path.join(ROOT, "menu", "flavors_70.lock.json");
const BUNDLE_PATH = path.join(ROOT, "menu", "menu_bundle.v1.json");

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function loadJson(p: string) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function main() {
  if (!fs.existsSync(LOCK_PATH)) die(`Missing: ${LOCK_PATH}`);
  if (!fs.existsSync(BUNDLE_PATH)) die(`Missing: ${BUNDLE_PATH}`);

  const lock = loadJson(LOCK_PATH) as LockFlavor[];
  if (!Array.isArray(lock) || lock.length < 70) die("Lock file invalid or missing entries.");

  const raw = loadJson(BUNDLE_PATH) as any;

  const flavors = lock
    .slice()
    .sort((a, b) => a.number - b.number)
    .map((f) => ({
      code: `FLV_${String(f.number).padStart(2, "0")}`,
      num: f.number,
      token: f.token,
      name_en: f.name_en,
      name_km: null,
      family: f.family,
      group: f.family,
      is_dry_rub: Boolean(f.is_dry_rub),
      in_house_only: Boolean(f.in_house_only),
      heat_icon: f.heat_icon ?? ""
    }));

  raw.flavors = flavors;

  fs.writeFileSync(BUNDLE_PATH, JSON.stringify(raw, null, 2), "utf8");
  console.log(`✅ Applied flavors (70) to ${BUNDLE_PATH}`);
}

main();
