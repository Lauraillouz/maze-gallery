export enum ContentType {
  Artwork = "artwork",
  Book = "book",
  Article = "article",
}

export enum Direction {
  North = "north",
  South = "south",
  East = "east",
  West = "west",
}

export enum Side {
  Back = "back",
  Right = "right",
  Behind = "behind",
  Left = "left",
}

export enum RoomType {
  Entrance = "entrance",
  Garden = "garden",
  Library = "library",
  Studio = "studio",
  Archive = "archive",
  Salon = "salon",
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  wall: Direction;
}

export interface Connection {
  direction: Direction;
  to: RoomType;
}

export interface Room {
  type: RoomType;
  name: string;
  x: number; // map grid position
  y: number;
  connections: Connection[];
  content: ContentItem[];
}
