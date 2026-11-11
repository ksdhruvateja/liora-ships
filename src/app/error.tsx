"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Friendly fallback for unexpected server/page errors (e.g. a database blip). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center text-center">
      <p className="text-lg font-semibold text-ocean-500">Something went wrong</p>
      <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">We hit a bump.</h1>
      <p className="mt-3 text-lg text-muted">
        This page didn’t load. Nothing was charged or changed — please try again.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center rounded-full bg-ocean-500 px-7 font-semibold text-white"
        >
          Try again
        </button>
        <Link href="/" className="btn-secondary h-12 px-7">
          Back home
        </Link>
      </div>
      {error.digest ? <p className="mt-6 text-xs text-muted">Reference: {error.digest}</p> : null}
    </div>
  );
}
