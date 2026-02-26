export type TelegramFileId = string;

/**
 * Telegram file_id is an opaque string. We only need a sanity check.
 */
export function isTelegramFileId(x: unknown): x is TelegramFileId {
  return typeof x === "string" && x.length >= 10;
}
