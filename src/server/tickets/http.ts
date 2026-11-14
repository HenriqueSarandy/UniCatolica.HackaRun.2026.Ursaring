import { NextResponse } from "next/server";
import { TicketError } from "./service";
import { UploadError } from "./uploads";

/** Converte erros do domínio em respostas JSON `{ error }`. */
export function errorResponse(e: unknown): NextResponse {
  if (e instanceof TicketError) {
    return NextResponse.json({ error: e.code, ...(e.extra ?? {}) }, { status: e.status });
  }
  if (e instanceof UploadError) {
    return NextResponse.json({ error: e.code }, { status: e.status });
  }
  console.error("[tickets]", e);
  return NextResponse.json({ error: "erro_interno" }, { status: 500 });
}
