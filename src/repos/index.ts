import type { Env } from "../config/env.ts";
import type { Repos } from "./types.ts";

import { LocalUsersRepo } from "./local/users.repo.ts";
import { LocalOrdersRepo } from "./local/orders.repo.ts";
import { LocalInventoryRepo } from "./local/inventory.repo.ts";
import { LocalHeatRepo } from "./local/heat.repo.ts";

function buildLocalRepos(): Repos {
  return {
    users: new LocalUsersRepo("./data/customers.json"),
    orders: new LocalOrdersRepo("./data/orders.json"),
    inventory: new LocalInventoryRepo("./data/inventory.json"),
    heat: new LocalHeatRepo("./data/heat.json")
  };
}

/**
 * SINGLE TOGGLE POINT (Termux-first)
 * DB branch is entered ONLY when:
 *   RUNTIME_MODE=server AND BACKEND_MODE=db
 */
export async function buildRepos(env: Env): Promise<Repos> {
  const runtime = String((env as any).RUNTIME_MODE ?? "termux");
  const backend = String((env as any).BACKEND_MODE ?? "off");

  if (runtime !== "server") return buildLocalRepos();
  if (backend !== "db") return buildLocalRepos();

  try {
    const { loadPrismaClient } = await import("./db/prisma.ts");
    const prisma = await loadPrismaClient();

    const { DbUsersRepo } = await import("./db/users.repo.ts");
    const { DbOrdersRepo } = await import("./db/orders.repo.ts");
    const { DbInventoryRepo } = await import("./db/inventory.repo.ts");
    const { DbHeatRepo } = await import("./db/heat.repo.ts");

    return {
      users: new DbUsersRepo(prisma),
      orders: new DbOrdersRepo(prisma),
      inventory: new DbInventoryRepo(prisma),
      heat: new DbHeatRepo(prisma)
    };
  } catch (err) {
    if (String((env as any).FAILOVER_MODE ?? "local") === "local") return buildLocalRepos();
    throw err;
  }
}
