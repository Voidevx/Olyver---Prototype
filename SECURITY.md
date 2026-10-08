# Segurança — Olyver Import

Site estático (HTML, CSS e JavaScript, sem dependências). Não há login, banco de dados, pagamentos ou backend.

**Princípio:** tudo o que vai para o navegador é público. Nunca coloque senha, token ou chave em `js/`, `index.html`, `css/` ou `assets/`. O número de WhatsApp e os dados de contato são públicos por natureza e podem ficar em `js/config.js`.

## Publicação

```
npm run build      # valida os dados, verifica a CSP, procura segredos e gera dist/
```

**Publique somente a pasta `dist/`.** Ela contém apenas `index.html`, `_headers`, `css/`, `js/` e `assets/`. README, scripts, `_dev/` (backup do site antigo), `.vscode/` e arquivos `.env` nunca entram nela. O build falha se encontrar:
- script ou handler inline, ou `style` inline (incompatíveis com a CSP);
- possíveis segredos;
- source maps;
- tipos de arquivo inesperados;
- dados de catálogo ou contato inválidos.

## Cabeçalhos HTTP (configurar na hospedagem)

O `index.html` já traz uma CSP em `<meta>` como reforço. Porém `frame-ancestors`, HSTS e os demais cabeçalhos **só funcionam se enviados pelo servidor**.

| Cabeçalho | Valor | Motivo |
|---|---|---|
| Content-Security-Policy | `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests` | Só carrega recursos do próprio domínio. `data:` em imagens é usado pela seta dos campos de seleção. Não há script, estilo, fonte ou conexão de terceiros. |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` | Força HTTPS. Use `includeSubDomains` só se **todos** os subdomínios tiverem HTTPS. |
| X-Content-Type-Options | `nosniff` | Impede o navegador de "adivinhar" tipos de arquivo. |
| Referrer-Policy | `strict-origin-when-cross-origin` | Não vaza o endereço completo para sites externos. |
| Permissions-Policy | `accelerometer=(), browsing-topics=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()` | O site não usa nenhum desses recursos. |
| X-Frame-Options | `DENY` | Anti-clickjacking em navegadores antigos. |
| Cross-Origin-Opener-Policy | `same-origin` | Isola a janela de páginas externas. |

**Cloudflare Pages / Netlify:** o arquivo `_headers` já está pronto e vai junto em `dist/`.

**Nginx:**
```nginx
add_header Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "accelerometer=(), browsing-topics=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;
add_header X-Frame-Options "DENY" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
autoindex off;
server_tokens off;
location ~ /\. { deny all; }
```

**Apache (`.htaccess` em dist/):**
```apache
Header always set Content-Security-Policy "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; media-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests"
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "accelerometer=(), browsing-topics=(), camera=(), display-capture=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
Header always set X-Frame-Options "DENY"
Header always set Cross-Origin-Opener-Policy "same-origin"
Options -Indexes
```

**Vercel:** em `vercel.json`, use `"headers": [{ "source": "/(.*)", "headers": [{ "key": "...", "value": "..." }] }]` com os mesmos pares.

### HTTPS
- Ative HTTPS na hospedagem, com certificado automático, e o redirecionamento permanente (301) de `http://` para `https://`.
- O HSTS só tem efeito depois que o site já estiver em HTTPS. Adicionar `preload` é opcional e difícil de desfazer, então só faça isso depois de confirmar todos os subdomínios.

### Cloudflare
Se a hospedagem injetar scripts automaticamente (Web Analytics, Rocket Loader, Email Obfuscation), a CSP vai bloqueá-los. Isso é intencional, porque o site não precisa deles. Desative essas opções ou, se decidir usar alguma, inclua o domínio específico na CSP. **Nunca** use `*` nem `'unsafe-inline'`.

## Proteções no código
- **XSS:** todo texto do catálogo, da configuração e da URL é inserido com escape (`esc`) ou via `textContent`/`value`. Ícones só aceitam nomes de uma lista fixa. Não há `eval`, `document.write` nem HTML vindo de fora.
- **Dados não confiáveis:** `js/app.js` valida a configuração e o catálogo antes de usar:
  - tipos e tamanhos dos campos;
  - ids no formato `a-z0-9-`;
  - WhatsApp só com dígitos;
  - links só `https:` e de domínios esperados (Instagram, Google Maps, Waze);
  - imagens só dentro de `assets/img/`;
  - cores só em hexadecimal.

  Parâmetros da URL (`?q=`, `?categoria=`, `?produto=`...) só aceitam valores de listas permitidas.
- **Links externos:** abrem com `rel="noopener noreferrer"`.
- **Privacidade:** sem cookies, analytics, rastreadores ou `localStorage`. A fonte Inter (licença OFL em `assets/fonts/`) é servida pelo próprio site, então o IP do visitante não vai para o Google.
- **Erros:** se algo falhar, o visitante vê apenas uma mensagem genérica. Nada é registrado no console.

## Vídeo do hero e pasta `motion/`
- `motion/` é um projeto **Remotion** usado só no computador para gerar `assets/video/*.mp4` e os posters em `assets/img/hero/`. Ele **nunca é publicado**, porque não está na lista do `npm run build`.
- As versões do Remotion são fixas (sem `^`) e todas iguais, como o Remotion exige. Para atualizar: `cd motion`, `npm view remotion time`, escolha uma versão com algumas semanas e atualize os quatro pacotes `remotion` e `@remotion/*` juntos. Depois rode `npm audit`.
- A versão 4.0.250, instalada antes, tinha avisos **críticos** (execução remota de código e escrita arbitrária de arquivos no Remotion Studio). Foi atualizada para 4.0.526. Só rode `npm run studio` quando for usar e feche depois, porque ele abre um servidor local.
- **Licença:** o Remotion é gratuito para pessoas físicas e empresas com até 3 funcionários. Acima disso, o uso comercial exige uma licença paga (ver remotion.dev/license).
- No site, `js/hero.js` nunca deixa o topo sem logo. Se o vídeo não puder tocar (movimento reduzido, economia de dados, autoplay bloqueado, erro ou travamento por mais de 3 s), fica o poster com o logo completo.

## Quando houver backend
- A validação no navegador é conveniência, **não** barreira de segurança. O servidor deve validar tudo de novo.
- Segredos (tokens da API do WhatsApp Business, chaves de serviços, credenciais) ficam **somente** no servidor. Variáveis `VITE_*`/`NEXT_PUBLIC_*` ou qualquer `.env` lido pelo frontend acabam no bundle e ficam públicas.
- Se o catálogo passar a vir de uma API, inclua o domínio dela em `connect-src` na CSP e mantenha a validação de `sanearProdutos`.

## Se um segredo vazar
Apagar o arquivo não remove o segredo do histórico do Git nem de cópias já publicadas. **Revogue e gere uma nova credencial imediatamente.** Depois, limpe o histórico (por exemplo, com `git filter-repo`) se for necessário.
