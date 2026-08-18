"use client";

import { MotionConfig } from "motion/react";

export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      {children}
    </MotionConfig>
  );
}
