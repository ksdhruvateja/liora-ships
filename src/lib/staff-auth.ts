import { NextResponse } from "next/server";
import { staffRoleFromRequest } from "./staff-session";

export type StaffRole = "employee" | "admin";

export function getStaffRole(request: Request): StaffRole | null {
  return staffRoleFromRequest(request);
}

export function requireStaff(request: Request, minimum: StaffRole = "employee") {
  const role = getStaffRole(request);
  if (!role) {
    return { error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  if (minimum === "admin" && role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { role };
}
