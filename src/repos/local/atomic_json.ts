import fs from "node:fs/promises";
import path from "node:path";

export async function readJsonOrInit<T>(filePath: string, init: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    await atomicWriteJson(filePath, init);
    return init;
  }
}

export async function atomicWriteJson(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmp = `${filePath}.tmp`;
  const raw = JSON.stringify(data, null, 2);
  await fs.writeFile(tmp, raw, "utf-8");
  await fs.rename(tmp, filePath);
}
