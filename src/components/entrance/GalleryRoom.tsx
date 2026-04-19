"use client";

import { useEffect, useRef, forwardRef } from "react";

interface Pt {
  x: number;
  y: number;
}
type Quad = [Pt, Pt, Pt, Pt];

interface Eye {
  wx: number;
  wy: number;
  targetWx: number;
  targetWy: number;
  nextMove: number;
  wall: "back" | "left" | "right";
  size: number;
  irisColor: string;
  blinkState: "idle" | "closing" | "opening";
  blinkProgress: number;
  nextBlink: number;
}

interface PortalStar {
  x: number;
  y: number; // offset from portal center
  life: number;
  maxLife: number;
  size: number;
}

interface PortalRing {
  r: number;
  alpha: number;
}

interface Blob {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  color: string;
}

const BLINK_SPEED = 0.06;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function pt(x: number, y: number): Pt {
  return { x, y };
}

function qPt([tl, tr, br, bl]: Quad, s: number, t: number): Pt {
  return pt(
    lerp(lerp(tl.x, tr.x, s), lerp(bl.x, br.x, s), t),
    lerp(lerp(tl.y, tr.y, s), lerp(bl.y, br.y, s), t),
  );
}

function fillPoly(ctx: CanvasRenderingContext2D, points: Pt[], fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fill();
}

function strokePoly(
  ctx: CanvasRenderingContext2D,
  points: Pt[],
  color: string,
  lw: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.stroke();
}

function wallBand(
  ctx: CanvasRenderingContext2D,
  wall: Quad,
  t1: number,
  t2: number,
  color: string,
) {
  fillPoly(
    ctx,
    [qPt(wall, 0, t1), qPt(wall, 1, t1), qPt(wall, 1, t2), qPt(wall, 0, t2)],
    color,
  );
}

function wallVBand(
  ctx: CanvasRenderingContext2D,
  wall: Quad,
  s1: number,
  s2: number,
  color: string,
) {
  fillPoly(
    ctx,
    [qPt(wall, s1, 0), qPt(wall, s2, 0), qPt(wall, s2, 1), qPt(wall, s1, 1)],
    color,
  );
}

const COLORS = [
  "#FF2D9B",
  "#FF6400",
  "#F5E000",
  "#00D4C8",
  "#A000FF",
  "#82E000",
  "#FF80C0",
  "#FF6400",
];
const INK = "#0D0010";
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const GalleryRoom = forwardRef<
  HTMLCanvasElement,
  { className?: string; style?: React.CSSProperties }
>(({ className, style }, ref) => {
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = (ref as React.MutableRefObject<HTMLCanvasElement> | null)
      ?.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    onResize();
    window.addEventListener("resize", onResize);

    function randPos(wall: "back" | "left" | "right") {
      const wx = wall === "back" ? 0.08 + Math.random() * 0.84 : 0.15 + Math.random() * 0.70
      const wy = wall === "back" ? 0.10 + Math.random() * 0.72 : 0.12 + Math.random() * 0.65
      return { wx, wy }
    }

    const eyes: Eye[] = (
      [
        { wall: "back",  size: 0.11 },
        { wall: "back",  size: 0.10 },
        { wall: "back",  size: 0.09 },
        { wall: "back",  size: 0.09 },
        { wall: "left",  size: 0.15 },
        { wall: "right", size: 0.15 },
      ] as { wall: "back" | "left" | "right"; size: number }[]
    ).map(({ wall, size }) => {
      const { wx, wy } = randPos(wall)
      return { wx, wy, targetWx: wx, targetWy: wy, nextMove: 200 + Math.floor(Math.random() * 400), wall, size, irisColor: randomColor(), blinkState: "idle" as const, blinkProgress: 0, nextBlink: 60 + Math.floor(Math.random() * 180) }
    });

    const portalStars: PortalStar[] = [];
    const portalRings: PortalRing[] = [];

    const blobs: Blob[] = Array.from({ length: 14 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.55,
      vy: (Math.random() - 0.5) * 0.4,
      r: 16 + Math.random() * 65,
      color: COLORS[i % COLORS.length],
    }));

    function drawEye(
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      irisColor: string,
      bp: number,
    ) {
      const ir = Math.min(rx, ry);
      ctx.save();

      ctx.fillStyle = "#FFFBE0";
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = irisColor;
      ctx.beginPath();
      ctx.arc(cx, cy, ir * 0.65, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(cx, cy, ir * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,251,224,0.9)";
      ctx.beginPath();
      ctx.arc(cx - ir * 0.16, cy - ir * 0.18, ir * 0.1, 0, Math.PI * 2);
      ctx.fill();

      if (bp > 0) {
        ctx.fillStyle = INK;
        ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * bp);
        ctx.fillRect(cx - rx, cy + ry * (1 - bp), rx * 2, ry * bp);
      }

      ctx.restore();

      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(2, ir * 0.13);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    let tick = 0;

    function draw() {
      tick++;
      const W = ctx.canvas.width;
      const H = ctx.canvas.height;
      ctx.clearRect(0, 0, W, H);

      const vpx = W / 2 + Math.sin(tick * 0.004) * 5;
      const vpy = H * 0.4 + Math.cos(tick * 0.003) * 3;
      const bw = W * 0.24;
      const bh = H * 0.28;

      const BWtl = pt(vpx - bw, vpy - bh);
      const BWtr = pt(vpx + bw, vpy - bh);
      const BWbr = pt(vpx + bw, vpy + bh);
      const BWbl = pt(vpx - bw, vpy + bh);

      const backWall: Quad = [BWtl, BWtr, BWbr, BWbl];
      const leftWall: Quad = [pt(0, 0), BWtl, BWbl, pt(0, H)];
      const rightWall: Quad = [BWtr, pt(W, 0), pt(W, H), BWbr];
      const floorQuad: Quad = [BWbl, BWbr, pt(W, H), pt(0, H)];
      const ceilQuad: Quad = [pt(0, 0), pt(W, 0), BWtr, BWtl];

      const N = COLORS.length;

      ctx.fillStyle = "#F5E000";
      ctx.fillRect(0, 0, W, H);

      for (let i = 0; i < N; i++)
        wallVBand(ctx, floorQuad, i / N, (i + 1) / N, COLORS[i]);
      for (let i = 0; i < N; i++)
        wallVBand(ctx, ceilQuad, i / N, (i + 1) / N, COLORS[(i + 3) % N]);
      for (let i = 0; i < N; i++)
        wallBand(ctx, leftWall, i / N, (i + 1) / N, COLORS[(i + 1) % N]);
      for (let i = 0; i < N; i++)
        wallBand(ctx, rightWall, i / N, (i + 1) / N, COLORS[(i + 5) % N]);
      for (let i = 0; i < N; i++)
        wallBand(ctx, backWall, i / N, (i + 1) / N, COLORS[(i + 2) % N]);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(BWtl.x, BWtl.y);
      ctx.lineTo(BWtr.x, BWtr.y);
      ctx.lineTo(BWbr.x, BWbr.y);
      ctx.lineTo(BWbl.x, BWbl.y);
      ctx.closePath();
      ctx.clip();
      const maxR = Math.max(bw, bh) * 1.3;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.55;
      for (let r = 7; r >= 1; r--) {
        ctx.strokeStyle = COLORS[(r + 4) % N];
        ctx.beginPath();
        ctx.arc(vpx, vpy, (maxR * r) / 7, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      const edgeLW = Math.max(3, W * 0.004);
      ctx.strokeStyle = INK;
      ctx.lineWidth = edgeLW;
      for (const [a, b] of [[pt(0, H), BWbl], [pt(W, H), BWbr], [pt(0, 0), BWtl], [pt(W, 0), BWtr]] as [Pt, Pt][]) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      strokePoly(ctx, [BWtl, BWtr, BWbr, BWbl], INK, edgeLW);
      strokePoly(ctx, [BWbl, BWbr, pt(W, H), pt(0, H)], INK, edgeLW * 0.6);
      strokePoly(ctx, [pt(0, 0), pt(W, 0), BWtr, BWtl], INK, edgeLW * 0.6);

      const basePortalR = bw * 0.4;
      // Breathe very slowly between ~65% and 100% of base size
      const portalR = basePortalR * (0.82 + Math.sin(tick * 0.004) * 0.18);
      const portalX = vpx;
      const portalY = vpy + bh * 0.06;

      // ── Black hole ────────────────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(portalX, portalY, portalR, 0, Math.PI * 2);
      ctx.clip();

      const bhRot = tick * 0.007;
      const tilt = 0.28;
      // Black hole breathes independently from the portal — different frequency + phase
      const bhScale = 0.32 + Math.sin(tick * 0.0027 + 2.4) * 0.28;
      const ehR = portalR * 0.26 * bhScale;

      // Deep purple nebula background
      const nebGrad = ctx.createRadialGradient(
        portalX,
        portalY,
        0,
        portalX,
        portalY,
        portalR,
      );
      nebGrad.addColorStop(0, "rgba(50, 0, 90, 0.95)");
      nebGrad.addColorStop(0.55, "rgba(15, 0, 30, 0.98)");
      nebGrad.addColorStop(1, "rgba(8, 0, 15, 1)");
      ctx.fillStyle = nebGrad;
      ctx.beginPath();
      ctx.arc(portalX, portalY, portalR, 0, Math.PI * 2);
      ctx.fill();

      // Back accretion disk
      ctx.save();
      ctx.translate(portalX, portalY);
      ctx.rotate(bhRot);
      ctx.scale(1, tilt);
      const diskBack = ctx.createRadialGradient(
        0,
        0,
        ehR * 0.9,
        0,
        0,
        portalR * 0.72 * bhScale,
      );
      diskBack.addColorStop(0, "rgba(255, 200, 60, 0.55)");
      diskBack.addColorStop(0.22, "rgba(255, 100, 0, 0.40)");
      diskBack.addColorStop(0.55, "rgba(180, 20, 90, 0.18)");
      diskBack.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = diskBack;
      ctx.beginPath();
      ctx.arc(0, 0, portalR * 0.72 * bhScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Event horizon occludes back disk
      ctx.fillStyle = "#08000F";
      ctx.beginPath();
      ctx.arc(portalX, portalY, ehR, 0, Math.PI * 2);
      ctx.fill();

      // Front accretion disk — bright arc clipped to bottom half
      ctx.save();
      ctx.translate(portalX, portalY);
      ctx.rotate(bhRot);
      ctx.scale(1, tilt);
      ctx.beginPath();
      ctx.rect(-portalR, 0, portalR * 2, portalR);
      ctx.clip();
      const diskFront = ctx.createRadialGradient(
        0,
        0,
        ehR * 0.82,
        0,
        0,
        portalR * 0.58 * bhScale,
      );
      diskFront.addColorStop(0, "rgba(255, 255, 200, 0)");
      diskFront.addColorStop(0.12, "rgba(255, 245, 100, 1)");
      diskFront.addColorStop(0.38, "rgba(255, 140, 0, 0.75)");
      diskFront.addColorStop(0.68, "rgba(200, 30, 100, 0.30)");
      diskFront.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = diskFront;
      ctx.beginPath();
      ctx.arc(0, 0, portalR * 0.58 * bhScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Photon ring — pulsing halo at event horizon edge
      const prPulse = 0.55 + Math.sin(tick * 0.06) * 0.45;
      const prGrad = ctx.createRadialGradient(
        portalX,
        portalY,
        ehR * 0.88,
        portalX,
        portalY,
        ehR * 1.55,
      );
      prGrad.addColorStop(0, "rgba(255, 200, 80, 0)");
      prGrad.addColorStop(0.35, `rgba(255, 230, 120, ${prPulse * 0.65})`);
      prGrad.addColorStop(0.65, `rgba(255, 80, 30, ${prPulse * 0.3})`);
      prGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = prGrad;
      ctx.beginPath();
      ctx.arc(portalX, portalY, ehR * 1.55, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      // ── End black hole ────────────────────────────────────────────────────────

      const pulse = 0.75 + Math.sin(tick * 0.045) * 0.25;
      ctx.strokeStyle = `rgba(255, 45, 155, ${pulse})`;
      ctx.lineWidth = Math.max(5, W * 0.008);
      ctx.beginPath();
      ctx.arc(portalX, portalY, portalR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(245, 224, 0, ${pulse * 0.85})`;
      ctx.lineWidth = Math.max(2, W * 0.003);
      ctx.beginPath();
      ctx.arc(portalX, portalY, portalR * 1.1, 0, Math.PI * 2);
      ctx.stroke();

      // Shockwave rings — spawn randomly, expand outward and fade
      if (Math.random() < 0.005) {
        portalRings.push({ r: portalR, alpha: 0.8 });
      }
      for (let i = portalRings.length - 1; i >= 0; i--) {
        const ring = portalRings[i];
        ring.r += 3.5;
        ring.alpha -= 0.011;
        if (ring.alpha <= 0) {
          portalRings.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(255, 45, 155, ${ring.alpha})`;
        ctx.lineWidth = Math.max(1.5, W * 0.003);
        ctx.beginPath();
        ctx.arc(portalX, portalY, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(245, 224, 0, ${ring.alpha * 0.5})`;
        ctx.lineWidth = Math.max(1, W * 0.0015);
        ctx.beginPath();
        ctx.arc(portalX, portalY, ring.r * 1.06, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Portal stars — occasional flickers inside the black circle
      if (Math.random() < 0.04) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * portalR * 0.8;
        portalStars.push({
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          life: 0,
          maxLife: 10 + Math.floor(Math.random() * 45),
          size: 1.5 + Math.random() * 2,
        });
      }
      ctx.save();
      ctx.beginPath();
      ctx.arc(portalX, portalY, portalR, 0, Math.PI * 2);
      ctx.clip();
      for (let i = portalStars.length - 1; i >= 0; i--) {
        const s = portalStars[i];
        s.life++;
        if (s.life > s.maxLife) {
          portalStars.splice(i, 1);
          continue;
        }
        const lt = s.life / s.maxLife;
        const alpha = lt < 0.25 ? lt / 0.25 : lt > 0.65 ? (1 - lt) / 0.35 : 1;
        const sx = portalX + s.x;
        const sy = portalY + s.y;
        // Cross spike
        ctx.strokeStyle = `rgba(255, 251, 224, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - s.size, sy);
        ctx.lineTo(sx + s.size, sy);
        ctx.moveTo(sx, sy - s.size);
        ctx.lineTo(sx, sy + s.size);
        ctx.stroke();
        // Soft glow
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, s.size * 2.5);
        glow.addColorStop(0, `rgba(255, 251, 224, ${alpha * 0.6})`);
        glow.addColorStop(1, "rgba(255, 251, 224, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, s.size * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      for (const b of blobs) {
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < -b.r) b.x = W + b.r;
        if (b.x > W + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = H + b.r;
        if (b.y > H + b.r) b.y = -b.r;

        ctx.globalAlpha = 0.28;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      for (const eye of eyes) {
        // Smoothly glide toward target position
        eye.wx += (eye.targetWx - eye.wx) * 0.018
        eye.wy += (eye.targetWy - eye.wy) * 0.018
        // Pick a new target at random intervals
        eye.nextMove--
        if (eye.nextMove <= 0) {
          const { wx, wy } = randPos(eye.wall)
          eye.targetWx = wx
          eye.targetWy = wy
          eye.nextMove = 250 + Math.floor(Math.random() * 500)
        }

        eye.nextBlink--;
        if (eye.blinkState === "idle" && eye.nextBlink <= 0)
          eye.blinkState = "closing";
        if (eye.blinkState === "closing") {
          eye.blinkProgress = Math.min(1, eye.blinkProgress + BLINK_SPEED);
          if (eye.blinkProgress >= 1) {
            eye.irisColor = randomColor();
            eye.blinkState = "opening";
          }
        } else if (eye.blinkState === "opening") {
          eye.blinkProgress = Math.max(0, eye.blinkProgress - BLINK_SPEED);
          if (eye.blinkProgress <= 0) {
            eye.blinkState = "idle";
            eye.nextBlink = 100 + Math.floor(Math.random() * 230);
          }
        }

        const wall =
          eye.wall === "back"
            ? backWall
            : eye.wall === "left"
              ? leftWall
              : rightWall;
        const ePos = qPt(wall, eye.wx, eye.wy);
        const topPt = qPt(wall, eye.wx, 0);
        const botPt = qPt(wall, eye.wx, 1);
        const wallH = Math.abs(botPt.y - topPt.y);
        const er = wallH * eye.size;

        drawEye(
          ePos.x,
          ePos.y,
          er * 1.55,
          er,
          eye.irisColor,
          eye.blinkProgress,
        );
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, [ref]);

  return (
    <canvas
      ref={ref}
      className={`absolute inset-0 ${className ?? ""}`}
      style={style}
    />
  );
});

GalleryRoom.displayName = "GalleryRoom";
export default GalleryRoom;
