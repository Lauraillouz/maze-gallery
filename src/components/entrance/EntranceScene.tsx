"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import MapChoice from "./MapChoice";

const MAP_STORAGE_KEY = "hortense_has_map";
const NUM_STARS = 800;
const FOCAL_LENGTH = 300;
const NEBULA_START_Z = 8000;
const NEBULA_MIN_Z = 60;
const WORD_Z_SPEED_FACTOR = 0.08;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number;
  y: number;
  z: number;
  px: number;
  py: number;
  reverse: boolean;
}

type BlobLayer = "base" | "detail" | "core";

interface NebulaBlob {
  bx: number;
  by: number;
  nx: number;
  ny: number;
  ns: number;
  radius: number;
  color: string;
  alpha: number;
  layer: BlobLayer;
}

interface NebulaFilament {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  cpx: number;
  cpy: number;
  color: string;
  alpha: number;
  width: number;
}

interface Nebula {
  wx: number;
  wy: number;
  z: number;
  blobs: NebulaBlob[];
  filaments: NebulaFilament[];
  elapsed: number;
}

interface WordFlash {
  text: string;
  wx: number;
  wy: number;
  z: number; // 3D world position
  alpha: number;
  life: number;
  maxLife: number;
  baseSize: number; // font size at z=FOCAL_LENGTH
  font: string;
}

interface GravityWell {
  sx: number;
  sy: number; // screen position
  strength: number;
  life: number;
  maxLife: number;
}

interface SurrealistShape {
  wx: number;
  wy: number;
  z: number;
  type: "face" | "hand";
  elapsed: number;
  maxElapsed: number;
  noiseOffset: number;
}

// ─── Nebula palettes ──────────────────────────────────────────────────────────

const NEBULA_PALETTES: [string, string, string, string][] = [
  // Amber fire
  ["255, 133, 0", "214, 59, 122", "232, 184, 75", "200, 75, 30"],
  // Magenta rust
  ["214, 59, 122", "200, 75, 30", "255, 133, 0", "212, 160, 23"],
  // Mustard inferno
  ["212, 160, 23", "255, 133, 0", "200, 75, 30", "240, 100, 60"],
  // Psychedelic warm
  ["255, 80, 30", "214, 59, 122", "255, 200, 60", "180, 40, 80"],
  // Retro solar
  ["240, 140, 20", "200, 40, 80", "255, 100, 0", "180, 160, 40"],
];

// ─── Factories ────────────────────────────────────────────────────────────────

function createStar(width: number, height: number): Star {
  return {
    x: (Math.random() - 0.5) * width * 2,
    y: (Math.random() - 0.5) * height * 2,
    z: Math.random() * width,
    px: 0,
    py: 0,
    reverse: Math.random() < 0.05, // 5% go backwards
  };
}

function spawnNebula(): Nebula {
  const palette =
    NEBULA_PALETTES[Math.floor(Math.random() * NEBULA_PALETTES.length)];
  const [c1, c2, c3, c4] = palette;
  const blobs: NebulaBlob[] = [];

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.8;
    const dist = 80 + Math.random() * 160;
    blobs.push({
      bx: Math.cos(angle) * dist,
      by: Math.sin(angle) * dist * 0.6,
      nx: Math.random() * 10,
      ny: Math.random() * 10,
      ns: 0.15 + Math.random() * 0.2,
      radius: 400 + Math.random() * 400,
      color: Math.random() > 0.5 ? c1 : c2,
      alpha: 0.025 + Math.random() * 0.035,
      layer: "base",
    });
  }
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 220;
    blobs.push({
      bx: Math.cos(angle) * dist,
      by: Math.sin(angle) * dist * 0.7,
      nx: Math.random() * 20,
      ny: Math.random() * 20,
      ns: 0.25 + Math.random() * 0.35,
      radius: 40 + Math.random() * 100,
      color: [c1, c2, c3][Math.floor(Math.random() * 3)],
      alpha: 0.06 + Math.random() * 0.1,
      layer: "detail",
    });
  }
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 120;
    blobs.push({
      bx: Math.cos(angle) * dist,
      by: Math.sin(angle) * dist,
      nx: Math.random() * 30,
      ny: Math.random() * 30,
      ns: 0.5 + Math.random() * 0.5,
      radius: 8 + Math.random() * 28,
      color: Math.random() > 0.5 ? c4 : c3,
      alpha: 0.25 + Math.random() * 0.3,
      layer: "core",
    });
  }

  const filaments: NebulaFilament[] = [];
  for (let i = 0; i < 8; i++) {
    const a1 = Math.random() * Math.PI * 2;
    const a2 = a1 + (Math.random() - 0.5) * Math.PI;
    const r = 100 + Math.random() * 200;
    filaments.push({
      ax: Math.cos(a1) * r,
      ay: Math.sin(a1) * r * 0.6,
      bx: Math.cos(a2) * r,
      by: Math.sin(a2) * r * 0.6,
      cpx: (Math.random() - 0.5) * 300,
      cpy: (Math.random() - 0.5) * 200,
      color: [c1, c2, c3, c4][Math.floor(Math.random() * 4)],
      alpha: 0.08 + Math.random() * 0.12,
      width: 1 + Math.random() * 3,
    });
  }

  return {
    wx: (Math.random() - 0.5) * 600,
    wy: (Math.random() - 0.5) * 400,
    z: NEBULA_START_Z,
    blobs,
    filaments,
    elapsed: 0,
  };
}

function spawnShape(): SurrealistShape {
  return {
    wx: (Math.random() - 0.5) * 400,
    wy: (Math.random() - 0.5) * 300,
    z: NEBULA_START_Z * 0.6,
    type: Math.random() > 0.5 ? "face" : "hand",
    elapsed: 0,
    maxElapsed: 10000 + Math.random() * 3000,
    noiseOffset: Math.random() * 100,
  };
}

// ─── Draw surrealist shape ─────────────────────────────────────────────────────

function drawFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  t: number,
  alpha: number,
) {
  const s = (v: number) => v * scale;
  ctx.strokeStyle = `rgba(245, 237, 214, ${alpha})`;
  ctx.lineWidth = Math.max(0.5, s(1.5));

  // Head
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy,
    s(70 + Math.sin(t * 0.7) * 8),
    s(90 + Math.cos(t * 0.5) * 10),
    Math.sin(t * 0.3) * 0.2,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  // Eyes
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      cx + side * s(22 + Math.sin(t * 1.1) * 4),
      cy - s(18 + Math.cos(t * 0.9) * 5),
      s(10 + Math.sin(t * 1.5 + side) * 3),
      s(6 + Math.cos(t * 1.2) * 2),
      Math.sin(t * 0.6 + side) * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  // Mouth
  const my = cy + s(32 + Math.sin(t * 0.8) * 8);
  ctx.beginPath();
  ctx.moveTo(cx - s(22), my);
  ctx.bezierCurveTo(
    cx - s(8),
    my + s(Math.sin(t * 1.3) * 18),
    cx + s(8),
    my + s(Math.cos(t * 1.1) * 18),
    cx + s(22),
    my,
  );
  ctx.stroke();
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  t: number,
  alpha: number,
) {
  const s = (v: number) => v * scale;
  ctx.strokeStyle = `rgba(245, 237, 214, ${alpha})`;
  ctx.lineWidth = Math.max(0.5, s(1.5));

  // Palm
  ctx.beginPath();
  ctx.ellipse(
    cx,
    cy + s(30),
    s(38 + Math.sin(t * 0.6) * 5),
    s(45 + Math.cos(t * 0.4) * 6),
    Math.sin(t * 0.3) * 0.2,
    0,
    Math.PI * 2,
  );
  ctx.stroke();

  // Fingers
  for (let i = 0; i < 5; i++) {
    const angle =
      -Math.PI / 2 + (i - 2) * 0.28 + Math.sin(t * 0.5 + i * 1.3) * 0.12;
    const bx = cx + Math.cos(angle + Math.PI / 2) * s(32);
    const by = cy - s(8);
    const len = s(55 + i * 4);
    const tx = bx + Math.cos(angle) * len;
    const ty = by + Math.sin(angle) * len;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.bezierCurveTo(
      bx + Math.cos(angle) * len * 0.35 + Math.sin(t * 0.7 + i) * s(8),
      by + Math.sin(angle) * len * 0.35,
      tx - Math.cos(angle) * len * 0.2,
      ty - Math.sin(angle) * len * 0.2 + Math.cos(t + i) * s(10),
      tx,
      ty,
    );
    ctx.stroke();
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EntranceScene({ locale }: { locale: string }) {
  const t = useTranslations("entrance");
  const router = useRouter();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wordsCanvasRef = useRef<HTMLCanvasElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const arrivalTriggeredRef = useRef(false);

  const [tagline, setTagline] = useState("");
  const [animating, setAnimating] = useState(true);
  const taglines = t.raw("taglines") as string[];

  useEffect(() => {
    setTagline(taglines[Math.floor(Math.random() * taglines.length)]);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const wordsCanvas = wordsCanvasRef.current;
    if (!wordsCanvas) return;
    const wctx = wordsCanvas.getContext("2d");
    if (!wctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    wordsCanvas.width = window.innerWidth;
    wordsCanvas.height = window.innerHeight;
    const { width, height } = canvas;

    function triggerArrival() {
      if (arrivalTriggeredRef.current) return;
      arrivalTriggeredRef.current = true;
      cancelAnimationFrame(animFrameRef.current);
      setAnimating(false);
      gsap.killTweensOf([
        canvas,
        wordsCanvas,
        flashRef.current,
        roomRef.current,
        titleRef.current,
        taglineRef.current,
        mapRef.current,
      ]);
      gsap
        .timeline()
        .to(flashRef.current, { opacity: 1, duration: 0.08, ease: "none" })
        .to(flashRef.current, { opacity: 0, duration: 0.6, ease: "power2.out" })
        .to(
          [canvas, wordsCanvas],
          { opacity: 0, duration: 0.5, ease: "power2.out" },
          "-=0.5",
        )
        .fromTo(
          roomRef.current,
          { opacity: 0 },
          { opacity: 0.3, duration: 0.05 },
        )
        .to(roomRef.current, { opacity: 0.1, duration: 0.05 })
        .to(roomRef.current, { opacity: 0.9, duration: 0.05 })
        .to(roomRef.current, { opacity: 0.3, duration: 0.05 })
        .to(roomRef.current, { opacity: 1, duration: 0.5, ease: "power2.out" })
        .from(
          titleRef.current,
          { opacity: 0, y: 12, duration: 1.2, ease: "power2.out" },
          "-=0.3",
        )
        .from(
          taglineRef.current,
          { opacity: 0, duration: 1, ease: "power2.out" },
          "-=0.7",
        )
        .from(
          mapRef.current,
          { opacity: 0, y: 20, duration: 1, ease: "power2.out" },
          "-=0.5",
        );
    }
    const cx0 = width / 2;
    const cy0 = height / 2;

    const stars = Array.from({ length: NUM_STARS }, () =>
      createStar(width, height),
    );
    const nebulae: Nebula[] = [];
    const wordFlashes: WordFlash[] = [];
    const gravityWells: GravityWell[] = [];
    let shape: SurrealistShape | null = null;

    const WORD_FONTS = [
      // Space Grotesk — futuriste géométrique
      "bold var(--font-space-grotesk), sans-serif",
      "900 var(--font-space-grotesk), sans-serif",
      "italic var(--font-space-grotesk), sans-serif",
      // Futura / Century Gothic — icônes des années 70 spatial
      "bold Futura, 'Century Gothic', Avenir, sans-serif",
      "Futura, 'Century Gothic', Avenir, sans-serif",
      // Optima — élégance moderniste des 70s
      "bold Optima, 'Gill Sans', 'Gill Sans MT', sans-serif",
      // Playfair — cabinet de curiosités
      "italic var(--font-playfair), serif",
      "bold italic var(--font-playfair), serif",
      // Impact — graphique, choc visuel
      "Impact, 'Arial Black', sans-serif",
    ];

    // Full surrealist phrases — shuffled so order is random each visit
    const wordFragments = [...taglines].sort(() => Math.random() - 0.5);

    const DURATION = 6000;
    const ACCELERATE_END = 0.35;
    const CRUISE_END = 0.65;
    const MAX_SPEED = 28;
    const MIN_SPEED = 0.3;

    let startTime: number | null = null;
    let tick = 0;
    let lastGlitchT = 0;
    let nextNebulaT = 0.02;
    let nextWordT = 0.04;
    let nextWellT = 0.2;
    let nextShapeT = 0.25;
    let invertFramesLeft = 0;
    let nextInvertT = 0.4;

    nebulae.push(spawnNebula(), spawnNebula(), spawnNebula());
    nebulae[0].z = NEBULA_START_Z * 0.8;
    nebulae[1].z = NEBULA_START_Z * 0.5;
    nebulae[2].z = NEBULA_START_Z * 0.25;

    // ── Nebulae ───────────────────────────────────────────────────────────────
    function drawNebulae(speed: number, cx: number, cy: number) {
      ctx!.globalCompositeOperation = "screen";
      for (let i = nebulae.length - 1; i >= 0; i--) {
        const neb = nebulae[i];
        const drift = (speed / 28) * 0.012;
        neb.wx += neb.wy * drift;
        neb.wy -= neb.wx * drift;
        neb.z -= speed * 0.4;
        neb.elapsed += 16;
        if (neb.z < NEBULA_MIN_Z) {
          nebulae.splice(i, 1);
          continue;
        }

        const scale = FOCAL_LENGTH / neb.z;
        const sx = (neb.wx / neb.z) * FOCAL_LENGTH + cx;
        const sy = (neb.wy / neb.z) * FOCAL_LENGTH + cy;
        const proximity = Math.pow(1 - neb.z / NEBULA_START_Z, 0.3);
        const tooClose = Math.min(
          1,
          (neb.z - NEBULA_MIN_Z) / (NEBULA_MIN_Z * 6),
        );
        const globalOpacity = proximity * tooClose;
        if (globalOpacity < 0.01) continue;

        const nt = neb.elapsed * 0.001;

        for (const fil of neb.filaments) {
          const grad = ctx!.createLinearGradient(
            sx + fil.ax * scale,
            sy + fil.ay * scale,
            sx + fil.bx * scale,
            sy + fil.by * scale,
          );
          grad.addColorStop(0, `rgba(${fil.color}, 0)`);
          grad.addColorStop(
            0.3,
            `rgba(${fil.color}, ${fil.alpha * globalOpacity})`,
          );
          grad.addColorStop(
            0.7,
            `rgba(${fil.color}, ${fil.alpha * globalOpacity})`,
          );
          grad.addColorStop(1, `rgba(${fil.color}, 0)`);
          ctx!.strokeStyle = grad;
          ctx!.lineWidth = Math.max(0.5, fil.width * scale);
          ctx!.beginPath();
          ctx!.moveTo(sx + fil.ax * scale, sy + fil.ay * scale);
          ctx!.quadraticCurveTo(
            sx + fil.cpx * scale,
            sy + fil.cpy * scale,
            sx + fil.bx * scale,
            sy + fil.by * scale,
          );
          ctx!.stroke();
        }

        for (const order of ["base", "detail", "core"] as BlobLayer[]) {
          for (const blob of neb.blobs) {
            if (blob.layer !== order) continue;
            const dx =
              Math.sin(blob.nx + nt * blob.ns) * 20 +
              Math.sin(blob.nx * 2.3 + nt * blob.ns * 1.7) * 10;
            const dy =
              Math.cos(blob.ny + nt * blob.ns * 0.8) * 15 +
              Math.cos(blob.ny * 1.9 + nt * blob.ns * 1.3) * 8;
            const bx = sx + (blob.bx + dx) * scale;
            const by = sy + (blob.by + dy) * scale;
            const br = Math.max(1, blob.radius * scale);
            const grad = ctx!.createRadialGradient(bx, by, 0, bx, by, br);
            const a = blob.alpha * globalOpacity;
            if (order === "core") {
              grad.addColorStop(0, `rgba(${blob.color}, ${a * 2})`);
              grad.addColorStop(0.2, `rgba(${blob.color}, ${a * 1.5})`);
              grad.addColorStop(0.6, `rgba(${blob.color}, ${a * 0.5})`);
            } else if (order === "detail") {
              grad.addColorStop(0, `rgba(${blob.color}, ${a * 1.8})`);
              grad.addColorStop(0.35, `rgba(${blob.color}, ${a})`);
              grad.addColorStop(0.7, `rgba(${blob.color}, ${a * 0.3})`);
            } else {
              grad.addColorStop(0, `rgba(${blob.color}, ${a})`);
              grad.addColorStop(0.5, `rgba(${blob.color}, ${a * 0.5})`);
            }
            grad.addColorStop(1, `rgba(${blob.color}, 0)`);
            ctx!.fillStyle = grad;
            ctx!.beginPath();
            ctx!.arc(bx, by, br, 0, Math.PI * 2);
            ctx!.fill();
          }
        }
      }
      ctx!.globalCompositeOperation = "source-over";
    }

    // ── Surrealist shape ──────────────────────────────────────────────────────
    function updateShape(speed: number, cx: number, cy: number) {
      if (!shape) return;
      const drift = (speed / 28) * 0.012;
      shape.wx += shape.wy * drift;
      shape.wy -= shape.wx * drift;
      shape.z -= speed * 0.35;
      shape.elapsed += 16;

      if (shape.z < NEBULA_MIN_Z || shape.elapsed > shape.maxElapsed) {
        shape = null;
        return;
      }

      const scale = FOCAL_LENGTH / shape.z;
      const sx = (shape.wx / shape.z) * FOCAL_LENGTH + cx;
      const sy = (shape.wy / shape.z) * FOCAL_LENGTH + cy;
      const proximity = Math.pow(1 - shape.z / NEBULA_START_Z, 0.3);
      const tooClose = Math.min(
        1,
        (shape.z - NEBULA_MIN_Z) / (NEBULA_MIN_Z * 6),
      );
      const fade = Math.min(1, (shape.maxElapsed - shape.elapsed) / 1000);
      const alpha = proximity * tooClose * fade * 0.35;

      if (alpha < 0.01) return;

      const st = shape.elapsed * 0.001 + shape.noiseOffset;
      ctx!.globalCompositeOperation = "screen";
      if (shape.type === "face") drawFace(ctx!, sx, sy, scale, st, alpha);
      else drawHand(ctx!, sx, sy, scale, st, alpha);
      ctx!.globalCompositeOperation = "source-over";
    }

    // ── Word flashes — drawn on a separate canvas, cleared fully each frame ───
    // Each letter has its own z depth: first letter closest, last farthest.
    // prevEndScreenX tracks where each letter ends on screen, then gets
    // back-projected to world X at the next letter's deeper z — this gives
    // natural perspective compression without manual spacing.
    function drawWords(speed: number, cx: number, cy: number) {
      wctx!.clearRect(0, 0, width, height);

      // Global skew following the tunnel's VP drift
      const vpDriftX = (cx - cx0) / (width * 0.28);
      const vpDriftY = (cy - cy0) / (height * 0.2);
      wctx!.save();
      wctx!.transform(1, vpDriftY * 0.06, vpDriftX * 0.14, 1, 0, 0);

      for (let i = wordFlashes.length - 1; i >= 0; i--) {
        const w = wordFlashes[i];
        w.life++;

        const drift = (speed / 28) * 0.018;
        w.wx += w.wy * drift;
        w.wy -= w.wx * drift;
        w.z -= speed * WORD_Z_SPEED_FACTOR;

        if (w.z <= 0) {
          wordFlashes.splice(i, 1);
          continue;
        }

        const fadeIn = Math.min(1, w.life / (w.maxLife * 0.25));
        const fadeOut = Math.max(0, 1 - w.life / w.maxLife);
        w.alpha = fadeIn * fadeOut;
        if (w.alpha < 0.01) {
          wordFlashes.splice(i, 1);
          continue;
        }

        wctx!.fillStyle = `rgba(245, 237, 214, ${w.alpha * 0.9})`;

        const DEPTH_STEP = 180; // z gap between consecutive letters
        // Start screen x = projection of w.wx at w.z
        let prevEndScreenX = (w.wx / w.z) * FOCAL_LENGTH + cx;

        for (let ci = 0; ci < w.text.length; ci++) {
          const char = w.text[ci];
          const letterZ = w.z + ci * DEPTH_STEP;
          if (letterZ <= 0) continue;

          const lScale = FOCAL_LENGTH / letterZ;
          const fontSize = Math.max(20, w.baseSize * lScale);
          const floatAmp = Math.max(0.5, 4 * lScale);

          wctx!.font = `${fontSize}px ${w.font}`;

          // Screen position: x from prevEndScreenX, y projected at letterZ
          const lsy = (w.wy / letterZ) * FOCAL_LENGTH + cy;
          const floatY = lsy + Math.sin(w.life * 0.05 + ci * 0.7) * floatAmp;
          const floatX =
            prevEndScreenX +
            Math.cos(w.life * 0.04 + ci * 0.5) * floatAmp * 0.3;

          wctx!.fillText(char, floatX, floatY);

          // Advance: next letter starts where this one ends on screen
          prevEndScreenX += wctx!.measureText(char).width;
        }
      }

      wctx!.restore();
    }

    // ── Gravity wells ─────────────────────────────────────────────────────────
    function applyGravityWells() {
      for (let i = gravityWells.length - 1; i >= 0; i--) {
        const gw = gravityWells[i];
        gw.life++;
        if (gw.life > gw.maxLife) {
          gravityWells.splice(i, 1);
        }
      }
    }

    // ── Glitch ────────────────────────────────────────────────────────────────
    function applyGlitch() {
      const slices = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < slices; i++) {
        const sliceY = Math.floor(Math.random() * height);
        const sliceH = 2 + Math.floor(Math.random() * 10);
        const offsetX = (Math.random() - 0.5) * 60;
        const imageData = ctx!.getImageData(0, sliceY, width, sliceH);
        ctx!.putImageData(imageData, offsetX, sliceY);
      }
    }

    // ── Main draw loop ────────────────────────────────────────────────────────
    function draw(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const t = Math.min(elapsed / DURATION, 1);

      ctx!.fillStyle = "rgba(28, 10, 4, 0.18)";
      ctx!.fillRect(0, 0, width, height);

      tick++;

      // Speed curve + breathing pulse (effect 5)
      let baseSpeed: number;
      if (t < ACCELERATE_END) {
        const p = t / ACCELERATE_END;
        baseSpeed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * (p * p * p);
      } else if (t < CRUISE_END) {
        baseSpeed = MAX_SPEED;
        if (t - lastGlitchT > 0.08 + Math.random() * 0.06) {
          applyGlitch();
          lastGlitchT = t;
        }
      } else {
        const p = 1 - (t - CRUISE_END) / (1 - CRUISE_END);
        baseSpeed = MIN_SPEED + (MAX_SPEED - MIN_SPEED) * (p * p * p);
      }
      const speed = baseSpeed * (1 + 0.12 * Math.sin(tick * 0.07));

      // Oscillating vanishing point
      const cx = cx0 + Math.sin(tick * 0.022) * width * 0.28;
      const cy = cy0 + Math.cos(tick * 0.016) * height * 0.2;

      drawNebulae(speed, cx, cy);
      updateShape(speed, cx, cy);
      drawWords(speed, cx, cy);
      applyGravityWells();

      // Spawn events
      if (t >= nextNebulaT && nebulae.length < 4) {
        nebulae.push(spawnNebula());
        nextNebulaT = t + 0.08 + Math.random() * 0.1;
      }
      if (t >= nextWordT && wordFragments.length > 0) {
        const text =
          wordFragments[Math.floor(Math.random() * wordFragments.length)];
        // Spawn at a target screen position — derive world coords from it
        // so the word starts visible and rushes toward the viewer like stars
        const spawnZ = 2000 + Math.random() * 3000;
        const baseSize = 220 + Math.floor(Math.random() * 120);
        // Estimate total screen width at spawn using average z across letters
        // (perspective compresses each letter as depth increases by DEPTH_STEP)
        const avgZ = spawnZ + text.length * 0.5 * 180;
        const approxWidth =
          text.length * baseSize * 0.5 * (FOCAL_LENGTH / avgZ);
        const safeLeft = width * 0.05;
        const safeRight = width * 0.92 - approxWidth;
        const targetSx =
          safeLeft + Math.random() * Math.max(0, safeRight - safeLeft);
        const targetSy = height * 0.12 + Math.random() * height * 0.76;
        wordFlashes.push({
          text,
          wx: ((targetSx - cx) * spawnZ) / FOCAL_LENGTH,
          wy: ((targetSy - cy) * spawnZ) / FOCAL_LENGTH,
          z: spawnZ,
          alpha: 0,
          life: 0,
          maxLife: 180 + Math.floor(Math.random() * 120),
          baseSize,
          font: WORD_FONTS[Math.floor(Math.random() * WORD_FONTS.length)],
        });
        nextWordT = t + 0.06 + Math.random() * 0.1;
      }
      if (t >= nextWellT) {
        gravityWells.push({
          sx: Math.random() * width,
          sy: Math.random() * height,
          strength: 0.3 + Math.random() * 0.5,
          life: 0,
          maxLife: 80 + Math.floor(Math.random() * 60),
        });
        nextWellT = t + 0.12 + Math.random() * 0.15;
      }
      if (t >= nextShapeT && !shape) {
        shape = spawnShape();
        nextShapeT = t + 0.3 + Math.random() * 0.3;
      }
      if (t >= nextInvertT) {
        invertFramesLeft = 1;
        nextInvertT = t + 0.15 + Math.random() * 0.2;
      }

      // Stars
      for (const star of stars) {
        star.px = (star.x / star.z) * FOCAL_LENGTH + cx;
        star.py = (star.y / star.z) * FOCAL_LENGTH + cy;

        const drift = (speed / 28) * 0.018;
        star.x += star.y * drift;
        star.y -= star.x * drift;

        // Gravity well influence (effect 6)
        for (const gw of gravityWells) {
          const lifeRatio = 1 - gw.life / gw.maxLife;
          const dxw = gw.sx - ((star.x / star.z) * FOCAL_LENGTH + cx);
          const dyw = gw.sy - ((star.y / star.z) * FOCAL_LENGTH + cy);
          const dist = Math.sqrt(dxw * dxw + dyw * dyw) + 1;
          star.x += (dxw / dist) * gw.strength * lifeRatio;
          star.y += (dyw / dist) * gw.strength * lifeRatio;
        }

        // Effect 4: reverse stars go away from viewer
        if (star.reverse) {
          star.z += speed * 0.5;
          if (star.z > width) {
            star.z = 10 + Math.random() * 50;
          }
        } else {
          star.z -= speed;
        }

        const sx = (star.x / star.z) * FOCAL_LENGTH + cx;
        const sy = (star.y / star.z) * FOCAL_LENGTH + cy;

        if (star.z <= 0 || sx < 0 || sx > width || sy < 0 || sy > height) {
          const fresh = createStar(width, height);
          star.x = fresh.x;
          star.y = fresh.y;
          star.z = width;
          star.reverse = Math.random() < 0.05;
          continue;
        }

        const depth = 1 - star.z / width;
        const size = Math.max(0.4, depth * 2);
        const opacity = Math.min(1, depth * 2);
        const aberration = size * (2 + depth * 6);

        ctx!.globalCompositeOperation = "screen";
        ctx!.lineWidth = size;
        // Warm chromatic aberration: amber / magenta / gold
        ctx!.strokeStyle = `rgba(255, 133, 0, ${opacity * 0.85})`;
        ctx!.beginPath();
        ctx!.moveTo(star.px - aberration, star.py);
        ctx!.lineTo(sx - aberration, sy);
        ctx!.stroke();
        ctx!.strokeStyle = `rgba(214, 59, 122, ${opacity * 0.85})`;
        ctx!.beginPath();
        ctx!.moveTo(star.px, star.py);
        ctx!.lineTo(sx, sy);
        ctx!.stroke();
        ctx!.strokeStyle = `rgba(232, 184, 75, ${opacity * 0.85})`;
        ctx!.beginPath();
        ctx!.moveTo(star.px + aberration * 0.5, star.py + aberration * 0.3);
        ctx!.lineTo(sx + aberration * 0.5, sy + aberration * 0.3);
        ctx!.stroke();
        ctx!.globalCompositeOperation = "source-over";
      }

      // Effect 3: color inversion flash via difference blend mode
      if (invertFramesLeft > 0) {
        ctx!.globalCompositeOperation = "difference";
        ctx!.fillStyle = "rgba(255, 255, 255, 0.12)";
        ctx!.fillRect(0, 0, width, height);
        ctx!.globalCompositeOperation = "source-over";
        invertFramesLeft--;
      }

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame((ts) => draw(ts));
      } else {
        triggerArrival();
      }
    }

    animFrameRef.current = requestAnimationFrame((ts) => draw(ts));
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      arrivalTriggeredRef.current = false;
    };
  }, []);

  function skipIntro() {
    setAnimating(false);
    cancelAnimationFrame(animFrameRef.current);
    gsap.killTweensOf([
      canvasRef.current,
      wordsCanvasRef.current,
      flashRef.current,
      roomRef.current,
      titleRef.current,
      taglineRef.current,
      mapRef.current,
    ]);
    gsap.set([canvasRef.current, wordsCanvasRef.current], { opacity: 0 });
    gsap.set(
      [roomRef.current, titleRef.current, taglineRef.current, mapRef.current],
      { opacity: 1, y: 0 },
    );
  }

  function handleMapChoice(hasMap: boolean) {
    localStorage.setItem(MAP_STORAGE_KEY, String(hasMap));
    router.push(`/${locale}/gallery`);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-espresso">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <canvas ref={wordsCanvasRef} className="absolute inset-0" />
      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0 z-20 bg-amber"
        style={{ opacity: 0 }}
      />
      {animating && (
        <button
          onClick={skipIntro}
          className="absolute right-6 top-6 z-30 border border-amber/40 bg-espresso/70 px-4 py-2 font-grotesk text-xs uppercase tracking-widest text-amber/80 shadow-[2px_2px_0px_rgba(255,133,0,0.2)] transition-all duration-150 hover:border-amber hover:bg-espresso hover:text-amber active:shadow-none active:translate-x-px active:translate-y-px"
        >
          {t("skip")}
        </button>
      )}
      <div
        ref={roomRef}
        className="relative z-10 flex min-h-screen w-full flex-col items-center justify-between px-6 py-16"
        style={{ opacity: 0 }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <h1
            ref={titleRef}
            className="font-grotesk text-5xl font-bold uppercase tracking-tight text-cream md:text-7xl"
          >
            {t("title")}
          </h1>
          <p
            ref={taglineRef}
            className="max-w-md font-serif text-base italic text-amber/70"
          >
            {tagline}
          </p>
        </div>
        <div ref={mapRef} className="flex flex-col items-center gap-4">
          <MapChoice onChoice={handleMapChoice} />
        </div>
      </div>
    </div>
  );
}
