import { ContentType, Direction, Room, RoomType } from '@/types/gallery'

// Room layout (x: column 1–3, y: row 1–3, y increases downward):
//
//  Studio(1,1) — Salon(2,1) — Archive(3,1)
//  Garden(1,2)               Library(3,2)
//              Entrance(2,3)
//
// All connections are bidirectional.

export const ROOMS: Record<RoomType, Room> = {
  [RoomType.Entrance]: {
    type: RoomType.Entrance,
    name: 'Entrance Hall',
    x: 2,
    y: 3,
    connections: [
      { direction: Direction.North, to: RoomType.Garden },
      { direction: Direction.East, to: RoomType.Library },
    ],
    content: [
      { id: 'en-1', type: ContentType.Artwork, title: 'Welcome Piece' },
      { id: 'en-2', type: ContentType.Article, title: 'Introduction' },
    ],
  },

  [RoomType.Garden]: {
    type: RoomType.Garden,
    name: 'The Garden',
    x: 1,
    y: 2,
    connections: [
      { direction: Direction.South, to: RoomType.Entrance },
      { direction: Direction.North, to: RoomType.Studio },
      { direction: Direction.East, to: RoomType.Salon },
    ],
    content: [
      { id: 'ga-1', type: ContentType.Artwork, title: 'Garden I' },
      { id: 'ga-2', type: ContentType.Artwork, title: 'Garden II' },
      { id: 'ga-3', type: ContentType.Book, title: 'Garden Journal' },
    ],
  },

  [RoomType.Library]: {
    type: RoomType.Library,
    name: 'The Library',
    x: 3,
    y: 2,
    connections: [
      { direction: Direction.West, to: RoomType.Entrance },
      { direction: Direction.North, to: RoomType.Archive },
    ],
    content: [
      { id: 'li-1', type: ContentType.Book, title: 'Collected Works' },
      { id: 'li-2', type: ContentType.Book, title: 'References' },
      { id: 'li-3', type: ContentType.Article, title: 'Reading List' },
    ],
  },

  [RoomType.Studio]: {
    type: RoomType.Studio,
    name: 'The Studio',
    x: 1,
    y: 1,
    connections: [{ direction: Direction.South, to: RoomType.Garden }],
    content: [
      { id: 'st-1', type: ContentType.Artwork, title: 'Work in Progress' },
      { id: 'st-2', type: ContentType.Artwork, title: 'Sketch Series' },
      { id: 'st-3', type: ContentType.Artwork, title: 'Study' },
      { id: 'st-4', type: ContentType.Article, title: 'Process Notes' },
    ],
  },

  [RoomType.Archive]: {
    type: RoomType.Archive,
    name: 'The Archive',
    x: 3,
    y: 1,
    connections: [
      { direction: Direction.South, to: RoomType.Library },
      { direction: Direction.West, to: RoomType.Salon },
    ],
    content: [
      { id: 'ar-1', type: ContentType.Artwork, title: 'Early Work' },
      { id: 'ar-2', type: ContentType.Book, title: 'Archive Vol. I' },
      { id: 'ar-3', type: ContentType.Article, title: 'Historical Notes' },
    ],
  },

  [RoomType.Salon]: {
    type: RoomType.Salon,
    name: 'The Salon',
    x: 2,
    y: 1,
    connections: [
      { direction: Direction.West, to: RoomType.Garden },
      { direction: Direction.East, to: RoomType.Archive },
    ],
    content: [
      { id: 'sa-1', type: ContentType.Artwork, title: 'Guest Work I' },
      { id: 'sa-2', type: ContentType.Artwork, title: 'Guest Work II' },
      { id: 'sa-3', type: ContentType.Article, title: 'Guest Notes' },
    ],
  },
}
