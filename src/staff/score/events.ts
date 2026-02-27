export type StaffEventType =
  | "ORDER_ACCEPTED"
  | "ORDER_REJECTED"
  | "COOKING_STARTED"
  | "MARKED_READY"
  | "DISPATCH_PACK_GENERATED"
  | "DRIVER_PICKED_UP"
  | "DELIVERED"
  | "ISSUE_RAISED"
  | "PAYMENT_VERIFIED"
  | "ATTENDANCE_OVERRIDE";

export type StaffEvent = {
  event_id: string;
  staff_id: string;
  order_id?: string;
  type: StaffEventType;
  ts: string;
  meta?: Record<string, unknown>;
};
