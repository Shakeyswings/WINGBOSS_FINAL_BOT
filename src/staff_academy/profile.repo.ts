import fs from "node:fs/promises";
import type { Role } from "./bank.ts";

type Profile = { role?: Role; updated_at?: string };
type FileDb = { version: 1; profiles: Record<string, Profile> };

const PATH = "./data/staff_profiles.json";

async function read(): Promise<FileDb> {
  try {
    return JSON.parse(await fs.readFile(PATH, "utf-8")) as FileDb;
  } catch {
    return { version: 1, profiles: {} };
  }
}

async function write(db: FileDb) {
  await fs.writeFile(PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function getRole(staffId: string): Promise<Role | null> {
  const db = await read();
  return (db.profiles[staffId]?.role ?? null) as Role | null;
}

export async function setRole(staffId: string, role: Role) {
  const db = await read();
  db.profiles[staffId] = { role, updated_at: new Date().toISOString() };
  await write(db);
}
