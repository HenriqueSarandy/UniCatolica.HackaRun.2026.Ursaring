import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, logMessage } from "@/server/db/sessions";
import { handleChat } from "@/server/orchestrator";
import { allow } from "@/server/rateLimit";

export const runtime = "nodejs";
const Body = z.object({
  sessionId: z.string().max(100),
  message: z.string().max(500).optional(),
  quickReplyId: z.string().max(100).optional(),
  storeId: z.string().max(100).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });
  const body = parsed.data;

  const session = getSession(body.sessionId);
  if (!session) return NextResponse.json({ error: "sessao_invalida" }, { status: 404 });
  if (!allow(session.id)) return NextResponse.json({ error: "muitas_requisicoes" }, { status: 429 });

  try {
    const userText = body.message
      ?? (body.quickReplyId ? `[botão] ${body.quickReplyId}` : body.storeId ? `[loja] ${body.storeId}` : null);
    const res = await handleChat(session, body);
    if (userText) logMessage(session.id, "user", userText);
    for (const m of res.messages) logMessage(session.id, "bot", m.text);
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({ error: "erro_interno" }, { status: 500 });
  }
}
