/**
DB mode is intentionally dormant in Termux.
This module MUST NOT be imported at module-load time when BACKEND_MODE=off.
*/
export async function loadPrismaClient(): Promise<never> {
  throw new Error("Prisma disabled. Use RUNTIME_MODE=server + BACKEND_MODE=db and install @prisma/client to enable.");
}
