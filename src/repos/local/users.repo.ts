import { readJsonOrInit, atomicWriteJson } from "./atomic_json.ts";
import type { Customer, UsersRepo, UserId } from "../types.ts";

type UsersFile = { version: 1; customers: Customer[] };

export class LocalUsersRepo implements UsersRepo {
  constructor(private filePath: string) {}

  async getOrCreate(user_id: UserId, lang: "km" | "en") {
    const db = await readJsonOrInit<UsersFile>(this.filePath, { version: 1, customers: [] });
    const found = db.customers.find((c) => c.user_id === user_id);
    if (found) return found;

    const created: Customer = {
      user_id,
      created_at: new Date().toISOString(),
      lang,
      confidence_level: 1,
      lifetime_food_spend_usd: 0,
      completed_orders: 0
    };
    db.customers.push(created);
    await atomicWriteJson(this.filePath, db);
    return created;
  }

  async update(user: Customer) {
    const db = await readJsonOrInit<UsersFile>(this.filePath, { version: 1, customers: [] });
    const idx = db.customers.findIndex((c) => c.user_id === user.user_id);
    if (idx >= 0) db.customers[idx] = user;
    else db.customers.push(user);
    await atomicWriteJson(this.filePath, db);
  }
}
