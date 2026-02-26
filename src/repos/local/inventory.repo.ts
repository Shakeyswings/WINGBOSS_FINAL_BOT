import { readJsonOrInit, atomicWriteJson } from "./atomic_json.ts";
import type { Inventory, InventoryRepo } from "../types.ts";

type InvFile = { version: 1; inventory: Inventory };

export class LocalInventoryRepo implements InventoryRepo {
  constructor(private filePath: string) {}

  async get(): Promise<Inventory> {
    const db = await readJsonOrInit<InvFile>(this.filePath, {
      version: 1,
      inventory: { oos_item_ids: [], oos_flavor_ids: [] }
    });
    return db.inventory;
  }

  async set(inv: Inventory): Promise<void> {
    const db = await readJsonOrInit<InvFile>(this.filePath, { version: 1, inventory: inv });
    db.inventory = inv;
    await atomicWriteJson(this.filePath, db);
  }
}
