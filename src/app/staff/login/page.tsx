import { StaffLoginForm } from "@/components/staff/StaffLoginForm";

export const metadata = {
  title: "Staff sign in",
};

export default function StaffLoginPage() {
  return (
    <div className="wrap py-16">
      <StaffLoginForm />
    </div>
  );
}
