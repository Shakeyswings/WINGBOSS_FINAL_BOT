export type Money = { currency: "USD"; amount: number };

export type Delivery = {
  mode: "DELIVERY" | "PICKUP";
  recipient_name?: string;
  phone?: string;
  address?: string;
  location?: { lat: number; lon: number };
};

export type Payment = {
  method: "cash" | "bank_transfer";
  status: "UNPAID" | "PROOF_SENT" | "PAID" | "REFUNDED";
  proof?: { file_id: string };
};

export type OrderStatus =
  | "DRAFT"
  | "SENT_TO_STAFF"
  | "ACCEPTED"
  | "COOKING"
  | "READY"
  | "DISPATCHED"
  | "PICKED"
  | "DELIVERED"
  | "REJECTED"
  | "ISSUE";

export type OrderItem = { sku: string; name_en: string; qty: number; unit_price_usd: number };

export type Order = {
  order_id: string;
  user_id: string;
  created_at: string;
  status: OrderStatus;
  items: OrderItem[];
  totals: { grand_total_usd: number };
  delivery?: Delivery;
  payment?: Payment;
  staff?: { staff_chat_id: number; staff_message_id: number; staff_card_body: string };
};

export interface UsersRepo {
  upsertUser(userId: string): Promise<void>;
}

export interface OrdersRepo {
  createDraft(userId: string): Promise<Order>;
  get(orderId: string): Promise<Order | null>;
  update(order: Order): Promise<void>;
  listByUser(userId: string): Promise<Order[]>;
}

export interface InventoryRepo {
  isSoldOut(itemId: string): Promise<boolean>;
}

export interface HeatRepo {
  noop(): Promise<void>;
}

export type Repos = { users: UsersRepo; orders: OrdersRepo; inventory: InventoryRepo; heat: HeatRepo };
