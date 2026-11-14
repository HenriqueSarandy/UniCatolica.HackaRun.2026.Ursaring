import { NextResponse } from "next/server";
import { getPublicTicket } from "@/server/tickets/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const sessionId = new URL(req.url).searchParams.get("sessionId");
  const ticket = sessionId ? getPublicTicket(id, sessionId) : null;
  if (!ticket) return NextResponse.json({ error: "chamado_inexistente" }, { status: 404 });
  return NextResponse.json(ticket, { headers: { "Cache-Control": "no-store" } });
}
