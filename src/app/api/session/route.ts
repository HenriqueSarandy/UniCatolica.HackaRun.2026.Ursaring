import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession } from "@/server/db/sessions";
import { getPointName } from "@/server/maps/service";
import type { SessionResponse } from "@/types/contracts";

export const runtime = "nodejs";
const DEFAULT_POINT = "entrada-principal";
const Body = z.object({ pointId: z.string().max(100) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });

  // QR desconhecido não pode quebrar a experiência: cai na entrada principal.
  let pointId = parsed.data.pointId;
  let name = getPointName(pointId);
  if (!name) {
    pointId = DEFAULT_POINT;
    name = getPointName(pointId) ?? "Entrada Principal";
  }

  const s = createSession(pointId);
  const body: SessionResponse = { sessionId: s.id, point: { id: pointId, name } };
  return NextResponse.json(body);
}
