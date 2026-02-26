import fs from "node:fs/promises";

export type Role = "Cook" | "Fryer" | "Waitress" | "Bartender" | "Manager";

export type BankOption = { id: string; en: string; km: string; correct: boolean };
export type BankQuestion = {
  id: string;
  role: Role;
  topic: string;
  prompt_en: string;
  prompt_km: string;
  options: BankOption[];
  notes_en?: string;
  notes_km?: string;
};

type BankFile = { version: 1; questions: BankQuestion[] };

const PATH = "./data/staff_question_bank.json";

export async function loadBank(): Promise<BankFile> {
  const raw = await fs.readFile(PATH, "utf-8");
  return JSON.parse(raw) as BankFile;
}

export function pickForRole(bank: BankFile, role: Role): BankQuestion[] {
  return bank.questions.filter((q) => q.role === role);
}

export function gradeQuestion(q: BankQuestion, answerId: string): { score: number; passed: boolean } {
  const opt = q.options.find((o) => o.id === answerId);
  const ok = Boolean(opt?.correct);
  return { score: ok ? 100 : 0, passed: ok };
}
