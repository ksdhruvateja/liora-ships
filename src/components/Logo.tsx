import Link from "next/link";

const NAVY = "#0c1a33";
const BLUE = "#0446f5";
const LIME = "#a8ec3a";

/** Liora hexagon mark (vector rebuild of the brand logo). */
export function LogoMark({ className = "h-10 w-10", navy = NAVY }: { className?: string; navy?: string }) {
  return (
    <svg viewBox="60 45 655 705" className={className} aria-hidden="true">
      <g strokeLinejoin="round" strokeWidth="22">
        <polygon points="380,64 694,238 694,546 380,731 82,557 82,246" fill={navy} stroke={navy} />
        <polygon points="250,142 380,64 694,238 694,410 545,495 380,405 380,225" fill={BLUE} stroke={BLUE} strokeWidth="6" />
        <polygon points="255,150 380,227 380,405 545,495 420,566 258,483" fill="#ffffff" stroke="#ffffff" strokeWidth="10" />
        <polygon points="545,495 694,410 694,546 668,566" fill={LIME} stroke={LIME} strokeWidth="6" />
      </g>
    </svg>
  );
}

/** "liora" wordmark with the lime leaf over the i. */
export function LogoWordmark({ className = "h-7 w-auto", color = NAVY }: { className?: string; color?: string }) {
  return (
    <svg viewBox="775 175 1175 440" className={className} aria-hidden="true">
      <g fill={color}>
        <path d="M833 185 H873 V490 Q873 525 900 527 V605 H860 Q783 605 783 520 V235 Q783 185 833 185Z" />
        <path d="M965 283 H1005 V605 H918 V330 Q918 283 965 283Z" />
        <path fillRule="evenodd" d="M1202 270 a174 174 0 1 1 0 348 a174 174 0 1 1 0 -348Z M1202 352 a91 91 0 1 0 0 182 a91 91 0 1 0 0 -182Z" />
        <path d="M1395 605 V420 Q1395 280 1540 279 H1600 V330 Q1600 358 1575 360 H1545 Q1483 362 1483 430 V605 Z" />
        <path fillRule="evenodd" d="M1760 270 a174 174 0 1 1 0 348 a174 174 0 1 1 0 -348Z M1760 352 a91 91 0 1 0 0 182 a91 91 0 1 0 0 -182Z" />
        <rect x="1852" y="443" width="88" height="162" />
      </g>
      <path d="M917 263 V235 Q917 185 975 183 H1017 V215 Q1017 263 965 265 Z" fill={LIME} />
    </svg>
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center gap-2.5" aria-label="Liora Labs Shipping — home">
      <LogoMark className="h-10 w-10 sm:h-11 sm:w-11" navy={light ? "#1d2f55" : NAVY} />
      <LogoWordmark className="h-7 w-auto sm:h-8" color={light ? "#ffffff" : NAVY} />
    </Link>
  );
}
