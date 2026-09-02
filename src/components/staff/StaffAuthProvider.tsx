"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { StaffRole } from "@/lib/staff-auth";

type StaffSession = {
  authenticated: boolean;
  role: StaffRole | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const StaffAuthContext = createContext<StaffSession>({
  authenticated: false,
  role: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
});

export function StaffAuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<StaffRole | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/staff/session", { credentials: "include" });
      if (!response.ok) {
        setRole(null);
        return;
      }
      const data = await response.json();
      setRole(data.role ?? null);
    } catch {
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/staff/logout", { method: "POST", credentials: "include" });
    setRole(null);
    router.push("/staff/login");
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    if (pathname === "/staff/login") return;
    if (!role) router.replace("/staff/login");
  }, [loading, role, pathname, router]);

  const value = useMemo(
    () => ({
      authenticated: Boolean(role),
      role,
      loading,
      refresh,
      logout,
    }),
    [role, loading, refresh, logout],
  );

  return <StaffAuthContext.Provider value={value}>{children}</StaffAuthContext.Provider>;
}

export function useStaffAuth() {
  return useContext(StaffAuthContext);
}
