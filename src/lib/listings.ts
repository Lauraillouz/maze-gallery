import { ContentItem, ContentType, Direction } from "@/types/gallery";

export const LISTING_SELECT = "*, room!inner(slug)";

export interface ListingRow {
  id: string;
  room_id: string;
  room: { slug: string };
  static_id: string | null;
  content_type: ContentType;
  wall: Direction;
  title: string;
  artist_name: string;
  artist_id: string | null;
  medium: string | null;
  description: string | null;
  size: string | null;
  price: number | null;
  edition_size: number | null;
  edition_number: number | null;
  for_sale: boolean;
  image_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function listingToContentItem(row: ListingRow): ContentItem {
  return {
    id: row.static_id ?? row.id,
    type: row.content_type,
    wall: row.wall,
    title: row.title,
    artist: row.artist_name,
    medium: row.medium ?? undefined,
    description: row.description ?? undefined,
    size: row.size ?? undefined,
    price: row.price ?? undefined,
    editionSize: row.edition_size ?? undefined,
    editionNumber: row.edition_number ?? undefined,
    forSale: row.for_sale,
    imageUrl: row.image_url ?? undefined,
  };
}
