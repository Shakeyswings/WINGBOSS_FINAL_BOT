import type { Order } from "../repos/types.ts";
import type { Env } from "../config/env.ts";
import fs from "node:fs/promises";

type CacheRow = { ts: string; label: string };
type CacheFile = { version: 1; rows: Record<string, CacheRow> };

const CACHE_PATH = "./data/geocode_cache.json";

function key(lat: number, lon: number): string {
  return `${lat.toFixed(5)},${lon.toFixed(5)}`;
}

function mapsPin(lat: number, lon: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

function mapsNearby(query: string, lat: number, lon: number): string {
  const q = encodeURIComponent(`${query} near ${lat},${lon}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

async function readCache(): Promise<CacheFile> {
  try {
    return JSON.parse(await fs.readFile(CACHE_PATH, "utf-8")) as CacheFile;
  } catch {
    return { version: 1, rows: {} };
  }
}

async function writeCache(db: CacheFile) {
  await fs.writeFile(CACHE_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function isFresh(ts: string, ttlHours: number): boolean {
  const ageMs = Date.now() - new Date(ts).getTime();
  return ageMs >= 0 && ageMs <= ttlHours * 60 * 60 * 1000;
}

async function reverseGeocodeOSM(lat: number, lon: number, env: Env): Promise<string | null> {
  if (env.GEOCODE_MODE !== "osm") return null;

  const k = key(lat, lon);
  const db = await readCache();
  const cached = db.rows[k];
  if (cached && isFresh(cached.ts, env.GEOCODE_CACHE_TTL_HOURS)) return cached.label;

  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "WINGBOSS-TermuxBot/1.0 (Telegram bot; contact @callwingboss)",
        "Accept": "application/json"
      }
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const label = String(json?.display_name ?? "").trim();
    if (!label) return null;

    db.rows[k] = { ts: new Date().toISOString(), label };
    await writeCache(db);
    return label;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export async function buildDispatchPack(order: Order, env: Env): Promise<string> {
  const d = order.delivery;
  const loc = d?.location;
  const lat = loc?.lat;
  const lon = loc?.lon;

  let addrHint = "-";
  let pin = "-";
  let nearMarket = "-";
  let nearBank = "-";
  let nearRestaurant = "-";

  if (typeof lat === "number" && typeof lon === "number") {
    pin = mapsPin(lat, lon);
    nearMarket = mapsNearby("market", lat, lon);
    nearBank = mapsNearby("bank", lat, lon);
    nearRestaurant = mapsNearby("restaurant", lat, lon);

    const rev = await reverseGeocodeOSM(lat, lon, env);
    if (rev) addrHint = rev;
  }

  return [
    "📋 DISPATCH PACK (copy/paste)",
    `Order: ${order.order_id}`,
    `Total: $${order.totals.grand_total_usd.toFixed(2)}`,
    `Recipient: ${d?.recipient_name ?? "-"}`,
    `Phone: ${d?.phone ?? "-"}`,
    `Address (customer): ${d?.address ?? "-"}`,
    `Address (auto): ${addrHint}`,
    `Pin: ${pin}`,
    `Nearby (Market): ${nearMarket}`,
    `Nearby (Bank): ${nearBank}`,
    `Nearby (Restaurant): ${nearRestaurant}`,
    "",
    "Notes:",
    "- No Grab API. Manual booking only."
  ].join("\n");
}
