import { readJsonOrInit, atomicWriteJson } from "../repos/local/atomic_json.ts";
import type { Role } from "./bank.ts";

type Store = { version: 1; rows: Record<string, { role: Role }> };

const PATH = "./data/staff_profiles.json";

export async function getRole(staffId: string): Promise<Role | null> {
  const db = await readJsonOrInit<Store>(PATH, { version: 1, rows: {} });
  return db.rows[staffId]?.role ?? null;
}

export async function setRole(staffId: string, role: Role): Promise<void> {
  const db = await readJsonOrInit<Store>(PATH, { version: 1, rows: {} });
  db.rows[staffId] = { role };
  await atomicWriteJson(PATH, db);
}
