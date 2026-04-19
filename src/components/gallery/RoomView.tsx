"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ContentItem, Direction, Room, RoomType, Side } from "@/types/gallery";
import { ROOMS } from "@/data/rooms";
import RoomCanvas from "./RoomCanvas";
import ContentPlaceholder from "./ContentPlaceholder";

const DIRS = [Direction.North, Direction.East, Direction.South, Direction.West];
const SIDES = [Side.Back, Side.Behind, Side.Left, Side.Right] as const;
type QuarterTurn = 0 | 1 | 2 | 3;

function relativeSide(facing: Direction, target: Direction): Side {
  const diff = ((DIRS.indexOf(target) - DIRS.indexOf(facing) + 4) %
    4) as QuarterTurn;
  return SIDES[diff];
}

const ROOM_ACCENT: Record<RoomType, string> = {
  [RoomType.Entrance]: "#FF2D9B",
  [RoomType.Garden]: "#82E000",
  [RoomType.Library]: "#A000FF",
  [RoomType.Studio]: "#FF6400",
  [RoomType.Archive]: "#00D4C8",
  [RoomType.Salon]: "#F5E000",
};

function qPt(
  q: readonly [
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
    readonly [number, number],
  ],
  s: number,
  t: number,
): [number, number] {
  const tx = q[0][0] + (q[1][0] - q[0][0]) * s;
  const ty = q[0][1] + (q[1][1] - q[0][1]) * s;
  const bx = q[3][0] + (q[2][0] - q[3][0]) * s;
  const by = q[3][1] + (q[2][1] - q[3][1]) * s;
  return [tx + (bx - tx) * t, ty + (by - ty) * t];
}

const DOOR_S: [number, number] = [0.4, 0.6];
const DOOR_T: [number, number] = [0.48, 0.95];

function getDoorBox(
  side: Side.Back | Side.Left | Side.Right,
  w: number,
  h: number,
) {
  const vpx = w / 2,
    vpy = h * 0.42;
  const bx0 = vpx - w * 0.16,
    bx1 = vpx + w * 0.16;
  const by0 = vpy - h * 0.25,
    by1 = vpy + h * 0.25;
  const q: Parameters<typeof qPt>[0] =
    side === Side.Back
      ? [
          [bx0, by0],
          [bx1, by0],
          [bx1, by1],
          [bx0, by1],
        ]
      : side === Side.Left
        ? [
            [0, 0],
            [bx0, by0],
            [bx0, by1],
            [0, h],
          ]
        : [
            [bx1, by0],
            [w, 0],
            [w, h],
            [bx1, by1],
          ];
  const [s0, s1] = DOOR_S,
    [t0, t1] = DOOR_T;
  const tl = qPt(q, s0, t0),
    br = qPt(q, s1, t1);
  return { x: tl[0], y: tl[1], w: br[0] - tl[0], h: br[1] - tl[1] };
}

function idHash(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
  return h;
}

function initialPos(
  item: ContentItem,
  idx: number,
  total: number,
  sw: number,
  sh: number,
): { x: number; y: number } {
  const spread = total > 1 ? (idx / (total - 1) - 0.5) * 220 : 0;
  switch (item.wall) {
    case Direction.North:
      return { x: sw * 0.5 + spread, y: sh * 0.26 };
    case Direction.South:
      return { x: sw * 0.5 + spread, y: sh * 0.56 };
    case Direction.East:
      return { x: sw * 0.76, y: sh * 0.32 + spread * 0.4 };
    case Direction.West:
      return { x: sw * 0.24, y: sh * 0.32 + spread * 0.4 };
    default:
      return { x: sw * 0.5, y: sh * 0.4 };
  }
}

interface DragState {
  id: string;
  startClientX: number;
  startClientY: number;
  startItemX: number;
  startItemY: number;
  moved: boolean;
}

type WallSurface = "back" | "floor" | "ceiling" | "left" | "right";
const ALL_SURFACES: WallSurface[] = ["back", "floor", "ceiling", "left", "right"];

interface RippleWave {
  surface: WallSurface;
  ox: number;
  oy: number;
  startTime: number;
  baseAlpha: number;
}

// Room surface geometry derived from screen size
function roomGeo(sw: number, sh: number) {
  const vpx = sw / 2,
    vpy = sh * 0.42;
  const bx0 = vpx - sw * 0.16,
    bx1 = vpx + sw * 0.16;
  const by0 = vpy - sh * 0.25,
    by1 = vpy + sh * 0.25;
  return {
    vpx,
    vpy,
    bx0,
    bx1,
    by0,
    by1,
    sw,
    sh,
    polys: {
      back: [
        [bx0, by0],
        [bx1, by0],
        [bx1, by1],
        [bx0, by1],
      ],
      floor: [
        [bx0, by1],
        [bx1, by1],
        [sw, sh],
        [0, sh],
      ],
      ceiling: [
        [0, 0],
        [sw, 0],
        [bx1, by0],
        [bx0, by0],
      ],
      left: [
        [0, 0],
        [bx0, by0],
        [bx0, by1],
        [0, sh],
      ],
      right: [
        [bx1, by0],
        [sw, 0],
        [sw, sh],
        [bx1, by1],
      ],
    } as Record<WallSurface, [number, number][]>,
  };
}

type RoomGeo = ReturnType<typeof roomGeo>;

function pointInPoly(
  px: number,
  py: number,
  poly: [number, number][],
): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

function whichSurface(px: number, py: number, geo: RoomGeo): WallSurface {
  for (const s of ALL_SURFACES)
    if (pointInPoly(px, py, geo.polys[s])) return s;
  return "floor";
}

function closestOnSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): [number, number] {
  const dx = bx - ax,
    dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return [ax, ay];
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return [ax + t * dx, ay + t * dy];
}

// Shared boundary segment between two adjacent surfaces, null if non-adjacent.
function surfaceBoundary(
  a: WallSurface,
  b: WallSurface,
  geo: RoomGeo,
): [number, number, number, number] | null {
  const { bx0, bx1, by0, by1, sw, sh } = geo;
  const key = [a, b].sort().join("-");
  switch (key) {
    case "back-floor":
      return [bx0, by1, bx1, by1];
    case "back-ceiling":
      return [bx0, by0, bx1, by0];
    case "back-left":
      return [bx0, by0, bx0, by1];
    case "back-right":
      return [bx1, by0, bx1, by1];
    case "floor-left":
      return [bx0, by1, 0, sh];
    case "floor-right":
      return [bx1, by1, sw, sh];
    case "ceiling-left":
      return [0, 0, bx0, by0];
    case "ceiling-right":
      return [bx1, by0, sw, 0];
    default:
      return null; // floor↔ceiling and left↔right are non-adjacent
  }
}

// Returns [xScale, yScale] for perspective-correct ellipse on each surface.
// Near the VP (depth → ∞) the surface compresses toward zero; near the viewer it's 1.
function surfaceScale(
  surface: WallSurface,
  ox: number,
  oy: number,
  geo: RoomGeo,
): [number, number] {
  const { vpx, bx0, bx1, by0, by1, sw, sh } = geo;
  const bw = bx1 - bx0;
  switch (surface) {
    case "floor": {
      // Floor trapezoid widens from bw (at by1) to sw (at sh).
      // A circle near the back wall is nearly round; near the viewer it's very flat.
      const widthAtY = bw + ((oy - by1) * (sw - bw)) / (sh - by1);
      return [1, (sh - by1) / widthAtY];
    }
    case "ceiling": {
      // Ceiling trapezoid widens from bw (at by0) to sw (at y=0).
      const widthAtY = bw + ((by0 - oy) * (sw - bw)) / by0;
      return [1, by0 / widthAtY];
    }
    case "left":
      return [Math.max(0.06, (vpx - ox) / vpx), 1];
    case "right":
      return [Math.max(0.06, (ox - vpx) / (sw - vpx)), 1];
    case "back":
      return [1, 1];
  }
}

const RIPPLE_SPEED = 0.85;
const RIPPLE_LIFETIME = 2200;

// VP shift when hovering side doors; back uses GSAP zoom instead
const VP_PULL: Record<"left" | "right", number> = { left: 250, right: -250 };

interface Props {
  room: Room;
  onNavigate: (to: RoomType) => void;
}

export default function RoomView({ room, onNavigate }: Props) {
  const [facing, setFacing] = useState<Direction>(Direction.North);
  const [sw, setSw] = useState(0);
  const [sh, setSh] = useState(0);
  const [zoomedItem, setZoomedItem] = useState<ContentItem | null>(null);
  const [positions, setPositions] = useState<
    Record<string, { x: number; y: number }>
  >({});
  const [hoveredDoor, setHoveredDoor] = useState<
    "back" | "left" | "right" | null
  >(null);

  const roomRef = useRef<HTMLDivElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const turningRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const rippleCanvasRef = useRef<HTMLCanvasElement>(null);
  const rippleSourcesRef = useRef<RippleWave[]>([]);
  const rippleRafRef = useRef<number>(0);
  const rippleColorRef = useRef(ROOM_ACCENT[room.type]);

  useEffect(() => {
    const update = () => {
      setSw(window.innerWidth);
      setSh(window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const canvas = rippleCanvasRef.current;
    if (!canvas || sw === 0) return;
    canvas.width = sw;
    canvas.height = sh;
  }, [sw, sh]);

  useEffect(() => {
    rippleColorRef.current = ROOM_ACCENT[room.type];
    setHoveredDoor(null);
    gsap.killTweensOf(zoomWrapperRef.current);
    gsap.set(zoomWrapperRef.current, { scale: 1 });
  }, [room.type]);

  useEffect(() => {
    return () => cancelAnimationFrame(rippleRafRef.current);
  }, []);

  useEffect(() => {
    if (sw === 0) return;
    const byWall: Partial<Record<Direction, ContentItem[]>> = {};
    for (const item of room.content) (byWall[item.wall] ??= []).push(item);
    const pos: Record<string, { x: number; y: number }> = {};
    for (const items of Object.values(byWall)) {
      items.forEach((item, i) => {
        pos[item.id] = initialPos(item, i, items.length, sw, sh);
      });
    }
    setPositions(pos);
  }, [room.type, room.content, sw, sh]);

  function drawRipples() {
    const canvas = rippleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const now = performance.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rippleSourcesRef.current = rippleSourcesRef.current.filter(
      (s) => now - s.startTime < RIPPLE_LIFETIME,
    );

    const color = rippleColorRef.current;
    const geo = roomGeo(canvas.width, canvas.height);

    for (const wave of rippleSourcesRef.current) {
      if (now < wave.startTime) continue;
      const elapsed = now - wave.startTime;
      const r = elapsed * RIPPLE_SPEED;
      const alpha = wave.baseAlpha * Math.max(0, 1 - elapsed / RIPPLE_LIFETIME);
      if (alpha < 0.005) continue;

      const [xs, ys] = surfaceScale(wave.surface, wave.ox, wave.oy, geo);
      const poly = geo.polys[wave.surface];

      ctx.save();
      // Clip to the surface polygon so the ripple stays on its wall
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.clip();

      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      // Scale around the click origin to produce a perspective-correct ellipse
      ctx.translate(wave.ox, wave.oy);
      ctx.scale(xs, ys);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (rippleSourcesRef.current.length > 0)
      rippleRafRef.current = requestAnimationFrame(drawRipples);
  }

  function addRipple(x: number, y: number) {
    if (sw === 0) return;
    const now = performance.now();
    const geo = roomGeo(sw, sh);
    const surface = whichSurface(x, y, geo);
    const [xs, ys] = surfaceScale(surface, x, y, geo);

    rippleSourcesRef.current.push({
      surface,
      ox: x,
      oy: y,
      startTime: now,
      baseAlpha: 0.75,
    });

    for (const target of ALL_SURFACES) {
      if (target === surface) continue;

      const direct = surfaceBoundary(surface, target, geo);
      if (direct) {
        // Adjacent: wave travels directly through the shared edge.
        const [ex, ey] = closestOnSeg(
          x,
          y,
          direct[0],
          direct[1],
          direct[2],
          direct[3],
        );
        const dx = (ex - x) * xs,
          dy = (ey - y) * ys;
        const delay = Math.sqrt(dx * dx + dy * dy) / RIPPLE_SPEED;
        rippleSourcesRef.current.push({
          surface: target,
          ox: ex,
          oy: ey,
          startTime: now + delay,
          baseAlpha: 0.45,
        });
      } else {
        // Non-adjacent (floor↔ceiling or left↔right): route through the back wall.
        const toBack = surfaceBoundary(surface, "back", geo)!;
        const [bx, by] = closestOnSeg(
          x,
          y,
          toBack[0],
          toBack[1],
          toBack[2],
          toBack[3],
        );
        const dx1 = (bx - x) * xs,
          dy1 = (by - y) * ys;
        const delay1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) / RIPPLE_SPEED;

        const fromBack = surfaceBoundary("back", target, geo)!;
        const [ex, ey] = closestOnSeg(
          bx,
          by,
          fromBack[0],
          fromBack[1],
          fromBack[2],
          fromBack[3],
        );
        const delay2 = Math.hypot(ex - bx, ey - by) / RIPPLE_SPEED;

        rippleSourcesRef.current.push({
          surface: target,
          ox: ex,
          oy: ey,
          startTime: now + delay1 + delay2,
          baseAlpha: 0.35,
        });
      }
    }

    cancelAnimationFrame(rippleRafRef.current);
    rippleRafRef.current = requestAnimationFrame(drawRipples);
  }

  function turn(dir: "left" | "right") {
    if (turningRef.current) return;
    turningRef.current = true;
    setZoomedItem(null);
    setHoveredDoor(null);
    gsap.killTweensOf(zoomWrapperRef.current);
    gsap.set(zoomWrapperRef.current, { scale: 1 });
    const yOut = dir === "right" ? -40 : 40;
    gsap.to(roomRef.current, {
      rotateY: yOut,
      transformPerspective: 900,
      opacity: 0,
      duration: 0.16,
      ease: "power2.in",
      onComplete: () => {
        setFacing(
          (f) =>
            DIRS[
              dir === "right"
                ? (DIRS.indexOf(f) + 1) % 4
                : (DIRS.indexOf(f) + 3) % 4
            ],
        );
        gsap.fromTo(
          roomRef.current,
          { rotateY: -yOut, transformPerspective: 900, opacity: 0 },
          {
            rotateY: 0,
            transformPerspective: 900,
            opacity: 1,
            duration: 0.2,
            ease: "power2.out",
            onComplete: () => {
              turningRef.current = false;
            },
          },
        );
      },
    });
  }

  function onPointerDown(e: React.PointerEvent, item: ContentItem) {
    if (turningRef.current) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const pos = positions[item.id];
    if (!pos) return;
    dragRef.current = {
      id: item.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startItemX: pos.x,
      startItemY: pos.y,
      moved: false,
    };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    const dx = e.clientX - d.startClientX;
    const dy = e.clientY - d.startClientY;
    if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
    if (d.moved)
      setPositions((prev) => ({
        ...prev,
        [d.id]: { x: d.startItemX + dx, y: d.startItemY + dy },
      }));
  }

  function onPointerUp(_e: React.PointerEvent, item: ContentItem) {
    if (!dragRef.current) return;
    const wasClick = !dragRef.current.moved;
    dragRef.current = null;
    if (wasClick) setZoomedItem(item);
  }

  function renderDoorButton(
    side: "back" | "left" | "right",
    conn: (typeof room.connections)[0],
  ) {
    const box = getDoorBox(side as Side.Back | Side.Left | Side.Right, sw, sh);
    const pullX = side in VP_PULL ? VP_PULL[side as "left" | "right"] : 0;
    const expand = Math.abs(pullX) * 0.6;
    const rotation =
      side === "left" ? "-rotate-90" : side === "right" ? "rotate-90" : "";
    return (
      <button
        key={side}
        onClick={() => onNavigate(conn.to)}
        onMouseEnter={() => {
          setHoveredDoor(side);
          if (side === "back")
            gsap.to(zoomWrapperRef.current, {
              scale: 1.4,
              duration: 0.5,
              ease: "power2.out",
            });
        }}
        onMouseLeave={() => {
          setHoveredDoor(null);
          if (side === "back")
            gsap.to(zoomWrapperRef.current, {
              scale: 1,
              duration: 0.3,
              ease: "power2.in",
            });
        }}
        className={`absolute z-20 flex flex-col items-center ${side === "back" ? "justify-end pb-2" : "justify-center"}`}
        style={{
          left: box.x - (pullX < 0 ? expand : 0),
          top: box.y,
          width: box.w + expand,
          height: box.h,
        }}
      >
        <span
          className={`font-grotesk text-[9px] font-bold uppercase tracking-widest transition-opacity duration-200 ${rotation}`}
          style={{
            color: ROOM_ACCENT[conn.to],
            opacity: hoveredDoor === side ? 0.7 : 0,
          }}
        >
          {ROOMS[conn.to].name}
        </span>
      </button>
    );
  }

  const connBySide = new Map<
    "back" | "left" | "right",
    (typeof room.connections)[0]
  >();
  for (const conn of room.connections) {
    const side = relativeSide(facing, conn.direction);
    if (side !== "behind") connBySide.set(side, conn);
  }

  const backConn = connBySide.get("back");
  const leftConn = connBySide.get("left");
  const rightConn = connBySide.get("right");

  const vpOffX =
    hoveredDoor && hoveredDoor in VP_PULL
      ? VP_PULL[hoveredDoor as "left" | "right"]
      : 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <style>{`
        @keyframes ghostDrift {
          0%   { transform: translateY(0px)   translateX(0px);  opacity: 0.80; }
          15%  { transform: translateY(-22px) translateX(5px);  opacity: 1.00; }
          35%  { transform: translateY(-14px) translateX(-6px); opacity: 0.65; }
          55%  { transform: translateY(-28px) translateX(4px);  opacity: 0.90; }
          75%  { transform: translateY(-10px) translateX(-4px); opacity: 0.60; }
          100% { transform: translateY(0px)   translateX(0px);  opacity: 0.80; }
        }
      `}</style>

      <div
        ref={roomRef}
        className="absolute inset-0"
        onClick={(e) => {
          const t = e.target as HTMLElement;
          if (!t.closest("button") && !t.closest('[class*="cursor-grab"]'))
            addRipple(e.clientX, e.clientY);
        }}
      >
        <div
          ref={zoomWrapperRef}
          className="absolute inset-0 pointer-events-none"
          style={{ transformOrigin: "50% 42%" }}
        >
          <RoomCanvas
            roomType={room.type}
            backDoor={backConn ? ROOM_ACCENT[backConn.to] : undefined}
            leftDoor={leftConn ? ROOM_ACCENT[leftConn.to] : undefined}
            rightDoor={rightConn ? ROOM_ACCENT[rightConn.to] : undefined}
            vpOffsetX={vpOffX}
          />
        </div>

        <p className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 font-grotesk text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFFBE0]/50">
          {room.name}
        </p>

        {room.content.map((item) => {
          const pos = positions[item.id];
          if (!pos) return null;
          const h = idHash(item.id);
          const duration = 4.5 + (h % 12) * 0.35;
          const delay = -((h >> 4) % 50) * 0.18;
          const tilt = ((h >> 8) % 13) - 6;
          return (
            <div
              key={item.id}
              className="absolute z-10 cursor-grab active:cursor-grabbing select-none"
              style={{ left: pos.x, top: pos.y }}
              onPointerDown={(e) => onPointerDown(e, item)}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => onPointerUp(e, item)}
            >
              <div
                style={{
                  transform: `translate(-50%, -50%) rotate(${tilt}deg)`,
                }}
              >
                <div
                  style={{
                    animation: `ghostDrift ${duration}s ease-in-out ${delay}s infinite`,
                  }}
                >
                  <ContentPlaceholder item={item} />
                </div>
              </div>
            </div>
          );
        })}

        <canvas
          ref={rippleCanvasRef}
          className="pointer-events-none absolute inset-0 z-10"
        />

        {sw > 0 && (
          <>
            {backConn && renderDoorButton("back", backConn)}
            {leftConn && renderDoorButton("left", leftConn)}
            {rightConn && renderDoorButton("right", rightConn)}
          </>
        )}
      </div>

      {zoomedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={() => setZoomedItem(null)}
        >
          <div style={{ transform: "scale(2.4)", pointerEvents: "none" }}>
            <ContentPlaceholder item={zoomedItem} />
          </div>
          <button
            className="absolute right-8 top-8 font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FFFBE0]/50 hover:text-[#FFFBE0]"
            onClick={() => setZoomedItem(null)}
          >
            Close
          </button>
        </div>
      )}

      <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-5">
        <button
          onClick={() => turn("left")}
          className="font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FFFBE0]/40 transition-colors hover:text-[#FFFBE0]/80"
        >
          ← Turn
        </button>
        <span className="font-grotesk text-[9px] uppercase tracking-[0.22em] text-[#FFFBE0]/25">
          {facing}
        </span>
        <button
          onClick={() => turn("right")}
          className="font-grotesk text-[10px] font-bold uppercase tracking-widest text-[#FFFBE0]/40 transition-colors hover:text-[#FFFBE0]/80"
        >
          Turn →
        </button>
      </div>
    </div>
  );
}
