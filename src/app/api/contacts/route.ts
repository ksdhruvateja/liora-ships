import { NextResponse } from "next/server";
import { z } from "zod";
import { listSavedContacts } from "@/lib/contacts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const email = new URL(request.url).searchParams.get("email") ?? "";
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) {
    return NextResponse.json({ contacts: [] });
  }
  const contacts = await listSavedContacts(parsed.data);
  return NextResponse.json({ contacts });
}
