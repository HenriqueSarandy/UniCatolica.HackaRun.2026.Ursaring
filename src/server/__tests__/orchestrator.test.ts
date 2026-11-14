import { beforeEach, describe, expect, it } from "vitest";
import { cacheClear } from "@/server/ai/cache";
import { sanitizeAi } from "@/server/ai/sanitize";
import { db } from "@/server/db";
import { createSession, getSession } from "@/server/db/sessions";
import { detectIntent } from "@/server/orchestrator/intent";
import { handleChat } from "@/server/orchestrator";
import { allow, resetRateLimit } from "@/server/rateLimit";

const fresh = () => createSession("entrada-principal");
const chat = (s: ReturnType<typeof fresh>, r: object) =>
  handleChat(getSession(s.id)!, { sessionId: s.id, ...r });

beforeEach(() => {
  cacheClear();
  resetRateLimit();
});

describe("intent", () => {
  it("detecta intenções", () => {
    expect(detectIntent("Onde fica o BANHEIRO?")).toBe("banheiros");
    expect(detectIntent("to com fome")).toBe("alimentacao");
    expect(detectIntent("perdi minha carteira")).toBe("servicos");
    expect(detectIntent("que horas fecha")).toBeNull();
  });
});

describe("orquestrador", () => {
  it("saudação com 4 botões", async () => {
    const r = await chat(fresh(), {});
    const last = r.messages.at(-1)!;
    expect(last.quickReplies).toHaveLength(4);
    expect(last.sticker).toBe("inteligente");
    expect(last.speakText).not.toMatch(/✨/);
  });
  it("banheiros devolve mapa + passos", async () => {
    const r = await chat(fresh(), { quickReplyId: "loc:banheiros" });
    expect(r.messages[0].map).toBeTruthy();
    expect(r.messages.length).toBeGreaterThanOrEqual(2); // mapa + passos
  });
  it("fluxo de lojas: estado e texto", async () => {
    const s = fresh();
    const p = await chat(s, { quickReplyId: "loc:lojas" });
    expect(p.messages[0].suggestInput).toBe("loja");
    expect(getSession(s.id)!.state).toBe("aguardando_loja");
    const r = await chat(s, { message: "Pernambucanas" });
    expect(r.messages[0].map).toBeTruthy();
    expect(getSession(s.id)!.state).toBe("livre");
  });
  it("loja sem rota (origem fora do grafo) usa a referência da loja", async () => {
    const r = await chat(createSession("ponto-inexistente"), { storeId: "loja-livraria" });
    expect(r.messages[0].map).toBeUndefined();
    expect(r.messages[0].text).toMatch(/piso 1, no lado norte/);
  });
  it("store:<id> via quick reply", async () => {
    const r = await chat(fresh(), { quickReplyId: "store:loja-cinema" });
    expect(r.messages[0].map).toBeTruthy();
  });
  it("texto livre sem chave usa fallback local e nunca quebra", async () => {
    const r = await chat(fresh(), { message: "que horas fecha?" });
    expect(r.messages[0].text).toMatch(/22h/);
    const r2 = await chat(fresh(), { message: "blablabla xyz" });
    expect(r2.messages[0].quickReplies).toHaveLength(4);
  });
  it("intenção por texto dispara o fluxo", async () => {
    const r = await chat(fresh(), { message: "cadê o banheiro?" });
    expect(r.messages[0].quickReplies?.map((q) => q.id)).toEqual(["loc:banheiros", "rec:banheiros"]);
  });
});

describe("util", () => {
  it("sanitiza markdown/HTML", () => {
    expect(sanitizeAi("**Oi** <b>tudo</b> [link](http://x)")).toBe("Oi tudo link");
  });
  it("rate limit 20/min", () => {
    for (let i = 0; i < 20; i++) expect(allow("a", 20, 1000)).toBe(true);
    expect(allow("a", 20, 1000)).toBe(false);
    expect(allow("a", 20, 62000)).toBe(true);
  });
});

describe("fluxo: tópico → localização ou reclamação", () => {
  it("tópico pergunta localização ou reclamação (sem 'falar com uma pessoa')", async () => {
    const s = createSession("entrada-principal");
    for (const topic of ["banheiros", "alimentacao", "lojas", "servicos"]) {
      const r = await chat(s, { quickReplyId: topic });
      expect(r.messages[0].quickReplies?.map((q) => q.id)).toEqual([`loc:${topic}`, `rec:${topic}`]);
    }
  });

  it("localização mostra o mapa (banheiros, praça e SAC)", async () => {
    const s = createSession("entrada-principal");
    for (const topic of ["banheiros", "alimentacao", "servicos"]) {
      const r = await chat(s, { quickReplyId: `loc:${topic}` });
      expect(r.messages.some((m) => m.map)).toBe(true);
    }
    const lojas = await chat(s, { quickReplyId: "loc:lojas" });
    expect(lojas.messages[0].suggestInput).toBe("loja");
  });

  it("reclamação pede nome, depois o texto, e cria o chamado com identificação", async () => {
    const s = createSession("frente-cea");
    const a = await chat(s, { quickReplyId: "rec:banheiros" });
    expect(a.messages[0].text).toMatch(/nome/i);
    expect(getSession(s.id)?.state).toBe("rec_nome|banheiros");

    const curto = await chat(s, { message: "x" });
    expect(curto.messages[0].text).toMatch(/nome/i);

    const b = await chat(s, { message: "Maria Souza 6399999-0000" });
    expect(b.messages[0].text).toMatch(/Maria/);
    expect(b.messages[0].text).toMatch(/reclamação/i);

    const c = await chat(s, { message: "O banheiro está sem papel há horas" });
    const ticketId = c.messages.find((m) => m.ticketId)?.ticketId;
    expect(ticketId).toMatch(/^BO-/);
    expect(getSession(s.id)?.state).toBe("livre");
    const last = c.messages.at(-1)!;
    expect(last.quickReplies).toHaveLength(4);

    const row = db.prepare("SELECT kind, category, contact, text, point_id FROM tickets WHERE id = ?").get(ticketId) as Record<string, string>;
    expect(row).toMatchObject({ kind: "reclamacao", category: "banheiro", point_id: "frente-cea", text: "O banheiro está sem papel há horas" });
    expect(row.contact).toContain("Maria Souza");
  });

  it("nenhuma resposta oferece 'Falar com uma pessoa'", async () => {
    const s = createSession("entrada-principal");
    const reqs = [{}, { quickReplyId: "nao-ajudou" }, { quickReplyId: "ajudou" }, { quickReplyId: "servicos" }];
    for (const r of reqs) {
      const res = await chat(s, { ...r });
      expect(JSON.stringify(res.messages)).not.toMatch(/Falar com uma pessoa/i);
    }
  });
});

describe("fim de assunto", () => {
  it("depois do mapa voltam os 4 botões iniciais", async () => {
    const r = await chat(fresh(), { quickReplyId: "loc:banheiros" });
    expect(r.messages.at(-1)?.quickReplies?.map((q) => q.id)).toEqual(["banheiros", "alimentacao", "lojas", "servicos"]);
  });
});
