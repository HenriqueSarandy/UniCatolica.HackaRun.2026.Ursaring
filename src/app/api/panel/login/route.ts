import { NextResponse } from "next/server";
import { z } from "zod";
import { allow } from "@/server/rateLimit";
import {
  STAFF_COOKIE, STAFF_TTL_SECONDS, panelPasswordConfigured, signToken, verifyPassword,
} from "@/server/tickets/auth";

export const runtime = "nodejs";
const Body = z.object({ password: z.string().max(200) });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(`login:${ip}`, 10)) {
    return NextResponse.json({ error: "muitas_requisicoes" }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  await sleep(500); // atraso fixo contra força bruta
  if (!parsed.success) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });

  const token = panelPasswordConfigured() && verifyPassword(parsed.data.password) ? signToken() : null;
  if (!token) return NextResponse.json({ error: "senha_invalida" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STAFF_TTL_SECONDS,
  });
  return res;
}
