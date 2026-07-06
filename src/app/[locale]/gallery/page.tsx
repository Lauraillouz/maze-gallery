import { createClient } from "@/lib/supabase/server";
import GalleryPage from "@/components/gallery/GalleryPage";
import { ROOMS } from "@/data/rooms";
import { listingToContentItem, ListingRow } from "@/lib/listings";
import { Room, RoomType } from "@/types/gallery";

export default async function Gallery() {
  const supabase = createClient();
  const { data } = await supabase
    .from("listing")
    .select("*, room(slug)")
    .order("sort_order");

  let rooms: Record<RoomType, Room> = ROOMS;

  if (data && data.length > 0) {
    const byRoom: Record<string, ListingRow[]> = {};
    for (const row of data as ListingRow[]) {
      const slug = row.room.slug;
      if (!byRoom[slug]) byRoom[slug] = [];
      byRoom[slug].push(row);
    }

    const merged = { ...ROOMS };
    for (const [slug, rows] of Object.entries(byRoom)) {
      const roomType = slug as RoomType;
      if (merged[roomType]) {
        merged[roomType] = { ...merged[roomType], content: rows.map(listingToContentItem) };
      }
    }
    rooms = merged;
  }

  return <GalleryPage rooms={rooms} />;
}
