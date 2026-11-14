import { beforeEach, describe, expect, it } from "vitest";
import { cacheClear } from "@/server/ai/cache";
import { sanitizeAi } from "@/server/ai/sanitize";
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
    expect(r.messages[0].quickReplies).toHaveLength(4);
    expect(r.messages[0].sticker).toBe("inteligente");
    expect(r.messages[0].speakText).not.toMatch(/✨/);
  });
  it("banheiros devolve mapa + passos", async () => {
    const r = await chat(fresh(), { quickReplyId: "banheiros" });
    expect(r.messages[0].map).toBeTruthy();
    expect(r.messages).toHaveLength(2);
  });
  it("fluxo de lojas: estado e texto", async () => {
    const s = fresh();
    const p = await chat(s, { quickReplyId: "lojas" });
    expect(p.messages[0].suggestInput).toBe("loja");
    expect(getSession(s.id)!.state).toBe("aguardando_loja");
    const r = await chat(s, { message: "Pernambucanas" });
    expect(r.messages[0].map).toBeTruthy();
    expect(getSession(s.id)!.state).toBe("livre");
  });
  it("loja sem rota desenhada usa landmark", async () => {
    const r = await chat(fresh(), { storeId: "loja-livraria" });
    expect(r.messages[0].map).toBeUndefined();
    expect(r.messages[0].text).toMatch(/perto de/);
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
    expect(r.messages[0].map).toBeTruthy();
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
