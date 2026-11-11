"use client";

/** CSS 3D shipping container hanging from a crane hook, gently swaying. */
export function HangingContainer({ width = 300 }: { width?: number }) {
  const w = width;
  const h = Math.round(width * 0.42);
  const d = Math.round(width * 0.4);
  const ribs =
    "repeating-linear-gradient(90deg, rgba(255,255,255,0.14) 0 6px, rgba(0,0,0,0.12) 6px 9px, transparent 9px 14px)";
  const face = (extra: React.CSSProperties, bg: string, children?: React.ReactNode) => (
    <div
      className="absolute left-1/2 top-1/2 overflow-hidden border border-black/15"
      style={{ background: `${ribs}, ${bg}`, ...extra }}
    >
      {children}
    </div>
  );

  return (
    <div className="relative mx-auto select-none" style={{ width: w + 40, height: h + 210 }} aria-hidden="true">
      <div className="container-sway absolute inset-0" style={{ transformStyle: "preserve-3d", perspective: 1200 }}>
        {/* cable + hook */}
        <div className="absolute left-1/2 top-0 h-16 w-[3px] -translate-x-1/2 bg-ink/70" />
        <div className="absolute left-1/2 top-14 h-7 w-7 -translate-x-1/2 rounded-b-full border-[4px] border-t-0 border-ink/80" />
        <svg className="absolute left-0 top-[86px] w-full" height="80" viewBox={`0 0 ${w + 40} 80`} fill="none">
          <path
            d={`M${(w + 40) / 2} 0 L28 80 M${(w + 40) / 2} 0 L${w + 12} 80 M${(w + 40) / 2} 0 L${(w + 40) * 0.36} 80 M${(w + 40) / 2} 0 L${(w + 40) * 0.64} 80`}
            stroke="#1b2c6b"
            strokeOpacity="0.55"
            strokeWidth="1.5"
          />
        </svg>

        {/* box */}
        <div
          className="absolute left-1/2"
          style={{ top: 166 + h / 2, width: 0, height: 0, transformStyle: "preserve-3d", transform: "rotateX(-12deg)" }}
        >
          {face(
            { width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, transform: `translateZ(${d / 2}px)` },
            "linear-gradient(180deg,#2a63ff,#0338c7)",
            <svg viewBox="0 0 200 80" className="absolute inset-0 h-full w-full opacity-[0.18]">
              <path
                fill="#ffffff"
                d="M30 30c8-8 22-10 30-4s4 14-6 16-18 2-22-2-8-4-2-10zm60-8c10-4 26-2 32 6s-2 16-12 16-20-4-22-10 0-10 2-12zm50 6c8-2 18 0 22 6s0 12-8 12-14-4-16-8 0-8 2-10zm-80 24c6-2 12 2 12 8s-6 10-12 8-6-14 0-16z"
              />
            </svg>,
          )}
          {face(
            { width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, transform: `rotateY(180deg) translateZ(${d / 2}px)` },
            "linear-gradient(180deg,#0446f5,#032c99)",
          )}
          {face(
            { width: d, height: h, marginLeft: -d / 2, marginTop: -h / 2, transform: `rotateY(90deg) translateZ(${w / 2}px)` },
            "linear-gradient(180deg,#0338c7,#04227a)",
            <div className="absolute inset-y-[10%] left-1/2 w-[2px] bg-black/25" />,
          )}
          {face(
            { width: d, height: h, marginLeft: -d / 2, marginTop: -h / 2, transform: `rotateY(-90deg) translateZ(${w / 2}px)` },
            "linear-gradient(180deg,#0338c7,#04227a)",
          )}
          {face(
            { width: w, height: d, marginLeft: -w / 2, marginTop: -d / 2, transform: `rotateX(90deg) translateZ(${h / 2}px)` },
            "linear-gradient(90deg,#3d6bff,#2a63ff)",
          )}
        </div>
      </div>
    </div>
  );
}
