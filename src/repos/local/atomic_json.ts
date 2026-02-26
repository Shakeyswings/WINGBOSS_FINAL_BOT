import fs from "node:fs/promises";
import path from "node:path";

export async function atomicWriteJson(filePath: string, value: unknown) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), "utf-8");
  await fs.rename(tmp, filePath);
}

export async function readJsonOrInit<T>(filePath: string, initValue: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf-8")) as T;
  } catch {
    await atomicWriteJson(filePath, initValue);
    return initValue;
  }
}
