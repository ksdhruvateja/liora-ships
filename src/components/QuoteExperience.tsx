"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { photos } from "@/lib/photos";
import { QuoteForm } from "@/components/QuoteForm";
import { GlassMark } from "@/components/GlassMark";

const steps = ["Your details", "From & To", "Parcel", "Rates & pay"];

export function QuoteExperience() {
  return (
    <div className="space-y-10">
      <motion.section
        className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-ocean-600 via-ocean-700 to-ocean-900 px-6 py-10 text-white shadow-lift sm:px-12 sm:py-14"
        initial={{ opacity: 0, y: 20, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        style={{ transformPerspective: 1200 }}
      >
        <motion.div
          className="absolute inset-0"
          initial={{ scale: 1.15 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <Image src={photos.quoteHeader} alt="" fill priority sizes="100vw" className="object-cover" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-r from-ocean-900/95 via-ocean-700/75 to-ocean-500/20" />
        <div className="relative grid items-center gap-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-lg font-semibold text-lime-400">Quotes</p>
            <h1 className="mt-2 text-5xl font-bold tracking-[-0.04em] sm:text-7xl">Get a quote.</h1>
            <p className="mt-3 max-w-xl text-lg text-white/70">Shipped before? Your saved addresses pop up.</p>
            <ol className="mt-7 flex flex-wrap gap-2">
              {steps.map((step, index) => (
                <motion.li
                  key={step}
                  className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 py-1.5 pl-1.5 pr-4 text-sm backdrop-blur"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.07 }}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-ink">
                    {index + 1}
                  </span>
                  {step}
                </motion.li>
              ))}
            </ol>
          </div>
          <div className="hidden pr-6 md:block">
            <GlassMark size={140} />
          </div>
        </div>
      </motion.section>

      <QuoteForm />
    </div>
  );
}
