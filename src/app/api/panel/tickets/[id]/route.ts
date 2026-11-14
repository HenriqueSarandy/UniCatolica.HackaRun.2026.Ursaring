import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addNote, assumeTicket, closeTicket, escalateTicket, transferTicket,
} from "@/server/tickets/service";
import { errorResponse } from "@/server/tickets/http";

export const runtime = "nodejs";

const staffName = z.string().trim().min(1).max(60);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("assumir"), staffName }),
  z.object({
    action: z.literal("concluir"), staffName,
    resolutionCode: z.enum(["resolvido", "encaminhado", "nao_localizado", "improcedente"]).optional(),
    note: z.string().trim().max(1000).optional(),
  }),
  z.object({ action: z.literal("recusar"), staffName, reason: z.string().trim().min(3).max(1000) }),
  z.object({ action: z.literal("nota"), staffName, note: z.string().trim().min(1).max(1000) }),
  z.object({ action: z.literal("escalar"), staffName }),
  z.object({ action: z.literal("transferir"), staffName, team: z.enum(["seguranca", "sac", "manutencao", "limpeza"]) }),
]);

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });
  const { id } = await ctx.params;
  try {
    const b = parsed.data;
    const row =
      b.action === "assumir" ? assumeTicket(id, b.staffName)
      : b.action === "concluir" ? closeTicket(id, b.staffName, { code: b.resolutionCode, note: b.note })
      : b.action === "recusar" ? closeTicket(id, b.staffName, { code: "improcedente", note: b.reason })
      : b.action === "nota" ? addNote(id, b.staffName, b.note)
      : b.action === "escalar" ? escalateTicket(id, b.staffName, "escalado pela equipe")
      : transferTicket(id, b.staffName, b.team);
    return NextResponse.json({ id: row.id, status: row.status, assignedTo: row.assigned_to });
  } catch (e) {
    return errorResponse(e);
  }
}
