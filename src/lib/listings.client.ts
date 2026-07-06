import { createClient } from "@/lib/supabase/client";
import { ContentItem, RoomType } from "@/types/gallery";
import {
  LISTING_SELECT,
  ListingRow,
  listingToContentItem,
} from "@/lib/listings";

export async function fetchRoomListings(
  room: RoomType,
): Promise<ContentItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("listing")
    .select(LISTING_SELECT)
    .eq("room.slug", room)
    .order("sort_order");

  if (error) throw error;
  return (data as ListingRow[]).map(listingToContentItem);
}
