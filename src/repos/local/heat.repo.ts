import { readJsonOrInit, atomicWriteJson } from "./atomic_json.ts";
import type { HeatRepo, UserId } from "../types.ts";

type HeatFile = { version: 1; meters: Record<string, number> };

export class LocalHeatRepo implements HeatRepo {
  constructor(private filePath: string) {}

  async bump(user_id: UserId, delta: number): Promise<number> {
    const db = await readJsonOrInit<HeatFile>(this.filePath, { version: 1, meters: {} });
    db.meters[user_id] = (db.meters[user_id] ?? 0) + delta;
    await atomicWriteJson(this.filePath, db);
    return db.meters[user_id];
  }

  async get(user_id: UserId): Promise<number> {
    const db = await readJsonOrInit<HeatFile>(this.filePath, { version: 1, meters: {} });
    return db.meters[user_id] ?? 0;
  }
}
