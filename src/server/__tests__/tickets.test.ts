import { describe, expect, it } from "vitest";
import { createSession } from "@/server/db/sessions";
import { categorize } from "@/server/tickets/categorize";
import { sniffImage } from "@/server/tickets/uploads";
import { signToken, verifyPassword, verifyToken, STAFF_TTL_SECONDS } from "@/server/tickets/auth";
import {
  assumeTicket, closeTicket, createTicket, getPublicTicket, listTickets, TicketError,
} from "@/server/tickets/service";

describe("categorize", () => {
  it("infere categoria por palavras-chave", () => {
    expect(categorize("perdi meu carro no estacionamento").category).toBe("carro");
    expect(categorize("Esqueci minha bolsa").category).toBe("objeto_perdido");
    expect(categorize("acabou o papel").category).toBe("banheiro");
    expect(categorize("oi").category).toBe("outro");
  });
  it("prioridade alta para emergência e cadeira de rodas", () => {
    expect(categorize("socorro, ele desmaiou").priority).toBe("alta");
    expect(categorize("preciso de uma cadeira de rodas")).toEqual({ category: "cadeira_de_rodas", priority: "alta" });
    expect(categorize("preciso de EMERGÊNCIA").priority).toBe("alta");
    expect(categorize("só uma dúvida").priority).toBe("normal");
  });
  it("respeita categoria informada", () => {
    expect(categorize("carro", "banheiro").category).toBe("banheiro");
  });
});

describe("magic bytes", () => {
  it("reconhece jpeg, png e webp", () => {
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.ext).toBe("jpg");
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")]);
    expect(sniffImage(webp)?.ext).toBe("webp");
  });
  it("rejeita outros conteúdos", () => {
    expect(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImage(new Uint8Array([]))).toBeNull();
  });
});

describe("auth", () => {
  it("compara a senha", () => {
    expect(verifyPassword("senha-de-teste")).toBe(true);
    expect(verifyPassword("errada")).toBe(false);
  });
  it("valida token, expiração e adulteração", () => {
    const t0 = 1_700_000_000_000;
    const token = signToken(t0)!;
    expect(verifyToken(token, t0 + 1000)).toBe(true);
    expect(verifyToken(token, t0 + STAFF_TTL_SECONDS * 1000 + 1)).toBe(false);
    const [payload, sig] = token.split(".");
    expect(verifyToken(`${Number(payload) + 99999999}.${sig}`, t0)).toBe(false);
    expect(verifyToken(undefined)).toBe(false);
  });
});

describe("tickets", () => {
  it("cria, valida e aplica transições", async () => {
    const s = createSession("entrada-principal");
    await expect(createTicket({ sessionId: s.id })).rejects.toMatchObject({ status: 400 });
    await expect(createTicket({ sessionId: "nao-existe", text: "oi" })).rejects.toMatchObject({ status: 404 });
    await expect(createTicket({ sessionId: s.id, text: "x".repeat(1001) })).rejects.toMatchObject({ status: 400 });

    const c = await createTicket({ sessionId: s.id, text: "perdi meu carro" });
    expect(c.ticketId).toMatch(/^BO-[A-Z2-7]{4}$/);
    expect(c.etaMinutes).toBe(5);

    expect(getPublicTicket(c.ticketId, "outra-sessao")).toBeNull();
    expect(getPublicTicket(c.ticketId, s.id)?.status).toBe("novo");

    assumeTicket(c.ticketId, "Marcos");
    expect(getPublicTicket(c.ticketId, s.id)).toMatchObject({ status: "assumido", assignedTo: "Marcos" });
    expect(() => assumeTicket(c.ticketId, "Ana")).toThrowError(TicketError);
    try { assumeTicket(c.ticketId, "Ana"); } catch (e) {
      expect((e as TicketError).status).toBe(409);
      expect((e as TicketError).extra).toMatchObject({ assignedTo: "Marcos" });
    }

    closeTicket(c.ticketId, "Marcos");
    expect(getPublicTicket(c.ticketId, s.id)?.status).toBe("concluido");
    expect(listTickets(["novo", "assumido"]).some((t) => t.id === c.ticketId)).toBe(false);
  });

  it("categoria falar_com_pessoa dispensa texto; prioridade alta tem ETA 3", async () => {
    const s = createSession("entrada-principal");
    const a = await createTicket({ sessionId: s.id, category: "falar_com_pessoa" });
    expect(a.status).toBe("novo");
    const b = await createTicket({ sessionId: s.id, text: "socorro" });
    expect(b.etaMinutes).toBe(3);
    const list = listTickets();
    expect(list.findIndex((t) => t.id === b.ticketId)).toBeLessThan(list.findIndex((t) => t.id === a.ticketId));
  });

  it("rejeita foto com tipo inválido e limita 5 chamados por hora", async () => {
    const s = createSession("entrada-principal");
    const fake = new File(["<html></html>"], "x.jpg", { type: "image/jpeg" });
    await expect(createTicket({ sessionId: s.id, photo: fake })).rejects.toMatchObject({ status: 415 });
    for (let i = 0; i < 5; i++) await createTicket({ sessionId: s.id, text: `chamado ${i}` });
    await expect(createTicket({ sessionId: s.id, text: "sexto" })).rejects.toMatchObject({ status: 429 });
  });
});
