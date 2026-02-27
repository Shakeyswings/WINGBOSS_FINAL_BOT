import { readJsonOrInit, atomicWriteJson } from "../repos/local/atomic_json.ts";
import type { Role } from "./bank.ts";

export type Attempt = {
  ts: string;
  staff_id: string;
  role: Role;
  question_id: string;
  answer_id: string;
  score: number;
  passed: boolean;
};

type Store = { version: 1; rows: Attempt[] };

const PATH = "./data/staff_quiz_attempts.json";

export async function logAttempt(a: Attempt): Promise<void> {
  const db = await readJsonOrInit<Store>(PATH, { version: 1, rows: [] });
  db.rows.push(a);
  await atomicWriteJson(PATH, db);
}
