"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { TrackForm } from "@/components/TrackForm";
import { GlassMark } from "@/components/GlassMark";
import { HeroShowcase } from "@/components/HeroShowcase";
import { HangingContainer } from "@/components/three/HangingContainer";
import { RouteGlobe } from "@/components/three/RouteGlobe";
import { TiltCard } from "@/components/three/TiltCard";
import { photos } from "@/lib/photos";
import { Faq, SavedAddressDemo, Stats } from "@/components/HomeSections";
import { TrackingJourney } from "@/components/TrackingJourney";


const spring = { type: "spring" as const, stiffness: 110, damping: 20 };

const reveal = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] as const },
};

/* ---------- 1. Hero with scroll-zooming photo ---------- */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const scale = useTransform(scrollYProgress, [0, 0.6], [0.78, 1]);
  const radius = useTransform(scrollYProgress, [0, 0.6], [48, 0]);
  const textOpacity = useTransform(scrollYProgress, [0.35, 0.65], [0, 1]);
  const textY = useTransform(scrollYProgress, [0.35, 0.65], [40, 0]);
  // Floating glass cards: drift apart with depth, then clear out before the headline.
  const cardsOpacity = useTransform(scrollYProgress, [0.22, 0.38], [1, 0]);
  const rateY = useTransform(scrollYProgress, [0, 0.4], [0, -120]);
  const trackY = useTransform(scrollYProgress, [0, 0.4], [0, 90]);

  return (
    <section>
      <HeroShowcase />

      <div ref={ref} className="full-bleed relative h-[180vh]">
        <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          <motion.div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#1c2a4a] to-ink" style={{ scale, borderRadius: radius }}>
            <Image src={photos.heroJet} alt="Cargo jet on the runway at sunset" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <motion.div
              className="absolute inset-x-0 bottom-[12%] px-6 text-center text-white"
              style={{ opacity: textOpacity, y: textY }}
            >
              <p className="text-4xl font-bold tracking-[-0.03em] sm:text-6xl">Quote. Pay. Print.</p>
              <p className="mt-3 text-lg text-white/75 sm:text-xl">One flow. Minutes, not hours.</p>
            </motion.div>
          </motion.div>
          {/* Live rate card */}
          <motion.div
            className="pointer-events-none absolute left-[6%] top-[16%] sm:left-[12%] sm:top-[20%]"
            style={{ y: rateY, opacity: cardsOpacity }}
            aria-hidden="true"
          >
            <motion.div
              className="w-56 rounded-3xl border border-white/40 bg-white/75 p-4 shadow-[0_30px_60px_-20px_rgba(12,26,51,0.55)] backdrop-blur-xl sm:w-64 sm:p-5"
              initial={{ opacity: 0, y: 30, rotateX: 20 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.6, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformPerspective: 800 }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Live rate</p>
                <span className="rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold text-ink">Best price</span>
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold text-ocean-500">UPS</p>
                  <p className="text-base font-bold text-ink">Ground</p>
                  <p className="text-xs text-muted">2–4 business days</p>
                </div>
                <p className="text-3xl font-bold tracking-tight text-ink">$9.44</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Live tracking card */}
          <motion.div
            className="pointer-events-none absolute bottom-[18%] right-[6%] sm:bottom-[22%] sm:right-[12%]"
            style={{ y: trackY, opacity: cardsOpacity }}
            aria-hidden="true"
          >
            <motion.div
              className="w-60 rounded-3xl border border-white/15 bg-ink/70 p-4 text-white shadow-[0_30px_60px_-20px_rgba(4,70,245,0.6)] backdrop-blur-xl sm:w-72 sm:p-5"
              initial={{ opacity: 0, y: 30, rotateX: -20 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{ delay: 0.85, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformPerspective: 800 }}
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-400" />
                </span>
                <p className="text-sm font-semibold">In transit</p>
                <p className="ml-auto text-xs text-white/50">FZ7K29QX</p>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-white/70">
                <span>San Francisco</span>
                <span>New York</span>
              </div>
              <div className="relative mt-2 h-1.5 rounded-full bg-white/15">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-ocean-400 to-lime-400"
                  initial={{ width: "8%" }}
                  animate={{ width: "64%" }}
                  transition={{ delay: 1.2, duration: 2.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
              <p className="mt-3 text-xs text-white/50">Arriving Thursday</p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 2. Sticky storytelling: Compare. Ship. Save. ---------- */
type StoryBeat = {
  word: string;
  eyebrow: string;
  line: string;
  img: string;
  alt: string;
};

const story: StoryBeat[] = [
  {
    word: "Compare.",
    eyebrow: "01 · Compare",
    line: "Every major carrier. One place. The best rates, without the guesswork.",
    img: photos.compareRates,
    alt: "Laptop comparing figures and charts side by side",
  },
  {
    word: "Ship.",
    eyebrow: "02 · Ship",
    line: "From one parcel to thousands. Book, manage and ship with ease.",
    img: photos.handoff,
    alt: "A parcel being handed over for shipping",
  },
  {
    word: "Save.",
    eyebrow: "03 · Save",
    line: "Better rates. Full transparency. No hidden surprises.",
    img: photos.savingsGrowth,
    alt: "A young plant growing from a pile of coins",
  },
];

function StoryWord({ progress, index, word }: { progress: MotionValue<number>; index: number; word: string }) {
  const start = index / story.length;
  const end = (index + 1) / story.length;
  const first = index === 0;
  const last = index === story.length - 1;
  const lerp = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
  // Function transforms (not keyframe arrays) so motion computes these in JS: the
  // hardware scroll-timeline path mis-maps very short keyframe segments.
  const opacity = useTransform(progress, (v) => {
    const fadeIn = first ? 1 : lerp(v, start - 0.08, start + 0.05);
    const fadeOut = last ? 0 : lerp(v, end - 0.05, end + 0.08);
    const lit = Math.min(fadeIn, 1 - fadeOut);
    return 0.15 + 0.85 * lit;
  });
  const x = useTransform(progress, (v) => (first ? 0 : 16 * (1 - lerp(v, start - 0.08, start + 0.05))));
  return (
    <motion.p
      style={{ opacity, x }}
      className="text-5xl font-bold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-8xl"
    >
      {word}
    </motion.p>
  );
}

function Story() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const [active, setActive] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setActive(Math.min(story.length - 1, Math.max(0, Math.floor(v * story.length))));
  });
  const beat = story[active];

  return (
    <section id="how" ref={ref} className="full-bleed relative h-[300vh] bg-black" aria-label="How Liora works">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="pointer-events-none absolute right-[-10%] top-1/4 h-[60vh] w-[50vw] rounded-full bg-ocean-500/15 blur-[120px]" />
        <div className="wrap relative grid w-full items-center gap-6 pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 lg:pt-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,32rem)]">
          <div className="flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={`eyebrow-${active}`}
                className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-lime-400 lg:mb-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {beat.eyebrow}
              </motion.p>
            </AnimatePresence>
            <div className="space-y-1">
              {story.map((item, index) => (
                <StoryWord key={item.word} progress={scrollYProgress} index={index} word={item.word} />
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={`line-${active}`}
                className="max-w-md pt-4 text-lg leading-relaxed text-white/65 lg:min-h-[5.5rem] lg:pt-6 lg:text-xl"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {beat.line}
              </motion.p>
            </AnimatePresence>

            {/* progress rail: one segment per beat */}
            <div className="mt-5 flex max-w-md items-center gap-3 lg:mt-8" aria-hidden="true">
              <span className="text-xs font-semibold tabular-nums text-white/50">0{active + 1}</span>
              <div className="flex flex-1 gap-1.5">
                {story.map((_, i) => (
                  <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                    <span
                      className={`block h-full rounded-full bg-lime-400 transition-[width] duration-700 ease-out ${i <= active ? "w-full" : "w-0"}`}
                    />
                  </span>
                ))}
              </div>
              <span className="text-xs font-semibold tabular-nums text-white/30">0{story.length}</span>
            </div>
          </div>

          {/* Photo: height-capped on small screens so the whole beat fits one screen. */}
          <div
            className="relative aspect-[4/5] w-[min(100%,calc(36svh*0.8))] justify-self-center lg:w-full lg:max-h-[78svh] lg:justify-self-end"
            style={{ perspective: 1400 }}
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={active}
                className="absolute inset-0 overflow-hidden rounded-[2rem] shadow-[0_60px_120px_-40px_rgba(4,70,245,0.6)] lg:rounded-[2.5rem]"
                initial={{ opacity: 0, rotateY: 35, scale: 0.85, x: 80 }}
                animate={{ opacity: 1, rotateY: 0, scale: 1, x: 0 }}
                exit={{ opacity: 0, rotateY: -35, scale: 0.85, x: -80 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image src={beat.img} alt={beat.alt} fill sizes="(min-width:1024px) 40vw, 80vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 3. Bento tiles ---------- */
/** Shared tile height so every tile in a row lines up exactly. */
const TILE_H = "h-[26rem] sm:h-[30rem] lg:h-[34rem]";

function PhotoTile({
  img,
  index,
  title,
  sub,
  delay = 0,
  href = "/quote",
}: {
  img: string;
  index: string;
  title: string;
  sub: string;
  delay?: number;
  href?: string;
}) {
  return (
    <motion.div {...reveal} transition={{ ...reveal.transition, delay }} className={TILE_H}>
      <TiltCard className="group h-full overflow-hidden rounded-[2rem] shadow-lift" max={6}>
        <Link href={href} className="relative flex h-full flex-col justify-between p-7 text-white sm:p-8">
          {/* Decorative: the heading below already names the service. */}
          <Image
            src={img}
            alt=""
            fill
            sizes="(min-width:768px) 33vw, 100vw"
            className="-z-10 object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-110"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/60 via-black/5 to-black/60" />

          <div style={{ transform: "translateZ(40px)" }}>
            <p className="text-sm font-semibold tracking-widest text-lime-400">{index}</p>
            <h3 className="mt-2 text-4xl font-bold tracking-[-0.03em] lg:text-5xl">{title}</h3>
            <p className="mt-2 text-lg text-white/80">{sub}</p>
          </div>

          <span
            className="inline-flex h-11 w-fit items-center gap-1 rounded-full bg-white/15 px-5 text-sm font-semibold backdrop-blur-md transition group-hover:bg-white group-hover:text-ink"
            style={{ transform: "translateZ(30px)" }}
          >
            Get a quote <span className="transition-transform group-hover:translate-x-0.5">›</span>
          </span>
        </Link>
      </TiltCard>
    </motion.div>
  );
}

function Bento() {
  return (
    <section id="services" className="space-y-5">
      <motion.h2 {...reveal} className="pb-6 text-center text-5xl font-bold tracking-[-0.04em] sm:text-7xl">
        Every way to ship.
      </motion.h2>

      {/* Row 1 — three equal service tiles */}
      <div className="grid gap-5 md:grid-cols-3">
        <PhotoTile img={photos.truckSunset} index="01" title="Ground." sub="Door to door." />
        <PhotoTile img={photos.planeWing} index="02" title="Express." sub="When it can’t wait." delay={0.08} />
        <PhotoTile img={photos.containerShip} index="03" title="Freight." sub="Big loads. Same flow." delay={0.16} />
      </div>

      {/* Row 2 — same grid: wide globe tile (2 cols) + size tile (1 col), equal height */}
      <div className="grid gap-5 md:grid-cols-3">
        <motion.div
          {...reveal}
          className={`flex flex-col overflow-hidden rounded-[2rem] bg-ink p-7 text-white sm:p-8 md:col-span-2 ${TILE_H}`}
        >
          <div>
            <p className="text-sm font-semibold tracking-widest text-lime-400">04</p>
            <h3 className="mt-2 text-4xl font-bold tracking-[-0.03em] lg:text-5xl">Coast to coast.</h3>
            <p className="mt-2 text-lg text-white/60">All 50 states. Live.</p>
          </div>
          <div className="relative -mb-4 mt-2 min-h-0 flex-1">
            <div className="absolute inset-0 mx-auto aspect-square max-w-full">
              <RouteGlobe />
            </div>
          </div>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.08 }}
          className={`flex flex-col overflow-hidden rounded-[2rem] bg-gradient-to-b from-white to-mist p-7 sm:p-8 ${TILE_H}`}
        >
          <div>
            <p className="text-sm font-semibold tracking-widest text-ocean-500">05</p>
            <h3 className="mt-2 text-4xl font-bold tracking-[-0.03em] lg:text-5xl">Any size.</h3>
            <p className="mt-2 text-lg text-muted">Envelope to pallet.</p>
          </div>
          <div className="flex min-h-0 flex-1 items-end justify-center">
            <div className="origin-bottom scale-[0.8] lg:scale-90">
              <HangingContainer width={240} />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- 4. Horizontal gallery ---------- */
const gallery = [
  { img: photos.courierScooter, cap: "On its way." },
  { img: photos.forklift, cap: "Sorted." },
  { img: photos.orangeContainers, cap: "Stacked." },
  { img: photos.containersAerial, cap: "Loaded." },
  { img: photos.driver, cap: "On the road." },
  { img: photos.docksAerial, cap: "Docked." },
];

function Gallery() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["0%", "-72%"]);

  return (
    <section ref={ref} className="full-bleed relative h-[260vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <h2 className="wrap pb-10 text-5xl font-bold tracking-[-0.04em] sm:text-7xl">
          Every handoff.
          <br />
          <span className="text-muted/60">Seen.</span>
        </h2>
        <motion.div style={{ x }} className="flex gap-6 pl-[max(1.25rem,calc((100vw-72rem)/2+2rem))]">
          {gallery.map((item, index) => (
            <motion.figure
              key={item.cap}
              className="relative h-[52vh] w-[78vw] shrink-0 overflow-hidden rounded-[2rem] sm:w-[44vw] lg:w-[34vw]"
              whileHover={{ scale: 0.98 }}
            >
              <Image src={item.img} alt={item.cap} fill sizes="40vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <figcaption className="absolute bottom-6 left-6 text-3xl font-bold tracking-tight text-white">
                <span className="mr-3 text-base font-semibold text-lime-400">0{index + 1}</span>
                {item.cap}
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- 5. Track + final CTA ---------- */
function TrackAndCta() {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <motion.div id="track" {...reveal} className="relative min-h-[28rem] overflow-hidden rounded-[2rem]">
        <Image src={photos.cityNight} alt="City at night" fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="relative flex h-full flex-col items-center justify-center p-8 text-center text-white">
          <h3 className="text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Where’s my parcel?</h3>
          <div className="mt-8 w-full max-w-sm">
            <TrackForm />
          </div>
        </div>
      </motion.div>
      <motion.div {...reveal} className="relative flex min-h-[28rem] flex-col items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-ocean-500 to-ocean-900 p-8 text-center text-white">
        <GlassMark size={120} />
        <h3 className="mt-10 text-4xl font-bold tracking-[-0.03em] sm:text-5xl">Ready when you are.</h3>
        <div className="mt-6">
          <motion.a
            href="/quote"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex h-12 items-center rounded-full bg-lime-400 px-7 font-semibold text-ink"
          >
            Get a quote
          </motion.a>
        </div>
      </motion.div>
    </section>
  );
}

export function HomeExperience() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <Hero />
      <Stats />
      <Story />
      <Bento />
      <TrackingJourney />
      <SavedAddressDemo />
      <Gallery />
      <Faq />
      <TrackAndCta />
    </div>
  );
}
