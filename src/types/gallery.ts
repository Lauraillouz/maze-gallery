export enum ContentType {
  Artwork = 'artwork',
  Book = 'book',
  Article = 'article',
}

export enum Direction {
  North = 'north',
  South = 'south',
  East = 'east',
  West = 'west',
}

export enum RoomType {
  Entrance = 'entrance',
  Garden = 'garden',
  Library = 'library',
  Studio = 'studio',
  Archive = 'archive',
  Salon = 'salon',
}

export interface ContentItem {
  id: string
  type: ContentType
  title: string
  wall: Direction
  artist: string
  medium?: string
  description?: string
  price?: number        // USD
  editionSize?: number  // limited edition total
  editionNumber?: number
  forSale: boolean
  imageUrl?: string
}

export interface Connection {
  direction: Direction
  to: RoomType
}

export interface Room {
  type: RoomType
  name: string
  x: number // map grid position
  y: number
  connections: Connection[]
  content: ContentItem[]
}
