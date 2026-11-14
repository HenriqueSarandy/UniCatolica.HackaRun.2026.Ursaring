export type Intent = "banheiros" | "alimentacao" | "servicos" | null;

export function normalize(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function detectIntent(text: string): Intent {
  const t = normalize(text);
  if (/banheiro|fraldario|toalete|wc\b/.test(t)) return "banheiros";
  if (/\bcomer\b|\bfome\b|restaurante|praca|lanche/.test(t)) return "alimentacao";
  if (/perdi|roubo|roubaram|socorro|cadeira de rodas|carro|emergencia/.test(t)) return "servicos";
  return null;
}
