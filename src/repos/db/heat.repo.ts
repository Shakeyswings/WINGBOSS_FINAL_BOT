import type { HeatRepo, UserId } from "../types.ts";

export class DbHeatRepo implements HeatRepo {
  constructor(private prisma: any) {}

  async bump(user_id: UserId, delta: number): Promise<number> {
    const row = await this.prisma.heat.upsert({
      where: { user_id },
      update: { meter: { increment: delta } },
      create: { user_id, meter: delta }
    });
    return Number(row.meter ?? 0);
  }

  async get(user_id: UserId): Promise<number> {
    const row = await this.prisma.heat.findUnique({ where: { user_id } });
    return Number(row?.meter ?? 0);
  }
}
