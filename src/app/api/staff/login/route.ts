import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { createStaffSessionToken, staffSessionCookieOptions } from "@/lib/staff-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = getConfig();
  const json = await request.json().catch(() => ({}));
  const password = String(json.password ?? "").trim();
  if (!password) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  let role: "admin" | "employee" | null = null;
  if (config.ADMIN_API_SECRET && password === config.ADMIN_API_SECRET) {
    role = "admin";
  } else if (config.STAFF_API_SECRET && password === config.STAFF_API_SECRET) {
    role = "employee";
  }

  if (!role) {
    return NextResponse.json({ error: "Invalid staff credentials." }, { status: 401 });
  }

  const token = createStaffSessionToken(role);
  const response = NextResponse.json({ role });
  const cookie = staffSessionCookieOptions(token);
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  return response;
}
