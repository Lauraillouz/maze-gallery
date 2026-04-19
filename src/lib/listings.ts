import { createClient } from '@/lib/supabase/client'
import { ContentItem, ContentType, Direction } from '@/types/gallery'

// DB row shape (matches the listing table)
export interface ListingRow {
  id: string
  room_slug: string
  static_id: string | null
  content_type: 'artwork' | 'book' | 'article' | 'music'
  wall: 'north' | 'south' | 'east' | 'west'
  title: string
  artist_name: string
  artist_id: string | null
  medium: string | null
  description: string | null
  size: string | null
  price: number | null
  edition_size: number | null
  edition_number: number | null
  for_sale: boolean
  image_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

const CONTENT_TYPE_MAP: Record<ListingRow['content_type'], ContentType> = {
  artwork: ContentType.Artwork,
  book:    ContentType.Book,
  article: ContentType.Article,
  music:   ContentType.Music,
}

const DIRECTION_MAP: Record<ListingRow['wall'], Direction> = {
  north: Direction.North,
  south: Direction.South,
  east:  Direction.East,
  west:  Direction.West,
}

export function listingToContentItem(row: ListingRow): ContentItem {
  return {
    id:            row.static_id ?? row.id,
    type:          CONTENT_TYPE_MAP[row.content_type],
    wall:          DIRECTION_MAP[row.wall],
    title:         row.title,
    artist:        row.artist_name,
    medium:        row.medium ?? undefined,
    description:   row.description ?? undefined,
    size:          row.size ?? undefined,
    price:         row.price ?? undefined,
    editionSize:   row.edition_size ?? undefined,
    editionNumber: row.edition_number ?? undefined,
    forSale:       row.for_sale,
    imageUrl:      row.image_url ?? undefined,
  }
}

export async function fetchListingsForRoom(roomSlug: string): Promise<ContentItem[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('listing')
    .select('*')
    .eq('room_slug', roomSlug)
    .order('sort_order')

  if (error) throw error
  return (data as ListingRow[]).map(listingToContentItem)
}

export async function fetchAllListings(): Promise<ListingRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('listing')
    .select('*')
    .order('room_slug')
    .order('sort_order')

  if (error) throw error
  return data as ListingRow[]
}
