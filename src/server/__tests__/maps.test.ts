import { describe, expect, it } from "vitest";
import { getPointName, getRoute, loadKnowledgeBase, nearestAmenity, searchStores } from "@/server/maps/service";

const kb = loadKnowledgeBase();
const qrs = kb.pontos.filter((p) => p.qr).map((p) => p.id);

describe("searchStores", () => {
  it("prefixo, sinônimo, fuzzy e vazio", () => {
    expect(searchStores("perna")[0].name).toBe("Pernambucanas");
    expect(searchStores("c e a")[0].name).toBe("C&A");
    expect(searchStores("C&A")[0].name).toBe("C&A");
    expect(searchStores("livaria")[0].name).toBe("Livraria Cerrado");
    expect(searchStores("onde fica a Renner?")[0].name).toBe("Renner");
    expect(searchStores("xyz")).toEqual([]);
    expect(searchStores("   ")).toEqual([]);
  });
  it("respeita o limite", () => {
    expect(searchStores("a", 3).length).toBeLessThanOrEqual(3);
  });
});

describe("getRoute", () => {
  it("rota no mesmo piso", () => {
    const r = getRoute("entrada-principal", "loja-livraria")!;
    expect(r.floor).toBe(1);
    expect(r.mapSvgUrl).toBe("/maps/piso-1.svg");
    expect(r.routePath).toMatch(/^M600 740 L600 400/);
    expect(r.origin.label).toBe("Você está aqui");
    expect(r.destination).toMatchObject({ x: 500, y: 340, label: "Livraria Cerrado" });
    expect(r.steps.at(-1)).toMatch(/Você chegou/);
    expect(r.altText).toMatch(/Livraria Cerrado/);
  });
  it("rota entre pisos mostra o piso do destino a partir da escada", () => {
    const r = getRoute("entrada-principal", "loja-pernambucanas")!;
    expect(r.floor).toBe(2);
    expect(r.steps[0]).toBe("Suba a escada rolante até o piso 2");
    expect(r.origin).toMatchObject({ x: 600, y: 250 });
    expect(getRoute("frente-cinema", "loja-cea")!.steps[0]).toMatch(/^Desça/);
  });
  it("destino inexistente, origem desconhecida ou igual ao destino → null", () => {
    expect(getRoute("entrada-principal", "nada")).toBeNull();
    expect(getRoute("nada", "loja-cea")).toBeNull();
    expect(getRoute("loja-cea", "loja-cea")).toBeNull();
  });
});

describe("nearestAmenity", () => {
  it("escolhe o banheiro mais perto, com penalidade de piso", () => {
    expect(nearestAmenity("frente-cea", "banheiro_fraldario")?.id).toBe("banheiro-sul");
    expect(nearestAmenity("entrada-norte", "banheiro_fraldario")?.id).toBe("banheiro-norte");
    expect(nearestAmenity("nada", "banheiro_fraldario")).toBeNull();
  });
});

describe("cobertura da demo", () => {
  const demo = ["loja-pernambucanas", "loja-cea", "loja-renner", "loja-cinema"];
  it.each(qrs)("QR %s alcança banheiro, praça e lojas de demo", (qr) => {
    for (const t of ["banheiro_fraldario", "praca_alimentacao"] as const) {
      const a = nearestAmenity(qr, t);
      expect(a, `${qr} → ${t}`).not.toBeNull();
      expect(getRoute(qr, a!.id)).not.toBeNull();
    }
    for (const id of demo) expect(getRoute(qr, id), `${qr} → ${id}`).not.toBeNull();
  });
  it("pontos conhecidos", () => {
    expect(getPointName("entrada-principal")).toBe("Entrada Principal");
    expect(getPointName("xyz")).toBeNull();
  });
});
