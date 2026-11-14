// Gera QR Codes dos totens. Uso: BASE_URL=https://app.onrender.com npm run gen:qr
// Saída: docs/qr/<id>.png e docs/qr/totens.html (A4, 1 por ponto).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import QRCode from "qrcode";
import { loadKnowledgeBase } from "../src/server/maps/service";

const root = join(__dirname, "..");
const outDir = join(root, "docs", "qr");
const baseUrl = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function main() {
  const pontos = loadKnowledgeBase().pontos.filter((p) => p.qr);
  mkdirSync(outDir, { recursive: true });

  const pages: string[] = [];
  for (const p of pontos) {
    const url = `${baseUrl}/?p=${encodeURIComponent(p.id)}`;
    await QRCode.toFile(join(outDir, `${p.id}.png`), url, { width: 800, margin: 2 });
    const dataUri = await QRCode.toDataURL(url, { width: 800, margin: 2 });
    pages.push(`<section class="totem">
  <h1>Perdido? Escaneie e chame o CapiBot!</h1>
  <img src="${dataUri}" alt="QR Code para ${esc(p.nome)}">
  <h2>${esc(p.nome)}</h2>
  <p>${esc(url)}</p>
</section>`);
  }

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Totens CapiBot</title>
<style>
  @page { size: A4; margin: 0; }
  body { margin: 0; font-family: system-ui, sans-serif; background: #FFF8E1; color: #2B1D00; }
  .totem { width: 210mm; height: 297mm; box-sizing: border-box; padding: 20mm; text-align: center;
    page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12mm; }
  h1 { font-size: 40pt; margin: 0; } h2 { font-size: 34pt; margin: 0; }
  img { width: 130mm; height: 130mm; } p { font-size: 11pt; margin: 0; }
</style></head><body>
${pages.join("\n")}
</body></html>
`;
  writeFileSync(join(outDir, "totens.html"), html);
  console.log(`✓ ${pontos.length} QR(s) em ${outDir} (BASE_URL=${baseUrl})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
