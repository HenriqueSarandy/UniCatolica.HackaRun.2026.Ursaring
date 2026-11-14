import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/server/tickets/auth";
import { assumeTicket, closeTicket } from "@/server/tickets/service";
import { errorResponse } from "@/server/tickets/http";

export const runtime = "nodejs";
const Body = z.object({
  action: z.enum(["assumir", "concluir"]),
  staffName: z.string().trim().min(1).max(60),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireStaff(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });
  const { id } = await ctx.params;
  try {
    const { action, staffName } = parsed.data;
    const row = action === "assumir" ? assumeTicket(id, staffName) : closeTicket(id, staffName);
    return NextResponse.json({ id: row.id, status: row.status, assignedTo: row.assigned_to });
  } catch (e) {
    return errorResponse(e);
  }
}
