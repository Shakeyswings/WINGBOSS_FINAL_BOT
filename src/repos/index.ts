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
    heat: new LocalHeatRepo(),
  };
}

/**
 * SINGLE TOGGLE POINT:
 * - Termux: always local JSON repos
 * - Server + BACKEND_MODE=db: dynamic-import Prisma repos
 */
export async function buildRepos(env: Env): Promise<Repos> {
  if (env.RUNTIME_MODE !== "server") return buildLocalRepos();
  if (env.BACKEND_MODE === "off") return buildLocalRepos();

  try {
    const { loadPrismaClient } = await import("./db/prisma.ts");
    const prisma = await loadPrismaClient();

    const { DbUsersRepo } = await import("./db/users.repo.ts");
    const { DbOrdersRepo } = await import("./db/orders.repo.ts");
    const { DbInventoryRepo } = await import("./db/inventory.repo.ts");
    const { DbHeatRepo } = await import("./db/heat.repo.ts");

    return {
      users: new DbUsersRepo(prisma) as any,
      orders: new DbOrdersRepo(prisma) as any,
      inventory: new DbInventoryRepo(prisma) as any,
      heat: new DbHeatRepo(prisma) as any,
    };
  } catch (err) {
    if (env.FAILOVER_MODE === "local") return buildLocalRepos();
    throw err;
  }
}
