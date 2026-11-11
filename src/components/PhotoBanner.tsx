"use client";

import Image from "next/image";
import { motion } from "motion/react";

/** Apple-style photo header: big image, short bold headline, slow zoom-in. */
export function PhotoBanner({
  img,
  eyebrow,
  title,
  sub,
  className = "",
  height = "h-[320px] sm:h-[400px]",
}: {
  img: string;
  eyebrow?: string;
  title: string;
  sub?: string;
  className?: string;
  height?: string;
}) {
  return (
    <motion.section
      className={`relative overflow-hidden rounded-[2.25rem] ${height} ${className}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.15 }}
        animate={{ scale: 1 }}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
      >
        <Image src={img} alt="" fill priority sizes="100vw" className="object-cover" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 p-7 text-white sm:p-10">
        {eyebrow ? <p className="text-base font-semibold text-lime-400">{eyebrow}</p> : null}
        <h1 className="mt-1 text-4xl font-bold tracking-[-0.04em] [overflow-wrap:anywhere] sm:text-6xl">{title}</h1>
        {sub ? <p className="mt-2 max-w-xl text-lg text-white/75">{sub}</p> : null}
      </div>
    </motion.section>
  );
}
