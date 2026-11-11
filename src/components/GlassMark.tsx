"use client";

import { motion } from "motion/react";
import { LogoMark } from "@/components/Logo";

/** The Liora hexagon in a frosted-glass tile with a soft breathing glow. */
export function GlassMark({ size = 120 }: { size?: number }) {
  return (
    <motion.div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 rounded-[32%] bg-lime-400/40 blur-2xl"
        animate={{ opacity: [0.35, 0.7, 0.35], scale: [0.9, 1.05, 0.9] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative grid h-full w-full place-items-center rounded-[32%] border border-white/30 bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_30px_60px_-20px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <LogoMark className="h-[58%] w-[58%] drop-shadow-[0_8px_16px_rgba(0,0,0,0.35)]" />
      </div>
    </motion.div>
  );
}
