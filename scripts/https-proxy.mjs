// Proxy HTTPS leve na frente de um `next dev`/`next start` já rodando (consome ~30 MB).
// Usa os certificados do mkcert gerados em certificates/ por `next dev --experimental-https`.
// Uso: npm run https:proxy            -> https://localhost:3443  ->  http://localhost:3000
//      TARGET_PORT=3001 HTTPS_PORT=4443 npm run https:proxy
import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const TARGET_PORT = Number(process.env.TARGET_PORT ?? 3000);
const HTTPS_PORT = Number(process.env.HTTPS_PORT ?? 3443);

const key = path.join(root, "certificates", "localhost-key.pem");
const cert = path.join(root, "certificates", "localhost.pem");
if (!fs.existsSync(key) || !fs.existsSync(cert)) {
  console.error("Certificados não encontrados em certificates/. Rode uma vez: npx next dev --experimental-https");
  process.exit(1);
}

const server = https.createServer({ key: fs.readFileSync(key), cert: fs.readFileSync(cert) }, (req, res) => {
  const upstream = http.request(
    {
      host: "127.0.0.1", port: TARGET_PORT, path: req.url, method: req.method,
      headers: { ...req.headers, "x-forwarded-proto": "https" },
    },
    (r) => {
      res.writeHead(r.statusCode ?? 502, r.headers);
      r.pipe(res);
    },
  );
  upstream.on("error", () => {
    res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Nada respondendo em http://localhost:${TARGET_PORT}. Suba o app primeiro (npm run dev).`);
  });
  req.pipe(upstream);
});

// WebSocket do HMR do Next.
server.on("upgrade", (req, socket, head) => {
  const up = net.connect(TARGET_PORT, "127.0.0.1", () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    up.write(lines.join("\r\n") + "\r\n\r\n");
    if (head?.length) up.write(head);
    socket.pipe(up).pipe(socket);
  });
  up.on("error", () => socket.destroy());
  socket.on("error", () => up.destroy());
});

server.listen(HTTPS_PORT, "0.0.0.0", () => {
  console.log(`HTTPS em https://localhost:${HTTPS_PORT}  ->  http://localhost:${TARGET_PORT}`);
});
