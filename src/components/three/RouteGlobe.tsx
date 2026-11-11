"use client";

import { useEffect, useRef } from "react";

/**
 * Dependency-free 3D globe: a Fibonacci sphere of dots projected onto a canvas,
 * with animated shipping arcs between US hubs. Pauses when offscreen and
 * renders a single static frame for reduced-motion users.
 */

type LatLng = [number, number];

const HUBS: Record<string, LatLng> = {
  sf: [37.77, -122.42],
  la: [34.05, -118.24],
  sea: [47.61, -122.33],
  den: [39.74, -104.99],
  dal: [32.78, -96.8],
  chi: [41.88, -87.63],
  atl: [33.75, -84.39],
  mia: [25.76, -80.19],
  nyc: [40.71, -74.0],
  bos: [42.36, -71.06],
};

const ROUTES: [keyof typeof HUBS, keyof typeof HUBS][] = [
  ["sf", "nyc"],
  ["la", "chi"],
  ["sea", "atl"],
  ["den", "mia"],
  ["dal", "bos"],
  ["la", "mia"],
  ["sf", "dal"],
  ["chi", "nyc"],
];

function toVec([lat, lng]: LatLng): [number, number, number] {
  const phi = (lat * Math.PI) / 180;
  const theta = (lng * Math.PI) / 180;
  return [Math.cos(phi) * Math.sin(theta), Math.sin(phi), Math.cos(phi) * Math.cos(theta)];
}

function slerp(a: number[], b: number[], t: number) {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  if (omega < 1e-5) return a;
  const s = Math.sin(omega);
  const wa = Math.sin((1 - t) * omega) / s;
  const wb = Math.sin(t * omega) / s;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}

export function RouteGlobe({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COUNT = 1400;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const points: [number, number, number][] = [];
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = golden * i;
      points.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    const arcs = ROUTES.map(([from, to], index) => ({
      a: toVec(HUBS[from]),
      b: toVec(HUBS[to]),
      offset: index / ROUTES.length,
    }));
    const hubs = Object.values(HUBS).map(toVec);

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // Centre on North America (lng ≈ -98°); the globe sways around it so routes stay visible.
    const baseY = (-98 * Math.PI) / 180;
    let rotY = baseY;
    let sway = 0;
    let tiltX = 0.45;
    let targetTilt = tiltX;
    let pointerBoost = 0;

    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const nx = (event.clientX - rect.left) / rect.width - 0.5;
      const ny = (event.clientY - rect.top) / rect.height - 0.5;
      targetTilt = 0.45 + ny * 0.4;
      pointerBoost = nx * 0.004;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const project = (v: number[], radius: number, cx: number, cy: number) => {
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = v[0] * cosY - v[2] * sinY;
      const z1 = v[0] * sinY + v[2] * cosY;
      const cosX = Math.cos(tiltX);
      const sinX = Math.sin(tiltX);
      const y2 = v[1] * cosX - z1 * sinX;
      const z2 = v[1] * sinX + z1 * cosX;
      const persp = 2.6 / (2.6 - z2 * 0.6);
      return { x: cx + x1 * radius * persp, y: cy - y2 * radius * persp, z: z2 };
    };

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    io.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reduce) {
        sway += (pointerBoost * 120 - sway) * 0.03;
        rotY = baseY + Math.sin(now / 4200) * 0.55 + sway;
        tiltX += (targetTilt - tiltX) * 0.04;
      }
      const t = now / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const radius = Math.min(width, height) * 0.42;
      const cx = width / 2;
      const cy = height / 2;

      // Atmosphere glow
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius * 1.35);
      glow.addColorStop(0, "rgba(4, 70, 245, 0.35)");
      glow.addColorStop(1, "rgba(4, 70, 245, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const body = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
      body.addColorStop(0, "rgba(30, 90, 255, 0.55)");
      body.addColorStop(1, "rgba(6, 18, 52, 0.95)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Dots
      for (const p of points) {
        const q = project(p, radius, cx, cy);
        if (q.z < -0.15) continue;
        const depth = (q.z + 0.15) / 1.15;
        ctx.fillStyle = `rgba(190, 200, 255, ${0.12 + depth * 0.55})`;
        const size = 0.6 + depth * 1.1;
        ctx.fillRect(q.x - size / 2, q.y - size / 2, size, size);
      }

      // Arcs
      const STEPS = 48;
      for (const arc of arcs) {
        const progress = reduce ? 1 : ((t * 0.18 + arc.offset) % 1.4) / 1.0;
        const head = Math.min(1, progress);
        const tail = Math.max(0, progress - 0.45);
        if (head <= tail) continue;
        ctx.beginPath();
        let started = false;
        let headPoint: { x: number; y: number; z: number } | null = null;
        for (let i = 0; i <= STEPS; i++) {
          const s = tail + ((head - tail) * i) / STEPS;
          const v = slerp(arc.a, arc.b, s);
          const lift = 1 + Math.sin(s * Math.PI) * 0.18;
          const q = project([v[0] * lift, v[1] * lift, v[2] * lift], radius, cx, cy);
          if (q.z < -0.05) {
            started = false;
            continue;
          }
          if (!started) {
            ctx.moveTo(q.x, q.y);
            started = true;
          } else ctx.lineTo(q.x, q.y);
          headPoint = q;
        }
        const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
        grad.addColorStop(0, "rgba(120, 160, 255, 0.95)");
        grad.addColorStop(1, "rgba(168, 236, 58, 0.95)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        if (headPoint && progress < 1) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "rgba(168, 236, 58, 1)";
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(headPoint.x, headPoint.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Hubs
      for (const hub of hubs) {
        const q = project(hub, radius, cx, cy);
        if (q.z < 0) continue;
        const pulse = reduce ? 0 : (Math.sin(t * 2.4 + hub[0] * 9) + 1) / 2;
        ctx.strokeStyle = `rgba(168, 236, 58, ${0.5 - pulse * 0.4})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(q.x, q.y, 3 + pulse * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#a8ec3a";
        ctx.beginPath();
        ctx.arc(q.x, q.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduce) raf = requestAnimationFrame(loop);
    };
    const loop = (now: number) => {
      if (visible) draw(now);
      else {
        last = now;
        raf = requestAnimationFrame(loop);
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  return <canvas ref={canvasRef} className={`block h-full w-full ${className}`} aria-hidden="true" />;
}
