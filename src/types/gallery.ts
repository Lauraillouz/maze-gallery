export enum ContentType {
  Artwork = 'artwork',
  Book = 'book',
  Article = 'article',
  Music = 'music',
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
  price?: number
  editionSize?: number
  editionNumber?: number
  size?: string
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
  x: number
  y: number
  connections: Connection[]
  content: ContentItem[]
}
