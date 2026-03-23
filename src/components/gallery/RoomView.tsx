import { Direction, Room, RoomType } from '@/types/gallery'
import { ROOMS } from '@/data/rooms'
import RoomCanvas from './RoomCanvas'
import ContentPlaceholder from './ContentPlaceholder'

// Screen position and arch dimensions per doorway direction
const DOOR_CONFIG: Record<
  Direction,
  { wrapperClass: string; archW: number; archH: number }
> = {
  [Direction.North]: {
    wrapperClass: 'absolute top-[17%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1',
    archW: 110,
    archH: 148,
  },
  [Direction.South]: {
    wrapperClass: 'absolute bottom-[4%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1',
    archW: 90,
    archH: 120,
  },
  [Direction.East]: {
    wrapperClass: 'absolute top-1/2 right-[7%] -translate-y-1/2 flex flex-col items-center gap-1',
    archW: 76,
    archH: 122,
  },
  [Direction.West]: {
    wrapperClass: 'absolute top-1/2 left-[7%] -translate-y-1/2 flex flex-col items-center gap-1',
    archW: 76,
    archH: 122,
  },
}

// Accent color per room type — used for doorway tint
const ROOM_ACCENT: Record<RoomType, string> = {
  [RoomType.Entrance]: '#FF2D9B',
  [RoomType.Garden]:   '#82E000',
  [RoomType.Library]:  '#A000FF',
  [RoomType.Studio]:   '#FF6400',
  [RoomType.Archive]:  '#00D4C8',
  [RoomType.Salon]:    '#F5E000',
}

interface Props {
  room: Room
  onNavigate: (to: RoomType) => void
}

export default function RoomView({ room, onNavigate }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <RoomCanvas roomType={room.type} />

      {/* Room name */}
      <p className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 font-grotesk text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFFBE0]/50">
        {room.name}
      </p>

      {/* Doorways */}
      {room.connections.map(({ direction, to }) => {
        const accent = ROOM_ACCENT[to]
        const { wrapperClass, archW, archH } = DOOR_CONFIG[direction]
        const borderRadius = `${archW / 2}px ${archW / 2}px 0 0`

        return (
          <button
            key={direction}
            onClick={() => onNavigate(to)}
            className={`${wrapperClass} group z-20`}
          >
            <div
              className="transition-transform duration-200 group-hover:scale-105"
              style={{
                width: archW,
                height: archH,
                borderRadius,
                border: `2px solid ${accent}`,
                background: `linear-gradient(to bottom, ${accent}28, ${accent}0a)`,
                boxShadow: `0 0 22px ${accent}44, inset 0 0 18px ${accent}14`,
              }}
            />
            <span
              className="font-grotesk text-[9px] font-bold uppercase tracking-widest opacity-50 transition-opacity group-hover:opacity-90"
              style={{ color: accent }}
            >
              {ROOMS[to].name}
            </span>
          </button>
        )
      })}

      {/* Content placeholders */}
      <div className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-wrap justify-center gap-4">
        {room.content.map((item) => (
          <ContentPlaceholder key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
