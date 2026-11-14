import { NextResponse } from "next/server";
import { createTicket } from "@/server/tickets/service";
import { errorResponse } from "@/server/tickets/http";

export const runtime = "nodejs";

const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v : undefined);

export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "requisicao_invalida" }, { status: 400 });
  const photo = form.get("photo");
  try {
    const created = await createTicket({
      sessionId: str(form.get("sessionId")) ?? "",
      category: str(form.get("category")),
      text: str(form.get("text")),
      transcript: str(form.get("transcript")),
      contact: str(form.get("contact")),
      kind: str(form.get("kind")),
      photo: photo instanceof File ? photo : null,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
