import GalleryPage from "@/components/gallery/GalleryPage";
import { fetchRoomListings } from "@/lib/listings.server";
import { ContentItem, RoomType } from "@/types/gallery";

export default async function Gallery() {
  let initialRoomContent: Partial<Record<RoomType, ContentItem[]>> = {};

  try {
    const entranceContent = await fetchRoomListings(RoomType.Entrance);
    if (entranceContent.length > 0) {
      initialRoomContent = { [RoomType.Entrance]: entranceContent };
    }
  } catch {
    // Fall back to static content baked into ROOMS
  }

  return <GalleryPage initialRoomContent={initialRoomContent} />;
}
