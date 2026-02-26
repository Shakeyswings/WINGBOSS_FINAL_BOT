export type UserId = string;
export type OrderId = string;

export type Customer = {
  user_id: UserId;
  created_at: string;
  lang: "km" | "en";
  confidence_level: 1 | 2 | 3 | 4;
  lifetime_food_spend_usd: number;
  completed_orders: number;
};

export type OrderStatus =
  | "DRAFT"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "SENT_TO_STAFF"
  | "ACCEPTED"
  | "COOKING"
  | "READY"
  | "BOOK_DRIVER"
  | "DRIVER_PICKED_UP"
  | "DELIVERED"
  | "REJECTED"
  | "ISSUE";

export type Order = {
  order_id: OrderId;
  user_id: UserId;
  created_at: string;
  updated_at: string;
  status: OrderStatus;
  items: Array<{ sku: string; name_en: string; qty: number; unit_price_usd: number; meta?: Record<string, unknown> }>;
  totals: { food_subtotal_usd: number; fees_usd: number; grand_total_usd: number };
  delivery?: { mode: "delivery" | "pickup"; location?: { lat: number; lon: number }; address?: string; recipient_name?: string; phone?: string };
  payment?: { method: "bank_transfer" | "cash"; proof_file_id?: string };
  staff?: { staff_chat_id?: number; staff_message_id?: number; staff_card_body?: string };
};

export type Inventory = { oos_item_ids: string[]; oos_flavor_ids: string[] };

export interface UsersRepo {
  getOrCreate(user_id: UserId, lang: "km" | "en"): Promise<Customer>;
  update(user: Customer): Promise<void>;
}
export interface OrdersRepo {
  createDraft(user_id: UserId): Promise<Order>;
  get(order_id: OrderId): Promise<Order | null>;
  update(order: Order): Promise<void>;
  listTodayISO(dateISO: string): Promise<Order[]>;
}
export interface InventoryRepo {
  get(): Promise<Inventory>;
  set(inv: Inventory): Promise<void>;
}
export interface HeatRepo {
  bump(user_id: UserId, delta: number): Promise<number>;
  get(user_id: UserId): Promise<number>;
}

export type Repos = { users: UsersRepo; orders: OrdersRepo; inventory: InventoryRepo; heat: HeatRepo };
