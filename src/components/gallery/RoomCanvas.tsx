'use client'

import { useEffect, useRef } from 'react'
import { RoomType } from '@/types/gallery'

// Primary and secondary color (RGB string) per room type
const ROOM_COLORS: Record<RoomType, [string, string]> = {
  [RoomType.Entrance]: ['255, 45, 155', '245, 224, 0'],
  [RoomType.Garden]:   ['130, 224, 0',  '0, 212, 200'],
  [RoomType.Library]:  ['160, 0, 255',  '255, 45, 155'],
  [RoomType.Studio]:   ['255, 100, 0',  '245, 224, 0'],
  [RoomType.Archive]:  ['0, 212, 200',  '160, 0, 255'],
  [RoomType.Salon]:    ['245, 224, 0',  '255, 45, 155'],
}

// Bilinear interpolation across a quad (TL, TR, BR, BL)
function qPt(
  q: [[number, number], [number, number], [number, number], [number, number]],
  s: number,
  t: number,
): [number, number] {
  const tx = q[0][0] + (q[1][0] - q[0][0]) * s
  const ty = q[0][1] + (q[1][1] - q[0][1]) * s
  const bx = q[3][0] + (q[2][0] - q[3][0]) * s
  const by = q[3][1] + (q[2][1] - q[3][1]) * s
  return [tx + (bx - tx) * t, ty + (by - ty) * t]
}

// tRange: [doorTop, doorBottom] in quad t-space (0=wall top, 1=wall bottom)
const DOOR_T: [number, number] = [0.48, 0.95]

function drawDoorOnWall(
  ctx: CanvasRenderingContext2D,
  wall: [[number, number], [number, number], [number, number], [number, number]],
  sRange: [number, number],
  color: string,
) {
  const [s0, s1] = sRange
  const sm = (s0 + s1) / 2
  const [t0, t1] = DOOR_T

  const tl = qPt(wall, s0, t0)
  const tr = qPt(wall, s1, t0)
  const br = qPt(wall, s1, t1)
  const bl = qPt(wall, s0, t1)
  const am = qPt(wall, sm, t0 - 0.07) // arch midpoint above the door

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.shadowColor = color
  ctx.shadowBlur = 14

  ctx.beginPath()
  ctx.moveTo(bl[0], bl[1])
  ctx.lineTo(tl[0], tl[1])
  ctx.quadraticCurveTo(am[0], am[1], tr[0], tr[1])
  ctx.lineTo(br[0], br[1])
  ctx.stroke()

  ctx.globalAlpha = 0.08
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(bl[0], bl[1])
  ctx.lineTo(tl[0], tl[1])
  ctx.quadraticCurveTo(am[0], am[1], tr[0], tr[1])
  ctx.lineTo(br[0], br[1])
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

interface Particle {
  x: number; y: number
  vx: number; vy: number
  life: number      // frames remaining
  maxLife: number
  size: number
  phase: number     // for per-particle wobble offset
}

function spawnParticle(roomType: RoomType, w: number, h: number, randomLife = false): Particle {
  const rand = Math.random
  let x = 0, y = 0, vx = 0, vy = 0, maxLife = 200, size = 2
  const phase = rand() * Math.PI * 2

  switch (roomType) {
    case RoomType.Garden:
      x = rand() * w
      y = h * 0.5 + rand() * h * 0.5
      vx = (rand() - 0.5) * 0.3
      vy = -(0.3 + rand() * 0.5)
      size = 1.5 + rand() * 2
      maxLife = 200 + Math.floor(rand() * 150)
      break

    case RoomType.Library:
      x = rand() * w
      y = rand() * h
      vx = (rand() - 0.5) * 0.3
      vy = (rand() - 0.5) * 0.3
      size = 1 + rand() * 1
      maxLife = 350 + Math.floor(rand() * 200)
      break

    case RoomType.Studio:
      x = w * 0.3 + rand() * w * 0.4
      y = h * 0.3 + rand() * h * 0.4
      vx = (rand() - 0.5) * 2.4
      vy = (rand() - 0.5) * 2.4
      size = 2 + rand() * 2
      maxLife = 60 + Math.floor(rand() * 60)
      break

    case RoomType.Archive: {
      const fromLeft = rand() < 0.5
      x = fromLeft ? -5 : w + 5
      y = rand() * h
      vx = fromLeft ? (0.8 + rand() * 1.2) : -(0.8 + rand() * 1.2)
      vy = (rand() - 0.5) * 0.2
      size = 0.5 + rand() * 1
      maxLife = 150 + Math.floor(rand() * 100)
      break
    }

    case RoomType.Salon:
      x = rand() * w
      y = -10
      vx = (rand() - 0.5) * 0.4
      vy = 0.3 + rand() * 0.4
      size = 1.5 + rand() * 1.5
      maxLife = 300 + Math.floor(rand() * 200)
      break

    case RoomType.Entrance: {
      const edge = Math.floor(rand() * 4)
      if (edge === 0) { x = rand() * w; y = 0 }
      else if (edge === 1) { x = rand() * w; y = h }
      else if (edge === 2) { x = 0; y = rand() * h }
      else { x = w; y = rand() * h }
      const cx = w / 2, cy = h * 0.42
      const dx = cx - x, dy = cy - y
      const dist = Math.hypot(dx, dy) || 1
      const speed = 0.4 + rand() * 0.6
      vx = (dx / dist) * speed
      vy = (dy / dist) * speed
      size = 1.5 + rand() * 1
      maxLife = 200 + Math.floor(rand() * 150)
      break
    }

    default:
      throw new Error(`Unhandled RoomType in spawnParticle: ${roomType}`)
  }

  const life = randomLife ? Math.floor(rand() * maxLife) : maxLife
  return { x, y, vx, vy, life, maxLife, size, phase }
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  roomType: RoomType,
  c1: string,
  c2: string,
  tick: number,
  width: number,
  height: number,
) {
  const prevComposite = ctx.globalCompositeOperation
  ctx.globalCompositeOperation = 'screen'

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]

    // Update position
    p.x += p.vx
    p.y += p.vy
    p.life--

    // Garden wobble
    if (roomType === RoomType.Garden) {
      p.vx += Math.sin(tick * 0.02 + p.phase) * 0.012
    }

    // Respawn if dead or out of bounds
    const margin = 60
    if (p.life <= 0 || p.x < -margin || p.x > width + margin || p.y < -margin || p.y > height + margin) {
      const fresh = spawnParticle(roomType, width, height)
      particles[i] = fresh
      continue
    }

    // Alpha: fade in first 15%, fade out last 15%
    const progress = p.life / p.maxLife // 1 at birth, 0 at death
    const age = 1 - progress            // 0 at birth, 1 at death
    let alpha = 0.55
    if (age < 0.15) {
      alpha = 0.55 * (age / 0.15)
    } else if (progress < 0.15) {
      alpha = 0.55 * (progress / 0.15)
    }

    ctx.save()
    ctx.globalAlpha = alpha

    if (roomType === RoomType.Archive) {
      ctx.strokeStyle = `rgb(${c1})`
      ctx.lineWidth = p.size
      ctx.beginPath()
      ctx.moveTo(p.x - p.vx * 10, p.y)
      ctx.lineTo(p.x + p.vx * 3, p.y)
      ctx.stroke()
    } else if (roomType === RoomType.Salon) {
      ctx.translate(p.x, p.y)
      ctx.rotate(tick * 0.025 + p.phase)
      ctx.fillStyle = `rgb(${c1})`
      ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2)
    } else if (roomType === RoomType.Studio) {
      const color = p.phase > Math.PI ? c1 : c2
      ctx.fillStyle = `rgb(${color})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    } else {
      ctx.fillStyle = `rgb(${c1})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.restore()
  }

  ctx.globalCompositeOperation = prevComposite
}

interface Props {
  roomType: RoomType
  backDoor?: string  // hex color, undefined = no door
  leftDoor?: string
  rightDoor?: string
  vpOffsetX?: number
  vpOffsetY?: number
}

export default function RoomCanvas({ roomType, backDoor, leftDoor, rightDoor, vpOffsetX = 0, vpOffsetY = 0 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  // Keep door colors current without restarting the RAF loop
  const doorsRef = useRef({ backDoor, leftDoor, rightDoor })

  const vpOffsetRef = useRef({ x: 0, y: 0 })
  const vpLerpRef   = useRef({ x: 0, y: 0 })

  useEffect(() => {
    doorsRef.current = { backDoor, leftDoor, rightDoor }
  }, [backDoor, leftDoor, rightDoor])

  useEffect(() => {
    vpOffsetRef.current = { x: vpOffsetX, y: vpOffsetY }
  }, [vpOffsetX, vpOffsetY])

  useEffect(() => {
    // Capture canvas and ctx as typed consts after null-checks so the draw()
    // closure doesn't lose narrowing (canvasRef.current is mutable, so
    // TypeScript can't narrow it through an inner function boundary).
    if (!canvasRef.current) return
    const canvas: HTMLCanvasElement = canvasRef.current

    const maybeCtx = canvas.getContext('2d')
    if (!maybeCtx) return
    const ctx: CanvasRenderingContext2D = maybeCtx

    const onResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    onResize()
    window.addEventListener('resize', onResize)

    const [c1, c2] = ROOM_COLORS[roomType]
    let tick = 0

    const PARTICLE_COUNT = 28
    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, () =>
      spawnParticle(roomType, canvas.width, canvas.height, true)
    )

    function draw() {
      tick++
      const { width, height } = canvas

      vpLerpRef.current.x += (vpOffsetRef.current.x - vpLerpRef.current.x) * 0.06
      vpLerpRef.current.y += (vpOffsetRef.current.y - vpLerpRef.current.y) * 0.06
      const vpx = width / 2 + vpLerpRef.current.x
      const vpy = height * 0.42 + vpLerpRef.current.y

      const bw = width * 0.32
      const bh = height * 0.5
      const bx0 = vpx - bw / 2
      const bx1 = vpx + bw / 2
      const by0 = vpy - bh / 2
      const by1 = vpy + bh / 2

      ctx.fillStyle = '#08000F'
      ctx.fillRect(0, 0, width, height)

      // Room surface fills
      const poly = (pts: [number, number][], color: string, alpha: number) => {
        ctx.globalAlpha = alpha
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(pts[0][0], pts[0][1])
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
        ctx.closePath()
        ctx.fill()
        ctx.globalAlpha = 1
      }

      poly([[bx0, by1], [bx1, by1], [width, height], [0, height]], `rgb(${c1})`, 0.13)
      poly([[bx0, by0], [bx1, by0], [width, 0],      [0, 0]],      `rgb(${c2})`, 0.10)
      poly([[bx0, by0], [0, 0],     [0, height],     [bx0, by1]],  `rgb(${c1})`, 0.09)
      poly([[bx1, by0], [width, 0], [width, height],  [bx1, by1]], `rgb(${c2})`, 0.09)

      // Ambient glow
      const pulse = 0.12 + Math.sin(tick * 0.018) * 0.04
      const glow = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, Math.max(bw, bh) * 1.2)
      glow.addColorStop(0,   `rgba(${c1}, ${pulse + 0.15})`)
      glow.addColorStop(0.4, `rgba(${c1}, ${pulse * 0.4})`)
      glow.addColorStop(1,   'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, width, height)

      // Back wall
      ctx.fillStyle = '#0D0010'
      ctx.fillRect(bx0, by0, bw, bh)
      ctx.globalAlpha = 0.09 + Math.sin(tick * 0.018) * 0.03
      ctx.fillStyle = `rgb(${c1})`
      ctx.fillRect(bx0, by0, bw, bh)
      ctx.globalAlpha = 1

      // Perspective edge lines
      ctx.strokeStyle = '#0D0010'
      ctx.lineWidth = 2
      for (const [[ax, ay], [bxx, by]] of [
        [[0, 0],          [bx0, by0]],
        [[width, 0],      [bx1, by0]],
        [[0, height],     [bx0, by1]],
        [[width, height], [bx1, by1]],
      ] as [[number, number], [number, number]][]) {
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bxx, by)
        ctx.stroke()
      }
      ctx.strokeRect(bx0, by0, bw, bh)

      // ── Doors — all drawn with the same function at sRange [0.30, 0.70] ──────
      const { backDoor, leftDoor, rightDoor } = doorsRef.current

      // Door S-range adapts to maintain a consistent width/height ratio.
      // On narrow screens bw shrinks but bh stays large, making doors elongated
      // with a fixed S. We solve for ds so that (bw*ds)/(bh*dt) ≈ desktop ratio.
      const doorDt = DOOR_T[1] - DOOR_T[0]
      const doorDs = Math.min(0.75, Math.max(0.20, 0.44 * bh * doorDt / bw))
      const S: [number, number] = [0.5 - doorDs / 2, 0.5 + doorDs / 2]

      if (backDoor) {
        const backWall: [[number,number],[number,number],[number,number],[number,number]] = [
          [bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1],
        ]
        drawDoorOnWall(ctx, backWall, S, backDoor)
      }

      if (leftDoor) {
        const leftWall: [[number,number],[number,number],[number,number],[number,number]] = [
          [0, 0], [bx0, by0], [bx0, by1], [0, height],
        ]
        drawDoorOnWall(ctx, leftWall, S, leftDoor)
      }

      if (rightDoor) {
        const rightWall: [[number,number],[number,number],[number,number],[number,number]] = [
          [bx1, by0], [width, 0], [width, height], [bx1, by1],
        ]
        drawDoorOnWall(ctx, rightWall, S, rightDoor)
      }

      drawParticles(ctx, particles, roomType, c1, c2, tick, width, height)

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
    }
  }, [roomType])

  return <canvas ref={canvasRef} className="absolute inset-0" />
}
