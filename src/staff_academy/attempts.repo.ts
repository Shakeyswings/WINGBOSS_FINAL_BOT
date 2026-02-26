import fs from "node:fs/promises";
import type { Role } from "./bank.ts";

export type QuizAttempt = {
  ts: string;
  staff_id: string;
  role: Role;
  question_id: string;
  answer_id: string;
  score: number;
  passed: boolean;
};

type Db = { version: 1; attempts: QuizAttempt[] };
const PATH = "./data/staff_quiz_attempts.json";

async function read(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(PATH, "utf-8")) as Db;
  } catch {
    return { version: 1, attempts: [] };
  }
}

async function write(db: Db) {
  await fs.writeFile(PATH, JSON.stringify(db, null, 2), "utf-8");
}

export async function logAttempt(a: QuizAttempt) {
  const db = await read();
  db.attempts.push(a);
  await write(db);
}
