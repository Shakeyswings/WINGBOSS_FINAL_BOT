import type { InventoryRepo } from "../types.ts";
import { readJsonOrInit } from "./atomic_json.ts";

type Store = { version: 1; sold_out: Record<string, boolean> };

export class LocalInventoryRepo implements InventoryRepo {
  constructor(private filePath = "./data/inventory.json") {}

  async isSoldOut(itemId: string): Promise<boolean> {
    const db = await readJsonOrInit<Store>(this.filePath, { version: 1, sold_out: {} });
    return Boolean(db.sold_out[itemId]);
  }
}
