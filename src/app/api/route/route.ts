import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoute } from "@/server/maps/service";

export const runtime = "nodejs";
const Query = z.object({ from: z.string().min(1).max(100), to: z.string().min(1).max(100) });

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const parsed = Query.safeParse({ from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });

  const map = getRoute(parsed.data.from, parsed.data.to);
  if (!map) return NextResponse.json({ error: "rota_nao_encontrada" }, { status: 404 });
  return NextResponse.json(map, { headers: { "Cache-Control": "no-store" } });
}
