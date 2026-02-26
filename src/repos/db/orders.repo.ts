import type { OrdersRepo, Order, OrderId, UserId } from "../types.ts";
import { randomUUID } from "node:crypto";

export class DbOrdersRepo implements OrdersRepo {
  constructor(private prisma: any) {}

  async createDraft(user_id: UserId): Promise<Order> {
    const now = new Date().toISOString();
    const order: Order = {
      order_id: randomUUID().slice(0, 8).toUpperCase(),
      user_id,
      created_at: now,
      updated_at: now,
      status: "DRAFT",
      items: [],
      totals: { food_subtotal_usd: 0, fees_usd: 0, grand_total_usd: 0 }
    };
    await this.prisma.order.create({ data: order });
    return order;
  }

  async get(order_id: OrderId): Promise<Order | null> {
    return await this.prisma.order.findUnique({ where: { order_id } });
  }

  async update(order: Order): Promise<void> {
    await this.prisma.order.upsert({
      where: { order_id: order.order_id },
      update: { ...order, updated_at: new Date().toISOString() },
      create: order
    });
  }

  async listTodayISO(dateISO: string): Promise<Order[]> {
    return await this.prisma.order.findMany({ where: { created_at: { startsWith: dateISO } } });
  }
}
