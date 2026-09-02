"use client";

import { MarkupPinModal } from "@/components/MarkupPinModal";
import { useState } from "react";

export function StaffSettingsView() {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-2 text-muted">
          Shipping markup is managed through the secure PIN control in the site footer.
        </p>
      </div>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Open markup settings
      </button>
      <MarkupPinModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
