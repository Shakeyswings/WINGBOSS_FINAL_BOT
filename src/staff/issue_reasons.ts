export type IssueReason =
  | "DELAY"
  | "WRONG_ITEM"
  | "OOS"
  | "ADDRESS_PROBLEM"
  | "PAYMENT_PROBLEM"
  | "CUSTOMER_UNREACHABLE"
  | "DRIVER_NO_SHOW"
  | "OTHER";

export const ISSUE_REASON_LABELS: Record<IssueReason, string> = {
  DELAY: "⏱ Delay",
  WRONG_ITEM: "❌ Wrong item",
  OOS: "🚫 Out of stock",
  ADDRESS_PROBLEM: "📍 Address problem",
  PAYMENT_PROBLEM: "💳 Payment problem",
  CUSTOMER_UNREACHABLE: "📵 Customer unreachable",
  DRIVER_NO_SHOW: "🚗 Driver no-show",
  OTHER: "📝 Other"
};
