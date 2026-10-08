# Olyver Import — Site institucional e catálogo

Site estático em HTML, CSS e JavaScript, sem dependências de execução (não usa React, Vite nem banco de dados).
A pasta `motion/` contém o projeto [Remotion](https://www.remotion.dev/) que gera o vídeo da logo animada do hero; ela só é necessária se você quiser alterar a animação.

## Tecnologias
- HTML5, CSS3 e JavaScript puro (sem framework e sem build obrigatório para desenvolver)
- Node.js apenas para os scripts de apoio (`dev`, `build`, `preview`)
- Remotion + React + TypeScript, **somente** em `motion/` (vídeo do hero)

## Pré-requisitos
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) 18 ou mais novo (inclui o npm)

## Instalação e execução local
```bash
git clone <URL_DO_REPOSITORIO>
cd Olyver
npm run dev        # abre em http://localhost:8080
```
O site raiz não tem dependências, então **não precisa de `npm install`**. (Rodar `npm install` não faz mal: apenas gera o mesmo `package-lock.json`.)

Abrindo o `index.html` direto (`file://`), o site funciona, mas o navegador bloqueia a fonte Inter e usa a fonte do sistema. Use o `npm run dev`.

## Build e preview
```bash
npm run build      # valida os dados, verifica a CSP e gera a pasta dist/
npm run preview    # serve a pasta dist/ em http://localhost:8081
```
Para publicar, envie **somente a pasta `dist/`**. Cabeçalhos de segurança, HTTPS e o restante estão em [SECURITY.md](SECURITY.md).

## Configuração (variáveis de ambiente)
O projeto **não usa `.env`**: não há chaves, tokens nem variáveis de ambiente. Os contatos públicos da loja (WhatsApp, endereço, Instagram) ficam em `js/config.js`.

## Logo animada do hero (opcional)
Os vídeos prontos já estão em `assets/video/` e os quadros finais em `assets/img/hero/`. Para alterar a animação:
```bash
cd motion
npm install
npm run studio     # editor visual do Remotion
npm run render     # regera os MP4 e os posters direto em ../assets
```
A primeira renderização baixa um Chrome headless (~100 MB) automaticamente.

## Estrutura
```
index.html             estrutura (HTML semântico, SEO, CSP)
css/styles.css         estilos (tokens no topo, seções numeradas)
js/init.js             marca que o JavaScript está ativo
js/config.js           contatos públicos: WhatsApp, endereço, telefone, horário, Instagram
js/produtos.js         CATEGORIAS e PRODUTOS (o catálogo)
js/icones.js           ilustrações provisórias (usadas enquanto não há foto)
js/app.js              vitrines, busca, filtros, modal de produto, contato, validação dos dados
assets/img/            logo, fachada, laboratório
assets/img/produtos/   fotos dos produtos (uma pasta por produto)
assets/img/categorias/ fotos das categorias (opcional)
assets/fonts/          fonte Inter hospedada no próprio site (licença OFL)
404.html               página "não encontrada" (usada automaticamente pela hospedagem)
robots.txt             orientação para buscadores (o sitemap.xml é gerado no build)
_headers               cabeçalhos de segurança e cache (Cloudflare Pages / Netlify)
scripts/build.mjs      build: valida, verifica segurança e gera dist/
scripts/dev.mjs        servidor local (npm run dev / npm run preview)
js/hero.js             toca o vídeo da logo quando ele aparece na tela
js/catalogo.js         busca e filtros de produtos.html
produtos.html          catálogo completo
assets/video/          vídeos da logo animada (MP4, desktop e celular)
motion/                projeto Remotion que gera os vídeos e posters do hero
```
(A pasta local `_dev/` guarda um backup do site antigo; fica fora do Git e do build.)
## Adicionar um produto
1. Em `js/produtos.js`, copie um bloco `{ ... }` da lista `PRODUTOS` e altere os campos.
2. Salve a foto principal como `assets/img/produtos/<id>/1.webp`. Ela aparece sozinha, sem editar código.
   Para ter galeria, salve 2.webp, 3.webp etc. e liste todas em `imagens`.
3. Para mostrar um preço, use um número, por exemplo `preco: 4999.90`. Use `null` para "Preço sob consulta".
   O filtro por faixa de preço e a ordenação por preço aparecem sozinhos quando algum produto tiver preço.

## Fotos das categorias (vitrine Apple e "Explore por categoria")
Salve como `assets/img/categorias/<id>.webp`, por exemplo `iphone.webp`, `ipad.webp`, `mac.webp`, `apple-watch.webp`, `airpods.webp` e `acessorios-apple.webp`.
A foto do iPhone fica sobre fundo preto, então use uma imagem com fundo transparente.

## Padrão das fotos (vitrine estilo loja premium)
- Apenas o produto, centralizado, sem texto, sem moldura e sem sombra pesada.
- Fundo branco ou transparente. O site funde o branco com o cinza-claro da vitrine.
- Formato `.webp`, quadrado (cerca de 1200 x 1200 px), com menos de 150 KB.
- Use fotos próprias ou o material oficial que o distribuidor/revenda autorizada fornece. Não copie imagens do apple.com: elas são protegidas por direitos autorais.


## Páginas
- `index.html`: página inicial, com vitrines (categorias, destaques, Apple, JBL, Xiaomi e periféricos), sobre e contato. Os atalhos levam ao catálogo já filtrado.
- `produtos.html`: catálogo completo com busca avançada (`js/catalogo.js`).

## Recursos do catálogo (produtos.html)
- Busca com sugestões enquanto digita (setas + Enter abrem o produto). A busca alcança nome, marca, descrição **e especificações**, por exemplo `A19`, `120 Hz` ou `USB-C`.
- Filtros combináveis com contagem por opção: marca, categoria, condição, **armazenamento** e **memória RAM** (lidos automaticamente das especificações), disponibilidade, lançamentos/destaques e preço (este aparece quando houver preços).
- Filtros ativos removíveis, ordenação, visualização em grade ou lista e links compartilháveis (o estado fica na URL).
- No celular, os filtros abrem numa gaveta com o botão "Ver N resultados".

## Recursos gerais
- Busca sem distinção de acentos (atalho: tecla `/`), filtros por marca, categoria e condição, e ordenação.
- O filtro por faixa de preço aparece sozinho quando algum produto tiver preço.
- Mostra 24 produtos por vez, com o botão "Mostrar mais".
- Janela do produto com galeria, especificações, produtos relacionados, botão de compartilhar e WhatsApp por unidade.
- O botão "voltar" do navegador ou do celular fecha a janela do produto.

## Links que podem ser compartilhados
- Produto: `index.html?produto=iphone-18-pro`
- Catálogo filtrado: `index.html?marca=JBL` ou `?categoria=iphone` ou `?q=airpods`

## Imagem principal do hero (atualizado)
O hero agora usa a logo animada (`assets/video/` + `js/hero.js`). A foto da fachada (`assets/img/loja-fachada.jpg`) continua no projeto e é usada na pré-visualização de compartilhamento (og:image).

## Segurança
- **Nunca** coloque senha, token, chave de API ou credencial no repositório. Tudo o que está em `js/`, `css/`, `index.html` e `assets/` é público no navegador.
- Arquivos `.env` não devem ir para o Git (já estão no `.gitignore`). O projeto atual não usa `.env`.
- Se o site ganhar um backend ou integração, variáveis `VITE_*`/`NEXT_PUBLIC_*` (ou qualquer valor lido pelo frontend) ficam **públicas**; segredos devem ficar só no servidor.
- Os números de WhatsApp em `js/config.js` ficam **em branco** (`null`) neste repositório. Preencha com o contato comercial de quem for publicar o site; um número de WhatsApp colocado no site é público por natureza.
- Mais detalhes (CSP, HTTPS, cabeçalhos): [SECURITY.md](SECURITY.md).

## Imagens e direitos
Veja [IMAGENS.md](IMAGENS.md) para a origem/licença conhecida de cada arquivo e o que ainda precisa ser confirmado.

## Licença
Todos os direitos reservados. Veja o arquivo [LICENSE](LICENSE): o código, as imagens e a identidade visual não podem ser copiados, modificados nem redistribuídos sem autorização do titular.
