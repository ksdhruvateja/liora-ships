"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useStaffAuth } from "./StaffAuthProvider";

const tabs = [
  { href: "/staff/create", label: "Create Shipment" },
  { href: "/staff/labels", label: "Today's Labels" },
  { href: "/staff/settings", label: "Settings", adminOnly: true },
];

export function StaffShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { role, logout, loading } = useStaffAuth();

  if (loading) {
    return <p className="wrap py-10 text-muted">Checking staff access…</p>;
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-ink/10 bg-white">
        <div className="wrap flex h-16 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{role === "admin" ? "Administrator" : "Employee"}</span>
            <button type="button" className="btn-secondary" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
        <nav className="wrap flex gap-2 overflow-x-auto pb-3">
          {tabs
            .filter((tab) => !tab.adminOnly || role === "admin")
            .map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    active ? "bg-ink text-white" : "bg-paper text-ink hover:bg-ink/5"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
        </nav>
      </header>
      <main className="wrap py-8">{children}</main>
    </div>
  );
}
