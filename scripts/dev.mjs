/* ==========================================================================
   Olyver Import — servidor local simples (sem dependências)

   npm run dev       → serve a pasta do projeto em http://localhost:8080
   npm run preview   → serve a pasta dist/ (gerada por "npm run build")

   Escuta apenas em 127.0.0.1 (não fica acessível a outros dispositivos da rede).
   Porta diferente: PORT=3000 npm run dev  (PowerShell: $env:PORT=3000; npm run dev)
   ========================================================================== */
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = resolve(fileURLToPath(new URL("..", import.meta.url))); // resolve() remove a barra final
const pasta = process.argv[2] === "dist" ? join(RAIZ, "dist") : RAIZ;
const PORTA = Number(process.env.PORT) || (process.argv[2] === "dist" ? 8081 : 8080);

if (!existsSync(pasta)) {
  console.error('A pasta dist/ não existe. Rode "npm run build" antes.');
  process.exit(1);
}

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml",
};
// Arquivos que não fazem parte do site e nunca são servidos
const PRIVADOS = /^\/(?:node_modules|motion|scripts|_dev|\.git|\.vscode)(?:\/|$)|^\/(?:package(?:-lock)?\.json|README\.md|SECURITY\.md|_headers)$/;

createServer((req, res) => {
  let caminho;
  try { caminho = decodeURIComponent(new URL(req.url, "http://x").pathname); } catch { res.writeHead(400).end("Requisição inválida"); return; }
  if (caminho.endsWith("/")) caminho += "index.html";
  const alvo = resolve(join(pasta, normalize(caminho)));

  if ((alvo !== pasta && !alvo.startsWith(pasta + sep)) || (pasta === RAIZ && PRIVADOS.test(caminho))) {
    res.writeHead(403).end("Acesso negado");
    return;
  }
  const arquivo = existsSync(alvo) && statSync(alvo).isFile() ? alvo : null;
  const final = arquivo || join(pasta, "404.html");
  res.writeHead(arquivo ? 200 : 404, {
    "Content-Type": TIPOS[extname(final).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  if (!existsSync(final)) { res.end("404"); return; }
  createReadStream(final).pipe(res);
}).listen(PORTA, "127.0.0.1", () => {
  console.log(`Olyver Import em http://localhost:${PORTA}  (Ctrl+C para parar)`);
});
