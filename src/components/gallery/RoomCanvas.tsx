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

export default function RoomCanvas({ roomType }: { roomType: RoomType }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const canvas: HTMLCanvasElement = el

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

    function draw() {
      tick++
      const { width, height } = canvas
      const vpx = width / 2
      const vpy = height * 0.42
      const bw = width * 0.32
      const bh = height * 0.5
      const bx0 = vpx - bw / 2
      const bx1 = vpx + bw / 2
      const by0 = vpy - bh / 2
      const by1 = vpy + bh / 2

      ctx.fillStyle = '#08000F'
      ctx.fillRect(0, 0, width, height)

      // Room surfaces
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

      // Ambient glow behind back wall
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
        [[0, 0],           [bx0, by0]],
        [[width, 0],       [bx1, by0]],
        [[0, height],      [bx0, by1]],
        [[width, height],  [bx1, by1]],
      ] as [[number, number], [number, number]][]) {
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bxx, by)
        ctx.stroke()
      }
      ctx.strokeRect(bx0, by0, bw, bh)

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
