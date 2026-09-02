import { StaffAuthProvider } from "@/components/staff/StaffAuthProvider";
import { StaffShell } from "@/components/staff/StaffShell";

export default function StaffDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <StaffAuthProvider>
      <StaffShell>{children}</StaffShell>
    </StaffAuthProvider>
  );
}
