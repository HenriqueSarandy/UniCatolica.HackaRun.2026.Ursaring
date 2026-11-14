import { NextResponse } from "next/server";
import { z } from "zod";
import { rateTicket, reopenTicket, getPublicTicket } from "@/server/tickets/service";
import { errorResponse } from "@/server/tickets/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  sessionId: z.string().min(1).max(100),
  resolved: z.boolean(),
  rating: z.number().int().min(1).max(5).optional(),
  text: z.string().trim().max(1000).optional(),
});

/** Visitante confirma se resolveu. `resolved=false` reabre o chamado (1×, até 24 h). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });
  const { id } = await ctx.params;
  const { sessionId, resolved, rating, text } = parsed.data;
  try {
    if (resolved) {
      if (rating) rateTicket(id, sessionId, rating, text);
    } else {
      reopenTicket(id, sessionId, text);
    }
    return NextResponse.json(getPublicTicket(id, sessionId), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return errorResponse(e);
  }
}
