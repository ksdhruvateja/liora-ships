"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";

export function TrackForm() {
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      className="flex w-full items-center gap-2 rounded-full bg-white p-1.5 shadow-soft"
      onSubmit={(event) => {
        event.preventDefault();
        const tracking = value.trim();
        if (tracking) router.push(`/track/${encodeURIComponent(tracking)}`);
      }}
    >
      <input
        className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-ink outline-none placeholder:text-muted"
        placeholder="Track your shipment"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label="Tracking number"
      />
      <motion.button
        type="submit"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.92 }}
      >
        <span className="sr-only">Track</span>
        →
      </motion.button>
    </form>
  );
}
