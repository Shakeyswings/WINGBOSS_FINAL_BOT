import { readJsonOrInit, atomicWriteJson } from "./atomic_json.ts";
import type { Order, OrdersRepo, OrderId, UserId } from "../types.ts";
import { randomUUID } from "node:crypto";

type OrdersFile = { version: 1; orders: Order[] };

export class LocalOrdersRepo implements OrdersRepo {
  constructor(private filePath: string) {}

  async createDraft(user_id: UserId): Promise<Order> {
    const db = await readJsonOrInit<OrdersFile>(this.filePath, { version: 1, orders: [] });
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
    db.orders.push(order);
    await atomicWriteJson(this.filePath, db);
    return order;
  }

  async get(order_id: OrderId): Promise<Order | null> {
    const db = await readJsonOrInit<OrdersFile>(this.filePath, { version: 1, orders: [] });
    return db.orders.find((o) => o.order_id === order_id) ?? null;
  }

  async update(order: Order): Promise<void> {
    const db = await readJsonOrInit<OrdersFile>(this.filePath, { version: 1, orders: [] });
    const idx = db.orders.findIndex((o) => o.order_id === order.order_id);
    const next = { ...order, updated_at: new Date().toISOString() };
    if (idx >= 0) db.orders[idx] = next;
    else db.orders.push(next);
    await atomicWriteJson(this.filePath, db);
  }

  async listTodayISO(dateISO: string): Promise<Order[]> {
    const db = await readJsonOrInit<OrdersFile>(this.filePath, { version: 1, orders: [] });
    return db.orders.filter((o) => o.created_at.startsWith(dateISO));
  }
}
