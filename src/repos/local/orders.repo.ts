import type { OrdersRepo, Order } from "../types.ts";
import { readJsonOrInit, atomicWriteJson } from "./atomic_json.ts";
import crypto from "node:crypto";

type Store = { version: 1; rows: Record<string, Order> };

function id(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

export class LocalOrdersRepo implements OrdersRepo {
  constructor(private filePath = "./data/orders.json") {}

  async createDraft(userId: string): Promise<Order> {
    const db = await readJsonOrInit<Store>(this.filePath, { version: 1, rows: {} });
    const order: Order = {
      order_id: id(),
      user_id: userId,
      created_at: new Date().toISOString(),
      status: "DRAFT",
      items: [{ sku: "test:wings12", name_en: "Test Wings 12 pc", qty: 1, unit_price_usd: 12.5 }],
      totals: { grand_total_usd: 12.5 },
      delivery: { mode: "DELIVERY", recipient_name: "Test Customer", phone: "012345678", address: "Test Address" },
      payment: { method: "bank_transfer", status: "UNPAID" },
    };
    db.rows[order.order_id] = order;
    await atomicWriteJson(this.filePath, db);
    return order;
  }

  async get(orderId: string): Promise<Order | null> {
    const db = await readJsonOrInit<Store>(this.filePath, { version: 1, rows: {} });
    return db.rows[orderId] ?? null;
  }

  async update(order: Order): Promise<void> {
    const db = await readJsonOrInit<Store>(this.filePath, { version: 1, rows: {} });
    db.rows[order.order_id] = order;
    await atomicWriteJson(this.filePath, db);
  }

  async listByUser(userId: string): Promise<Order[]> {
    const db = await readJsonOrInit<Store>(this.filePath, { version: 1, rows: {} });
    return Object.values(db.rows).filter((o) => o.user_id === userId);
  }
}
