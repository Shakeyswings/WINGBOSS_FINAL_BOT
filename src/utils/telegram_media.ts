export type TelegramFileRef = {
  file_id: string;
  file_unique_id?: string;
  mime_type?: string;
};

export function photoToFileRef(message: any): TelegramFileRef | null {
  const photos = message?.photo;
  if (!Array.isArray(photos) || photos.length === 0) return null;
  const p = photos[photos.length - 1];
  if (!p?.file_id) return null;
  return { file_id: p.file_id, file_unique_id: p.file_unique_id };
}
