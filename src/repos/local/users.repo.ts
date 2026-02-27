import type { UsersRepo } from "../types.ts";
import { readJsonOrInit, atomicWriteJson } from "./atomic_json.ts";

type Store = { version: 1; rows: Record<string, { created_at: string }> };

export class LocalUsersRepo implements UsersRepo {
  constructor(private filePath = "./data/customers.json") {}

  async upsertUser(userId: string): Promise<void> {
    const db = await readJsonOrInit<Store>(this.filePath, { version: 1, rows: {} });
    if (!db.rows[userId]) db.rows[userId] = { created_at: new Date().toISOString() };
    await atomicWriteJson(this.filePath, db);
  }
}
