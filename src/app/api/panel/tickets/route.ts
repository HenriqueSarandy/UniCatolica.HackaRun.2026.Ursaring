import { NextResponse } from "next/server";
import { requireStaff } from "@/server/tickets/auth";
import { listTickets } from "@/server/tickets/service";
import type { TicketStatus } from "@/types/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireStaff(req);
  if (denied) return denied;
  const raw = new URL(req.url).searchParams.get("status");
  const statuses = raw ? (raw.split(",").map((s) => s.trim()) as TicketStatus[]) : undefined;
  return NextResponse.json(
    { tickets: listTickets(statuses) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
