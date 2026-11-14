import { NextResponse } from "next/server";
import { z } from "zod";
import { searchStores } from "@/server/maps/service";

export const runtime = "nodejs";
const Query = z.object({ q: z.string().max(100).default("") });

export async function GET(req: Request) {
  const parsed = Query.safeParse({ q: new URL(req.url).searchParams.get("q") ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });
  return NextResponse.json(searchStores(parsed.data.q, 8), { headers: { "Cache-Control": "no-store" } });
}
