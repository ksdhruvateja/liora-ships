"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { QuoteForm } from "@/components/QuoteForm";
import { TrackForm } from "@/components/TrackForm";
import { MotionAnchor } from "@/components/motion/Pressable";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Liora Labs Shipping";

const photos = {
  hero: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80",
  cargo: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1200&q=80",
  warehouse: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1200&q=80",
};

const easeOut = { type: "spring" as const, stiffness: 120, damping: 20 };

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

const inView = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: "some" as const, margin: "0px" },
  transition: easeOut,
};

export function HomeExperience() {
  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p variants={fadeUp} className="eyebrow">
            Liora Labs Shipping
          </motion.p>
          <motion.h1
            variants={fadeUp}
            className="mt-3 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl"
          >
            Every shipment matters to us.
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-4 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            Compare live rates, pay once, and print a {appName} label. No extra carrier checkout.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-7 flex flex-wrap gap-3">
            <MotionAnchor href="/#quote" className="btn-primary">
              Get a rate
              <span className="btn-arrow">→</span>
            </MotionAnchor>
            <MotionAnchor href="/#services" className="btn-secondary">
              Explore services
            </MotionAnchor>
          </motion.div>
        </motion.div>

        <motion.div
          className="relative overflow-hidden rounded-[1.75rem]"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...easeOut, delay: 0.12 }}
        >
          <Image
            src={photos.hero}
            alt="Shipping containers ready for dispatch"
            width={900}
            height={720}
            className="h-[300px] w-full object-cover sm:h-[380px]"
            priority
          />
          <motion.div
            className="absolute right-4 top-4 rounded-2xl bg-white px-4 py-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...easeOut, delay: 0.35 }}
          >
            <p className="text-xl font-extrabold leading-none">500+</p>
            <p className="mt-1 text-xs text-muted">routes quoted daily</p>
          </motion.div>
          <motion.div
            className="absolute inset-x-4 bottom-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...easeOut, delay: 0.42 }}
          >
            <TrackForm />
          </motion.div>
        </motion.div>
      </section>

      <motion.section
        className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-center text-sm font-semibold uppercase tracking-[0.16em] text-muted/70"
        {...inView}
      >
        <span className="eyebrow !tracking-[0.16em]">Ship by</span>
        <span>Ground</span>
        <span>Air</span>
        <span>Ocean</span>
        <span>Express</span>
        <span>Last mile</span>
      </motion.section>

      <motion.section id="services" className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16" {...inView}>
        <div className="grid grid-cols-2 gap-4">
          <Image
            src={photos.warehouse}
            alt="Warehouse cargo flow"
            width={900}
            height={700}
            className="col-span-2 h-56 w-full rounded-[1.75rem] object-cover sm:h-64"
          />
          <Image
            src={photos.cargo}
            alt="Freight ready for transport"
            width={640}
            height={420}
            className="h-36 w-full rounded-[1.75rem] object-cover sm:h-40"
          />
          <div className="flex h-36 items-center justify-center rounded-[1.75rem] bg-ink px-6 text-white sm:h-40">
            <p className="text-lg font-bold leading-snug">Quote, pay, and print in one flow.</p>
          </div>
        </div>
        <div>
          <p className="eyebrow">Smarter cargo flow</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Built for labels, not extra steps.
          </h2>
          <p className="mt-4 text-muted">
            {appName} shows the price you pay, takes payment, then buys the label. Tracking lives on your confirmation page.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ["Quote", "Live branded rates from origin to destination."],
              ["Pay", "Stripe checkout. Label is bought only after payment."],
              ["Print", "Download the PDF the moment it is ready."],
              ["Track", "Share a clean Liora tracking link."],
            ].map(([title, copy], index) => (
              <motion.article
                key={title}
                className="surface p-5"
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 380, damping: 28, delay: 0 }}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                custom={index}
              >
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </motion.section>

      <section id="how" className="grid gap-4 sm:grid-cols-3">
        {[
          ["01", "Enter the shipment", "US from and to addresses, plus parcel size. Saved addresses appear after you ship once."],
          ["02", "Pick a rate and pay", "Choose a Liora service and complete Stripe checkout."],
          ["03", "Print the label", "The PDF and tracking number land on your confirmation page."],
        ].map(([step, title, copy], index) => (
          <motion.article
            key={step}
            className="surface p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ ...easeOut, delay: index * 0.08 }}
            whileHover={{ y: -4 }}
          >
            <p className="text-sm font-bold text-violet-500">{step}</p>
            <h2 className="mt-2 text-xl font-extrabold">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{copy}</p>
          </motion.article>
        ))}
      </section>

      <motion.section id="track" className="surface grid items-center gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_20rem]" {...inView}>
        <div>
          <p className="eyebrow">Tracking</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Follow every handoff.</h2>
          <p className="mt-3 max-w-lg text-muted">
            Paste a tracking number from your label confirmation. Scan updates appear here as the carrier reports them.
          </p>
        </div>
        <TrackForm />
      </motion.section>

      <section id="quote" className="scroll-mt-24">
        <motion.div {...inView}>
          <p className="eyebrow">Get a quote</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Ship with Liora Labs</h2>
          <p className="mt-3 max-w-xl text-muted">
            Fill in every field yourself. Required fields are marked *. Labels once fetched cannot be returned.
          </p>
        </motion.div>
        <div className="mt-8">
          <QuoteForm />
        </div>
      </section>
    </div>
  );
}
