"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export type SavedContactOption = {
  id: string;
  role: "ORIGIN" | "DESTINATION";
  label: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    contactName: string;
    contactPhone?: string;
    companyName?: string;
  };
};

type Focus = "both" | "ORIGIN" | "DESTINATION";

function AddressOption({
  contact,
  active,
  onSelect,
  name,
}: {
  contact: SavedContactOption;
  active: boolean;
  onSelect: () => void;
  name: string;
}) {
  const a = contact.address;
  return (
    <label
      className={`relative flex cursor-pointer gap-3 rounded-2xl border p-4 text-left transition ${
        active ? "border-ocean-500 bg-ocean-50 shadow-soft" : "border-ink/10 bg-white hover:border-ocean-300"
      }`}
    >
      <input type="radio" name={name} className="sr-only" checked={active} onChange={onSelect} />
      <span
        className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
          active ? "border-ocean-500" : "border-ink/20"
        }`}
      >
        {active ? <motion.span layoutId={`${name}-dot`} className="h-2.5 w-2.5 rounded-full bg-ocean-500" /> : null}
      </span>
      <span className="min-w-0 text-sm">
        <span className="block font-bold text-ink">
          {a.contactName}
          {a.companyName ? <span className="font-medium text-muted"> · {a.companyName}</span> : null}
        </span>
        <span className="mt-0.5 block truncate text-muted">
          {a.line1}
          {a.line2 ? `, ${a.line2}` : ""}
        </span>
        <span className="block text-muted">
          {a.city}, {a.state} {a.postalCode}
        </span>
      </span>
    </label>
  );
}

function Column({
  title,
  icon,
  contacts,
  selected,
  onSelect,
  name,
}: {
  title: string;
  icon: string;
  contacts: SavedContactOption[];
  selected: string;
  onSelect: (id: string) => void;
  name: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-ink text-sm text-white">{icon}</span>
        <h3 className="text-lg font-extrabold text-ink">{title}</h3>
        <span className="ml-auto rounded-full bg-ocean-50 px-2 py-0.5 text-xs font-semibold text-ocean-600">
          {contacts.length}
        </span>
      </div>
      <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1">
        {contacts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/15 p-4 text-sm text-muted">
            No saved addresses yet. You’ll type this one below.
          </p>
        ) : (
          <>
            {contacts.map((contact) => (
              <AddressOption
                key={contact.id}
                name={name}
                contact={contact}
                active={selected === contact.id}
                onSelect={() => onSelect(contact.id)}
              />
            ))}
            <label
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-sm transition ${
                selected === "" ? "border-ocean-500 bg-ocean-50" : "border-ink/10 bg-white hover:border-ocean-300"
              }`}
            >
              <input type="radio" name={name} className="sr-only" checked={selected === ""} onChange={() => onSelect("")} />
              <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-ink/20 text-[10px] font-bold">+</span>
              <span className="font-semibold text-ink">Enter a new address</span>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

export function SavedAddressModal({
  open,
  email,
  origins,
  destinations,
  focus,
  initialOriginId,
  initialDestId,
  onApply,
  onClose,
}: {
  open: boolean;
  email: string;
  origins: SavedContactOption[];
  destinations: SavedContactOption[];
  focus: Focus;
  initialOriginId: string;
  initialDestId: string;
  onApply: (originId: string, destId: string) => void;
  onClose: () => void;
}) {
  const [originId, setOriginId] = useState(initialOriginId);
  const [destId, setDestId] = useState(initialDestId);

  useEffect(() => {
    if (!open) return;
    setOriginId(initialOriginId || origins[0]?.id || "");
    setDestId(initialDestId || destinations[0]?.id || "");
  }, [open, initialOriginId, initialDestId, origins, destinations]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const showOrigin = focus !== "DESTINATION";
  const showDest = focus !== "ORIGIN";
  const total = origins.length + destinations.length;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-address-title"
        >
          <motion.div className="absolute inset-0 bg-ocean-900/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-3xl rounded-t-[2rem] bg-paper p-6 shadow-lift sm:rounded-[2rem] sm:p-8"
            initial={{ opacity: 0, y: 60, rotateX: 25, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, rotateX: 15, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            style={{ transformPerspective: 1200 }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-soft hover:bg-ocean-50"
              aria-label="Close"
            >
              ✕
            </button>
            <p className="eyebrow">Welcome back</p>
            <h2 id="saved-address-title" className="mt-2 pr-10 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              We found {total} saved {total === 1 ? "address" : "addresses"}
            </h2>
            <p className="mt-1 truncate text-sm text-muted">
              For <span className="font-semibold text-ink">{email}</span>. Pick where it ships from and to.
            </p>

            <div className={`mt-6 grid gap-6 ${showOrigin && showDest ? "md:grid-cols-2" : ""}`}>
              {showOrigin ? (
                <Column title="Ship from" icon="↑" name="saved-origin" contacts={origins} selected={originId} onSelect={setOriginId} />
              ) : null}
              {showDest ? (
                <Column title="Ship to" icon="↓" name="saved-dest" contacts={destinations} selected={destId} onSelect={setDestId} />
              ) : null}
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" className="btn-secondary" onClick={onClose}>
                I’ll type them myself
              </button>
              <motion.button
                type="button"
                className="btn-primary"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() =>
                  onApply(showOrigin ? originId : initialOriginId, showDest ? destId : initialDestId)
                }
              >
                Use selected
                <span className="btn-arrow">→</span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
