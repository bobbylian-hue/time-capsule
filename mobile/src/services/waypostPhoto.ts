// A Waypost's uploaded photo (map builder R1): players see it on the spin screen instead of the scene picture.
import { supabase } from "./supabase";

export const WAYPOST_PHOTOS = "waypost-photos";

/** The photo as an address an Image can load: the server may send a public URL or a path in the public bucket. */
export function photoUrl(photo: string | null | undefined): string | null {
  if (!photo) return null;
  if (/^(https?:|data:|blob:|file:)/.test(photo)) return photo;
  return supabase.storage.from(WAYPOST_PHOTOS).getPublicUrl(photo).data.publicUrl;
}
