"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ContentItem, Direction, Room, RoomType } from "@/types/gallery";
import { ROOMS } from "@/data/rooms";
import RoomCanvas from "./RoomCanvas";
import ContentPlaceholder from "./ContentPlaceholder";

const DIRS = [Direction.North, Direction.East, Direction.South, Direction.West];

function relativeSide(
  facing: Direction,
  target: Direction,
): "back" | "right" | "behind" | "left" {
  const diff = (DIRS.indexOf(target) - DIRS.indexOf(facing) + 4) % 4;
  return (["back", "right", "behind", "left"] as const)[diff];
}

const ROOM_ACCENT: Record<RoomType, string> = {
  [RoomType.Entrance]: "#FF2D9B",
  [RoomType.Garden]:   "#82E000",
  [RoomType.Library]:  "#A000FF",
  [RoomType.Studio]:   "#FF6400",
  [RoomType.Archive]:  "#00D4C8",
  [RoomType.Salon]:    "#F5E000",
};

function qPt(
  q: readonly [readonly [number,number], readonly [number,number], readonly [number,number], readonly [number,number]],
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

function getDoorBox(side: "back" | "left" | "right", w: number, h: number) {
  const vpx = w / 2, vpy = h * 0.42;
  const bx0 = vpx - w * 0.16, bx1 = vpx + w * 0.16;
  const by0 = vpy - h * 0.25, by1 = vpy + h * 0.25;
  const q: Parameters<typeof qPt>[0] =
    side === "back"  ? [[bx0,by0],[bx1,by0],[bx1,by1],[bx0,by1]] :
    side === "left"  ? [[0,0],[bx0,by0],[bx0,by1],[0,h]] :
                       [[bx1,by0],[w,0],[w,h],[bx1,by1]];
  const [s0, s1] = DOOR_S, [t0, t1] = DOOR_T;
  const tl = qPt(q, s0, t0), br = qPt(q, s1, t1);
  return { x: tl[0], y: tl[1], w: br[0] - tl[0], h: br[1] - tl[1] };
}

function idHash(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
  return h;
}

function initialPos(item: ContentItem, idx: number, total: number, sw: number, sh: number) {
  const spread = total > 1 ? (idx / (total - 1) - 0.5) * 220 : 0;
  switch (item.wall) {
    case Direction.North: return { x: sw * 0.5 + spread, y: sh * 0.26 };
    case Direction.South: return { x: sw * 0.5 + spread, y: sh * 0.56 };
    case Direction.East:  return { x: sw * 0.76, y: sh * 0.32 + spread * 0.4 };
    case Direction.West:  return { x: sw * 0.24, y: sh * 0.32 + spread * 0.4 };
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

interface RippleWave {
  ox: number;
  oy: number;
  startTime: number;
  baseAlpha: number;
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
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
  const [hoveredDoor, setHoveredDoor] = useState<"back" | "left" | "right" | null>(null);

  const roomRef = useRef<HTMLDivElement>(null);
  const zoomWrapperRef = useRef<HTMLDivElement>(null);
  const turningRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);
  const rippleCanvasRef = useRef<HTMLCanvasElement>(null);
  const rippleSourcesRef = useRef<RippleWave[]>([]);
  const rippleRafRef = useRef<number>(0);
  const rippleColorRef = useRef(ROOM_ACCENT[room.type]);

  useEffect(() => {
    const update = () => { setSw(window.innerWidth); setSh(window.innerHeight); };
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
      items!.forEach((item, i) => { pos[item.id] = initialPos(item, i, items!.length, sw, sh); });
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
    for (const s of rippleSourcesRef.current) {
      const elapsed = now - s.startTime;
      const alpha = s.baseAlpha * Math.max(0, 1 - elapsed / RIPPLE_LIFETIME);
      if (alpha < 0.005) continue;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(s.ox, s.oy, elapsed * RIPPLE_SPEED, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (rippleSourcesRef.current.length > 0)
      rippleRafRef.current = requestAnimationFrame(drawRipples);
  }

  function addRipple(x: number, y: number) {
    const now = performance.now();
    rippleSourcesRef.current.push(
      { ox: x,        oy: y,        startTime: now, baseAlpha: 0.75 },
      { ox: -x,       oy: y,        startTime: now, baseAlpha: 0.35 },
      { ox: 2*sw - x, oy: y,        startTime: now, baseAlpha: 0.35 },
      { ox: x,        oy: -y,       startTime: now, baseAlpha: 0.35 },
      { ox: x,        oy: 2*sh - y, startTime: now, baseAlpha: 0.35 },
    );
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
      rotateY: yOut, transformPerspective: 900, opacity: 0,
      duration: 0.16, ease: "power2.in",
      onComplete: () => {
        setFacing((f) => DIRS[dir === "right" ? (DIRS.indexOf(f) + 1) % 4 : (DIRS.indexOf(f) + 3) % 4]);
        gsap.fromTo(
          roomRef.current,
          { rotateY: -yOut, transformPerspective: 900, opacity: 0 },
          { rotateY: 0, transformPerspective: 900, opacity: 1, duration: 0.2, ease: "power2.out",
            onComplete: () => { turningRef.current = false; } },
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
      startClientX: e.clientX, startClientY: e.clientY,
      startItemX: pos.x, startItemY: pos.y,
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
      setPositions((prev) => ({ ...prev, [d.id]: { x: d.startItemX + dx, y: d.startItemY + dy } }));
  }

  function onPointerUp(_e: React.PointerEvent, item: ContentItem) {
    if (!dragRef.current) return;
    const wasClick = !dragRef.current.moved;
    dragRef.current = null;
    if (wasClick) setZoomedItem(item);
  }

  function renderDoorButton(side: "back" | "left" | "right", conn: (typeof room.connections)[0]) {
    const box = getDoorBox(side, sw, sh);
    const pullX = side in VP_PULL ? VP_PULL[side as "left" | "right"] : 0;
    const expand = Math.abs(pullX) * 0.6;
    const rotation = side === "left" ? "-rotate-90" : side === "right" ? "rotate-90" : "";
    return (
      <button
        key={side}
        onClick={() => onNavigate(conn.to)}
        onMouseEnter={() => {
          setHoveredDoor(side);
          if (side === "back")
            gsap.to(zoomWrapperRef.current, { scale: 1.4, duration: 0.5, ease: "power2.out" });
        }}
        onMouseLeave={() => {
          setHoveredDoor(null);
          if (side === "back")
            gsap.to(zoomWrapperRef.current, { scale: 1, duration: 0.3, ease: "power2.in" });
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
          style={{ color: ROOM_ACCENT[conn.to], opacity: hoveredDoor === side ? 0.7 : 0 }}
        >
          {ROOMS[conn.to].name}
        </span>
      </button>
    );
  }

  const connBySide = new Map<"back" | "left" | "right", (typeof room.connections)[0]>();
  for (const conn of room.connections) {
    const side = relativeSide(facing, conn.direction);
    if (side !== "behind") connBySide.set(side, conn);
  }

  const vpOffX = hoveredDoor && hoveredDoor in VP_PULL ? VP_PULL[hoveredDoor as "left" | "right"] : 0;

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
            backDoor={connBySide.get("back") ? ROOM_ACCENT[connBySide.get("back")!.to] : undefined}
            leftDoor={connBySide.get("left") ? ROOM_ACCENT[connBySide.get("left")!.to] : undefined}
            rightDoor={connBySide.get("right") ? ROOM_ACCENT[connBySide.get("right")!.to] : undefined}
            vpOffsetX={vpOffX}
            vpOffsetY={0}
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
              <div style={{ transform: `translate(-50%, -50%) rotate(${tilt}deg)` }}>
                <div style={{ animation: `ghostDrift ${duration}s ease-in-out ${delay}s infinite` }}>
                  <ContentPlaceholder item={item} />
                </div>
              </div>
            </div>
          );
        })}

        <canvas ref={rippleCanvasRef} className="pointer-events-none absolute inset-0 z-10" />

        {sw > 0 && (
          <>
            {connBySide.get("back") && renderDoorButton("back", connBySide.get("back")!)}
            {connBySide.get("left") && renderDoorButton("left", connBySide.get("left")!)}
            {connBySide.get("right") && renderDoorButton("right", connBySide.get("right")!)}
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
