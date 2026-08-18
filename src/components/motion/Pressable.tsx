"use client";

import { motion, type HTMLMotionProps } from "motion/react";

const hover = { y: -2, scale: 1.015 };
const tap = { scale: 0.975 };

export function MotionButton({
  children,
  className,
  disabled,
  ...props
}: HTMLMotionProps<"button">) {
  return (
    <motion.button
      className={className}
      disabled={disabled}
      whileHover={disabled ? undefined : hover}
      whileTap={disabled ? undefined : tap}
      {...props}
    >
      {children}
    </motion.button>
  );
}

export function MotionAnchor({ children, className, ...props }: HTMLMotionProps<"a">) {
  return (
    <motion.a className={className} whileHover={hover} whileTap={tap} {...props}>
      {children}
    </motion.a>
  );
}
