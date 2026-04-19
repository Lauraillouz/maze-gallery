'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { RoomType } from '@/types/gallery'
import { ROOMS } from '@/data/rooms'

// Keep latest prop values in refs so callbacks (GSAP onUpdate) always read
// current data without needing to recreate closures.

const ALL_ROOMS = Object.values(ROOMS)

// Map grid constants (mini mode)
const CELL = 52   // px per grid unit
const ROOM_PX = 30 // room square size
const PAD = 22    // canvas padding

const MIN_X = Math.min(...ALL_ROOMS.map((r) => r.x))
const MAX_X = Math.max(...ALL_ROOMS.map((r) => r.x))
const MIN_Y = Math.min(...ALL_ROOMS.map((r) => r.y))
const MAX_Y = Math.max(...ALL_ROOMS.map((r) => r.y))

const MINI_W = (MAX_X - MIN_X) * CELL + ROOM_PX + PAD * 2
const MINI_H = (MAX_Y - MIN_Y) * CELL + ROOM_PX + PAD * 2

const ROOM_COLOR: Record<RoomType, string> = {
  [RoomType.Entrance]: '#FF2D9B',
  [RoomType.Garden]:   '#82E000',
  [RoomType.Library]:  '#A000FF',
  [RoomType.Studio]:   '#FF6400',
  [RoomType.Archive]:  '#00D4C8',
  [RoomType.Salon]:    '#F5E000',
}

function drawMap(
  canvas: HTMLCanvasElement,
  w: number,
  h: number,
  visited: Set<RoomType>,
  current: RoomType,
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = w
  canvas.height = h
  ctx.clearRect(0, 0, w, h)

  // Scale everything proportionally
  const scale = Math.min(w / MINI_W, h / MINI_H)
  const cellPx = CELL * scale
  const roomPx = ROOM_PX * scale
  const showLabels = scale > 1.5

  // Center the grid in the canvas
  const offsetX = (w - (MAX_X - MIN_X) * cellPx - roomPx) / 2
  const offsetY = (h - (MAX_Y - MIN_Y) * cellPx - roomPx) / 2

  const center = (r: (typeof ALL_ROOMS)[0]): [number, number] => [
    offsetX + (r.x - MIN_X) * cellPx + roomPx / 2,
    offsetY + (r.y - MIN_Y) * cellPx + roomPx / 2,
  ]

  // Background
  ctx.fillStyle = '#08000F'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,45,155,0.2)'
  ctx.lineWidth = 1
  ctx.strokeRect(0, 0, w, h)

  // Connection lines between visited rooms
  ctx.strokeStyle = 'rgba(255,45,155,0.35)'
  for (const room of ALL_ROOMS) {
    if (!visited.has(room.type)) continue
    const [rx, ry] = center(room)
    for (const conn of room.connections) {
      if (!visited.has(conn.to)) continue
      const [tx, ty] = center(ROOMS[conn.to])
      ctx.lineWidth = 1.5 * scale
      ctx.beginPath()
      ctx.moveTo(rx, ry)
      ctx.lineTo(tx, ty)
      ctx.stroke()
    }
  }

  // Rooms
  for (const room of ALL_ROOMS) {
    const [cx, cy] = center(room)
    const half = roomPx / 2

    if (!visited.has(room.type)) {
      // Ghost outline for unvisited rooms adjacent to visited ones
      const isAdjacent =
        ALL_ROOMS.some((r) => visited.has(r.type) && r.connections.some((c) => c.to === room.type)) ||
        room.connections.some((c) => visited.has(c.to))
      if (!isAdjacent) continue
      ctx.strokeStyle = 'rgba(255,255,255,0.14)'
      ctx.lineWidth = 1
      ctx.strokeRect(cx - half, cy - half, roomPx, roomPx)
      continue
    }

    const isCurrent = room.type === current
    const color = ROOM_COLOR[room.type]

    ctx.fillStyle = color
    ctx.globalAlpha = isCurrent ? 1 : 0.55
    ctx.fillRect(cx - half, cy - half, roomPx, roomPx)
    ctx.globalAlpha = 1

    if (isCurrent) {
      ctx.strokeStyle = '#FFFBE0'
      ctx.lineWidth = 2 * scale
      ctx.strokeRect(cx - half - 3 * scale, cy - half - 3 * scale, roomPx + 6 * scale, roomPx + 6 * scale)
    }

    if (showLabels) {
      ctx.fillStyle = '#FFFBE0'
      ctx.globalAlpha = 0.65
      ctx.font = `bold ${Math.round(9 * scale)}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(room.name, cx, cy + half + 4 * scale)
      ctx.globalAlpha = 1
    }
  }
}

interface Props {
  visited: Set<RoomType>
  current: RoomType
}

export default function MapCanvas({ visited, current }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [expanded, setExpanded] = useState(false)
  const expandedRef = useRef(false)
  const animatingRef = useRef(false)
  const visitedRef = useRef(visited)
  const currentRef = useRef(current)
  // Responsive mini size — shrinks on narrow viewports so it doesn't crowd the screen
  const miniDimsRef = useRef({ w: MINI_W, h: MINI_H })

  // Keep refs in sync with props each render
  visitedRef.current = visited
  currentRef.current = current

  // Draw at current size — always reads latest visited/current from refs
  function redraw(isExpanded = expandedRef.current) {
    const canvas = canvasRef.current
    if (!canvas) return
    const w = isExpanded ? window.innerWidth : miniDimsRef.current.w
    const h = isExpanded ? window.innerHeight : miniDimsRef.current.h
    drawMap(canvas, w, h, visitedRef.current, currentRef.current)
  }

  // Mount: compute responsive size, initial draw + fade in
  useEffect(() => {
    function updateMiniSize() {
      const vw = window.innerWidth
      // On narrow screens cap mini map to ~30% of viewport width
      const scale = vw < 640 ? Math.min(1, (vw * 0.30) / MINI_W) : 1
      miniDimsRef.current = {
        w: Math.floor(MINI_W * scale),
        h: Math.floor(MINI_H * scale),
      }
      if (!expandedRef.current && containerRef.current) {
        gsap.set(containerRef.current, {
          width: miniDimsRef.current.w,
          height: miniDimsRef.current.h,
        })
        redraw(false)
      }
    }
    updateMiniSize()
    window.addEventListener('resize', updateMiniSize)

    redraw(false)
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, x: -12 },
      { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' },
    )

    return () => window.removeEventListener('resize', updateMiniSize)
  // redraw is stable — it reads from refs, not closed-over props
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Redraw when data changes
  useEffect(() => {
    redraw()
  // redraw reads from refs; only need expanded here to re-draw at the
  // correct size when the expanded state settles after animation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visited, current, expanded])

  function toggleExpand() {
    if (animatingRef.current) return
    const container = containerRef.current
    if (!container) return
    animatingRef.current = true

    const next = !expandedRef.current
    expandedRef.current = next

    if (next) {
      gsap.to(container, {
        width: window.innerWidth,
        height: window.innerHeight,
        bottom: 0,
        left: 0,
        duration: 0.35,
        ease: 'power2.inOut',
        onUpdate: () => redraw(true),
        onComplete: () => {
          setExpanded(true)
          animatingRef.current = false
        },
      })
    } else {
      gsap.to(container, {
        width: miniDimsRef.current.w,
        height: miniDimsRef.current.h,
        bottom: 16,
        left: 16,
        duration: 0.3,
        ease: 'power2.inOut',
        onUpdate: () => redraw(false),
        onComplete: () => {
          setExpanded(false)
          animatingRef.current = false
        },
      })
    }
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 cursor-pointer overflow-hidden border border-[#FF2D9B]/25 bg-[#08000F] touch-manipulation"
      style={{ bottom: 16, left: 16, width: MINI_W, height: MINI_H }}
      onClick={toggleExpand}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />

      {expanded && (
        <>
          <p className="pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 font-grotesk text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFFBE0]/30">
            Map
          </p>
          <button
            className="absolute right-5 top-5 font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FF2D9B]/60 hover:text-[#FF2D9B]"
            onClick={(e) => {
              e.stopPropagation()
              toggleExpand()
            }}
          >
            Close
          </button>
        </>
      )}
    </div>
  )
}
