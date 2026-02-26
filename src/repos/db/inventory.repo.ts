import type { InventoryRepo, Inventory } from "../types.ts";

export class DbInventoryRepo implements InventoryRepo {
  constructor(private prisma: any) {}

  async get(): Promise<Inventory> {
    const row = await this.prisma.inventory.findFirst();
    return (row?.value ?? { oos_item_ids: [], oos_flavor_ids: [] }) as Inventory;
  }

  async set(inv: Inventory): Promise<void> {
    await this.prisma.inventory.upsert({
      where: { id: 1 },
      update: { value: inv },
      create: { id: 1, value: inv }
    });
  }
}
