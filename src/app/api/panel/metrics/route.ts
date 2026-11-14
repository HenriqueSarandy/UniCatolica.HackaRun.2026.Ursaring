import { NextResponse } from "next/server";
import { getMetrics } from "@/server/tickets/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** `?days=7` limita aos últimos N dias (padrão: tudo). */
export async function GET(req: Request) {
  const days = Number(new URL(req.url).searchParams.get("days"));
  const since = Number.isFinite(days) && days > 0 ? new Date(Date.now() - days * 86_400_000).toISOString() : undefined;
  return NextResponse.json(getMetrics(since), { headers: { "Cache-Control": "no-store" } });
}
