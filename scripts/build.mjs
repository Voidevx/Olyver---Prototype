/* ==========================================================================
   Olyver Import — build de produção (sem dependências externas)

   1. Valida config.js e produtos.js
   2. Verifica o HTML contra padrões que quebram a CSP (script/handler/style inline)
   3. Copia SOMENTE os arquivos públicos para dist/
   4. Procura possíveis segredos e source maps no que será publicado

   Uso: npm run build   → publique apenas a pasta dist/
   ========================================================================== */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative, extname } from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const DIST = join(RAIZ, "dist");

// Lista explícita do que é público. Qualquer outro arquivo (README, scripts,
// backups, .vscode, .env...) nunca vai para produção.
const PAGINAS = ["index.html", "produtos.html", "404.html"];
const PUBLICOS = [...PAGINAS, "_headers", "robots.txt", "css", "js", "assets"];
const EXT_PERMITIDAS = new Set([".html", ".css", ".js", ".webp", ".avif", ".png", ".jpg", ".jpeg", ".svg", ".woff2", ".mp4", ".webm", ".txt", ".ico", ".xml", ""]);
const SITE = "https://www.olyverimport.com.br/";

const erros = [];
const avisos = [];

/* ---------- 1. Dados ---------- */
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ["js/config.js", "js/produtos.js", "js/icones.js"]) {
  try {
    vm.runInContext(readFileSync(join(RAIZ, f), "utf8"), ctx, { filename: f });
  } catch (e) {
    erros.push(`${f}: erro de sintaxe (${e.message})`);
  }
}
const { OLYVER_CONFIG: cfg = {}, PRODUTOS: produtos = [], CATEGORIAS: categorias = [] } = ctx.window;

const RE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RE_IMG = /^assets\/img\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.(?:webp|avif|png|jpe?g)$/i;

for (const u of cfg.unidades || []) {
  if (u.whatsapp && !/^\d{10,15}$/.test(String(u.whatsapp))) erros.push(`config: WhatsApp inválido em "${u.id}" (use só dígitos, com DDI e DDD)`);
  if (!u.whatsapp) avisos.push(`config: unidade "${u.id}" sem WhatsApp`);
  if (u.mapa && !/^https:\/\//.test(u.mapa)) erros.push(`config: link de mapa de "${u.id}" deve começar com https://`);
}
if (cfg.instagram && !/^https:\/\/(www\.)?instagram\.com\//.test(cfg.instagram)) erros.push("config: instagram deve ser https://instagram.com/...");

const catIds = new Set(categorias.map((c) => c.id));
const vistos = new Set();
let semFoto = 0;
for (const p of produtos) {
  if (!RE_ID.test(p.id || "")) erros.push(`produto "${p.id}": id inválido (use a-z, 0-9 e hífen)`);
  if (vistos.has(p.id)) erros.push(`produto "${p.id}": id duplicado`);
  vistos.add(p.id);
  if (!catIds.has(p.categoria)) erros.push(`produto "${p.id}": categoria "${p.categoria}" não existe`);
  if (p.preco != null && !(typeof p.preco === "number" && p.preco >= 0)) erros.push(`produto "${p.id}": preço deve ser número ou null`);
  const imgs = p.imagens && p.imagens.length ? p.imagens : [`assets/img/produtos/${p.id}/1.webp`];
  for (const img of imgs) {
    if (!RE_IMG.test(img)) erros.push(`produto "${p.id}": caminho de imagem não permitido: ${img}`);
    else if (!existsSync(join(RAIZ, img))) semFoto++;
  }
}
if (semFoto) avisos.push(`${semFoto} foto(s) de produto ainda não inseridas (o site mostra a ilustração provisória)`);

/* ---------- 2. HTML compatível com a CSP ---------- */
for (const pagina of PAGINAS) {
  const html = readFileSync(join(RAIZ, pagina), "utf8");
  const scriptsInline = [...html.matchAll(/<script\b([^>]*)>/gi)].filter(([, attrs]) => !/\bsrc=/.test(attrs) && !/application\/ld\+json/.test(attrs));
  if (scriptsInline.length) erros.push(`${pagina}: <script> inline encontrado (bloqueado pela CSP; mova para um arquivo .js)`);
  if (/\son[a-z]+\s*=/i.test(html)) erros.push(`${pagina}: handler inline (onclick, onsubmit...) encontrado (bloqueado pela CSP)`);
  if (/\sstyle\s*=/i.test(html)) erros.push(`${pagina}: atributo style inline encontrado (bloqueado pela CSP)`);
  if (/<(script|link)\b[^>]*(src|href)=["']https?:\/\/(?!www\.olyverimport\.com\.br)/i.test(html)) erros.push(`${pagina}: script/CSS de domínio externo (não permitido pela CSP)`);
}

// A CSP do <meta> das páginas principais e a do servidor (_headers) não podem divergir
const cspHeader = (readFileSync(join(RAIZ, "_headers"), "utf8").match(/Content-Security-Policy:\s*(.+)/i) || [, ""])[1];
const diretivas = (csp) => csp.split(";").map((d) => d.trim().replace(/\s+/g, " ")).filter(Boolean);
if (!cspHeader) erros.push("CSP ausente no _headers");
if (/\*|'unsafe-inline'|'unsafe-eval'/.test(cspHeader)) erros.push("_headers: CSP permissiva demais (* / 'unsafe-inline' / 'unsafe-eval')");
for (const pagina of ["index.html", "produtos.html"]) {
  const cspMeta = (readFileSync(join(RAIZ, pagina), "utf8").match(/http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i) || [, ""])[1];
  if (!cspMeta) { erros.push(`${pagina}: CSP ausente`); continue; }
  if (/\*|'unsafe-inline'|'unsafe-eval'/.test(cspMeta)) erros.push(`${pagina}: CSP permissiva demais`);
  for (const d of diretivas(cspMeta)) if (!diretivas(cspHeader).includes(d)) erros.push(`CSP divergente: "${d}" está no ${pagina} mas não no _headers`);
  for (const d of diretivas(cspHeader)) {
    const nome = d.split(" ")[0];
    // estas três só funcionam como header HTTP; não precisam (nem podem) estar no <meta>
    if (!["frame-ancestors", "upgrade-insecure-requests", "report-uri"].includes(nome) && !diretivas(cspMeta).includes(d)) erros.push(`CSP divergente: "${d}" está no _headers mas não no ${pagina}`);
  }
}

// O <noscript> repete os WhatsApps da config (sem JS não há como ler config.js): devem bater
const numsConfig = new Set((cfg.unidades || []).map((u) => String(u.whatsapp || "")).filter(Boolean));
for (const pagina of ["index.html", "produtos.html"]) {
  const noscript = (readFileSync(join(RAIZ, pagina), "utf8").match(/<noscript>([\s\S]*?)<\/noscript>/i) || [, ""])[1];
  const numsNoscript = new Set([...noscript.matchAll(/wa\.me\/(\d+)/g)].map((m) => m[1]));
  if ([...numsConfig].some((n) => !numsNoscript.has(n)) || [...numsNoscript].some((n) => !numsConfig.has(n))) {
    erros.push(`${pagina}: os WhatsApps do <noscript> não batem com js/config.js — atualize os dois`);
  }
}

/* ---------- 3. Cópia ---------- */
if (!erros.length) {
  rmSync(DIST, { recursive: true, force: true });
  mkdirSync(DIST);
  for (const item of PUBLICOS) {
    const origem = join(RAIZ, item);
    if (existsSync(origem)) cpSync(origem, join(DIST, item), { recursive: true });
  }
  const hoje = new Date().toISOString().slice(0, 10);
  writeFileSync(join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}</loc><lastmod>${hoje}</lastmod></url>\n  <url><loc>${SITE}produtos.html</loc><lastmod>${hoje}</lastmod></url>\n</urlset>\n`);
}

/* ---------- 4. Varredura do que será publicado ---------- */
const SEGREDOS = [
  /api[_-]?key\s*[:=]/i, /secret\s*[:=]/i, /passw(or)?d\s*[:=]/i, /private[_-]?key/i,
  /bearer\s+[a-z0-9._-]{12,}/i, /authorization\s*:/i, /token\s*[:=]\s*["'][^"']{8,}/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/, /AIza[0-9A-Za-z_-]{35}/
];
function varrer(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    const rel = relative(DIST, caminho).replace(/\\/g, "/");
    if (statSync(caminho).isDirectory()) { varrer(caminho); continue; }
    const ext = extname(nome).toLowerCase();
    if (nome.startsWith(".") || nome === ".env" || /^\.env\./.test(nome)) erros.push(`dist: arquivo oculto/ambiente não deveria ser publicado: ${rel}`);
    if (ext === ".map") erros.push(`dist: source map encontrado: ${rel}`);
    if (!EXT_PERMITIDAS.has(ext)) erros.push(`dist: tipo de arquivo inesperado: ${rel}`);
    if ([".html", ".css", ".js", ".txt", ".svg", ".xml", ""].includes(ext)) {
      const conteudo = readFileSync(caminho, "utf8");
      for (const re of SEGREDOS) if (re.test(conteudo)) erros.push(`dist: possível segredo em ${rel} (${re})`);
      // SVG é XML e pode carregar script: imagens não podem ter código executável
      if (ext === ".svg" && /<script\b|\son[a-z]+\s*=|javascript:|<foreignObject\b/i.test(conteudo)) erros.push(`dist: SVG com conteúdo executável: ${rel}`);
    }
    // Imagem tem que ser imagem de verdade (assinatura do arquivo), não código renomeado
    const ASSINATURAS = { ".png": [0x89, 0x50, 0x4e, 0x47], ".jpg": [0xff, 0xd8, 0xff], ".jpeg": [0xff, 0xd8, 0xff], ".webp": [0x52, 0x49, 0x46, 0x46], ".woff2": [0x77, 0x4f, 0x46, 0x32], ".webm": [0x1a, 0x45, 0xdf, 0xa3] };
    if (ASSINATURAS[ext]) {
      const cab = readFileSync(caminho).subarray(0, 4);
      if (!ASSINATURAS[ext].every((b, i) => cab[i] === b)) erros.push(`dist: ${rel} não é um arquivo ${ext} válido`);
    }
    // MP4: a caixa "ftyp" fica nos bytes 4–7
    if (ext === ".mp4" && readFileSync(caminho).subarray(4, 8).toString("latin1") !== "ftyp") erros.push(`dist: ${rel} não é um arquivo .mp4 válido`);
    // Vídeos grandes pesam no carregamento do celular
    if ([".mp4", ".webm"].includes(ext) && statSync(caminho).size > 2 * 1024 * 1024) avisos.push(`${rel} tem mais de 2 MB; considere comprimir`);
  }
}
if (!erros.length) varrer(DIST);

/* ---------- Resultado ---------- */
for (const a of avisos) console.log("aviso: " + a);
if (erros.length) {
  for (const e of erros) console.error("ERRO: " + e);
  console.error(`\nBuild interrompido: ${erros.length} problema(s).`);
  rmSync(DIST, { recursive: true, force: true });
  process.exit(1);
}
console.log(`\nBuild OK: ${produtos.length} produtos validados. Publique somente a pasta dist/.`);
