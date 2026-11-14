import { describe, expect, it } from "vitest";
import { createSession } from "@/server/db/sessions";
import { categorize } from "@/server/tickets/categorize";
import { sniffImage } from "@/server/tickets/uploads";
import { getMetrics } from "@/server/tickets/metrics";
import {
  addNote, assumeTicket, closeTicket, createTicket, escalateTicket, getPublicTicket, listTickets,
  rateTicket, reopenTicket, TicketError, transferTicket,
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
    expect(categorize("preciso de uma cadeira de rodas")).toMatchObject({ category: "cadeira_de_rodas", priority: "alta" });
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

describe("resolução, feedback e reabertura", () => {
  it("categoriza reclamação e setor", () => {
    expect(categorize("o atendimento foi péssimo")).toMatchObject({ kind: "reclamacao", priority: "normal", team: "sac" });
    expect(categorize("perdi meu carro")).toMatchObject({ kind: "ajuda", team: "seguranca" });
    expect(categorize("banheiro sem papel")).toMatchObject({ team: "limpeza" });
  });

  it("conclui com nota, avalia e reabre uma única vez só na mesma sessão", async () => {
    const s = createSession("entrada-principal");
    const c = await createTicket({ sessionId: s.id, text: "perdi um objeto" });
    expect(() => rateTicket(c.ticketId, s.id, 5)).toThrowError(TicketError); // ainda não concluído
    closeTicket(c.ticketId, "Marcos", { code: "resolvido", note: "Está no SAC" });
    const pub = getPublicTicket(c.ticketId, s.id);
    expect(pub).toMatchObject({ status: "concluido", resolutionNote: "Está no SAC", canReopen: true });

    expect(() => reopenTicket(c.ticketId, "outra-sessao")).toThrowError(TicketError);
    expect(() => rateTicket(c.ticketId, s.id, 6)).toThrowError(TicketError);
    rateTicket(c.ticketId, s.id, 4);
    expect(getPublicTicket(c.ticketId, s.id)?.rating).toBe(4);

    reopenTicket(c.ticketId, s.id, "não achei");
    expect(getPublicTicket(c.ticketId, s.id)).toMatchObject({ status: "novo" });
    closeTicket(c.ticketId, "Ana", { code: "resolvido" });
    expect(getPublicTicket(c.ticketId, s.id)?.canReopen).toBe(false);
    expect(() => reopenTicket(c.ticketId, s.id)).toThrowError(TicketError);
  });

  it("registra eventos, escala e transfere", async () => {
    const s = createSession("entrada-principal");
    const c = await createTicket({ sessionId: s.id, text: "reclamação sobre a demora" });
    addNote(c.ticketId, "Ana", "ligando para o cliente");
    transferTicket(c.ticketId, "Ana", "manutencao");
    escalateTicket(c.ticketId, "Ana");
    const t = listTickets().find((x) => x.id === c.ticketId)!;
    expect(t).toMatchObject({ kind: "reclamacao", team: "seguranca", priority: "alta" });
    expect(t.events.map((e) => e.type)).toEqual(["criado", "nota", "transferido", "escalado"]);
  });
});

describe("recusa pelo administrador", () => {
  it("recusar fecha como improcedente e expõe o motivo ao visitante, com contato opcional protegido", async () => {
    const s = createSession("entrada-principal");
    const c = await createTicket({ sessionId: s.id, text: "quero um desconto", kind: "reclamacao", contact: "a@b.com" });
    closeTicket(c.ticketId, "Ana", { code: "improcedente", note: "Fora do escopo" });
    const pub = getPublicTicket(c.ticketId, s.id)!;
    expect(pub).toMatchObject({ status: "concluido", resolutionCode: "improcedente", resolutionNote: "Fora do escopo", kind: "reclamacao" });
    expect(JSON.stringify(pub)).not.toContain("a@b.com");
  });
});

describe("indicadores", () => {
  it("agrega tempos, SLA, recusas, reclamações e notas", async () => {
    const before = getMetrics();
    const s = createSession("frente-cea");
    const a = await createTicket({ sessionId: s.id, text: "o atendimento foi péssimo" });
    const b = await createTicket({ sessionId: s.id, text: "perdi meu carro" });
    assumeTicket(a.ticketId, "Ana");
    closeTicket(a.ticketId, "Ana", { code: "resolvido" });
    rateTicket(a.ticketId, s.id, 5);
    closeTicket(b.ticketId, "Ana", { code: "improcedente", note: "fora do escopo" });
    const m = getMetrics();
    expect(m.total).toBe(before.total + 2);
    expect(m.complaints).toBe(before.complaints + 1);
    expect(m.refused).toBe(before.refused + 1);
    expect(m.ratingCount).toBe(before.ratingCount + 1);
    expect(m.slaPct).toBeGreaterThanOrEqual(0);
    expect(m.byPoint.find((p) => p.key === "frente-cea")?.count).toBeGreaterThanOrEqual(2);
  });
});
