import fs from "node:fs/promises";
import type { AcademyModuleId } from "./modules.ts";

type ProgressRow = {
  completed: Record<string, { ts: string; score: number }>;
  certified: boolean;
  certified_ts?: string;
};

type ProgressFile = { version: 1; progress: Record<string, ProgressRow> };

const PATH = "./data/staff_progress.json";

async function read(): Promise<ProgressFile> {
  try {
    return JSON.parse(await fs.readFile(PATH, "utf-8"));
  } catch {
    return { version: 1, progress: {} };
  }
}

async function write(db: ProgressFile) {
  await fs.writeFile(PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function getProgress(staffId: string): Promise<ProgressRow> {
  const db = await read();
  return db.progress[staffId] ?? { completed: {}, certified: false };
}

export async function markComplete(staffId: string, moduleId: AcademyModuleId, score: number) {
  const db = await read();
  const row = db.progress[staffId] ?? { completed: {}, certified: false };
  row.completed[moduleId] = { ts: new Date().toISOString(), score };
  db.progress[staffId] = row;
  await write(db);
}

export async function setCertified(staffId: string, certified: boolean) {
  const db = await read();
  const row = db.progress[staffId] ?? { completed: {}, certified: false };
  row.certified = certified;
  row.certified_ts = certified ? new Date().toISOString() : undefined;
  db.progress[staffId] = row;
  await write(db);
}
