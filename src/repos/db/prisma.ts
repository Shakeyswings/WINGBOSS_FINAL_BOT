/**
 * Termux-first hard safety stub:
 * - Must not reference @prisma/client at all (prevents resolution attempts).
 * - Only used later in server mode when you install Prisma.
 */
export async function loadPrismaClient(): Promise<never> {
  throw new Error(
    "Prisma disabled. Use RUNTIME_MODE=server + BACKEND_MODE=db and install @prisma/client to enable."
  );
}
