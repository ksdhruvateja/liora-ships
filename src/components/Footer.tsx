import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer() {
  return (
    <footer className="mt-20 bg-ink text-white">
      <div className="wrap grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/60">
            Rates, payment, and labels in one place. Built for people who need cargo to move without extra steps.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Explore</p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-white/75">
            <Link href="/#services" className="hover:text-white">Services</Link>
            <Link href="/#how" className="hover:text-white">How it works</Link>
            <Link href="/#quote" className="hover:text-white">Get a rate</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">Ship</p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-white/75">
            <Link href="/#quote" className="hover:text-white">Create a shipment</Link>
            <Link href="/#track" className="hover:text-white">Track a package</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="wrap py-5 text-sm text-white/45">
          © {new Date().getFullYear()} Liora Labs Shipping. Labels once fetched cannot be returned.
        </p>
      </div>
    </footer>
  );
}
