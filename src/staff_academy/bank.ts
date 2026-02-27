import fs from "node:fs/promises";

export type Role = "Cook" | "Fryer" | "Waitress" | "Bartender" | "Manager";

export type BankOption = {
  id: string;
  km: string;
  en: string;
  correct?: boolean;
};

export type BankQuestion = {
  id: string;
  role: Role;
  topic?: string;
  prompt_km: string;
  prompt_en: string;
  options: BankOption[];
  notes_km?: string;
  notes_en?: string;
};

export type QuestionBank = {
  version: number;
  questions: BankQuestion[];
};

const BANK_PATH = "./data/staff_question_bank.json";

let cached: { mtimeMs: number; bank: QuestionBank } | null = null;

async function fileMtime(path: string): Promise<number> {
  try {
    const st = await fs.stat(path);
    return st.mtimeMs;
  } catch {
    return -1;
  }
}

function emptyBank(): QuestionBank {
  return { version: 1, questions: [] };
}

export async function loadBank(): Promise<QuestionBank> {
  const mtimeMs = await fileMtime(BANK_PATH);

  if (cached && cached.mtimeMs === mtimeMs) return cached.bank;

  try {
    const raw = await fs.readFile(BANK_PATH, "utf-8");
    const parsed = JSON.parse(raw) as QuestionBank;

    // minimal safety
    if (!parsed || typeof parsed !== "object") throw new Error("bad bank");
    if (!Array.isArray((parsed as any).questions)) throw new Error("missing questions[]");

    cached = { mtimeMs, bank: parsed };
    return parsed;
  } catch {
    const bank = emptyBank();
    cached = { mtimeMs, bank };
    return bank;
  }
}

export function pickForRole(bank: QuestionBank, role: Role): BankQuestion[] {
  const qs = (bank.questions || []).filter((q) => q.role === role);
  return qs.length ? qs : (bank.questions || []);
}

export function gradeQuestion(q: BankQuestion, answerId: string): { score: number; passed: boolean } {
  const opt = (q.options || []).find((o) => o.id === answerId);
  const correct = Boolean(opt?.correct);
  return { score: correct ? 100 : 0, passed: correct };
}
