/* ==========================================================================
   Olyver Import — Aplicação
   Renderiza vitrines e catálogo a partir de js/produtos.js e js/config.js.
   ========================================================================== */
(function () {
  "use strict";

  // Preenchidos depois da validação (ver "Validação dos dados" abaixo)
  var CFG, PRODUTOS, CATEGORIAS;
  var MARCAS_PRINCIPAIS = ["Apple", "JBL", "Xiaomi"];
  var GRUPOS = {
    apple: "Apple",
    dispositivos: "Smartphones e wearables",
    audio: "Áudio",
    perifericos: "Acessórios e periféricos"
  };

  /* ---------------------------------------------------------------- utils */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function normalizar(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  var fmtBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

  function categoria(id) {
    for (var i = 0; i < CATEGORIAS.length; i++) if (CATEGORIAS[i].id === id) return CATEGORIAS[i];
    return { id: id, nome: id, grupo: "perifericos", icone: "box" };
  }

  function produto(id) {
    for (var i = 0; i < PRODUTOS.length; i++) if (PRODUTOS[i].id === id) return PRODUTOS[i];
    return null;
  }

  var STATUS = {
    disponivel: "Disponível",
    consultar: "Consultar disponibilidade",
    encomenda: "Sob encomenda",
    esgotado: "Indisponível no momento"
  };

  function statusHTML(p) {
    var s = STATUS[p.status] ? p.status : "consultar";
    return '<span class="status status-' + s + '">' + STATUS[s] + "</span>";
  }

  function precoHTML(p) {
    return typeof p.preco === "number"
      ? '<span class="price">' + fmtBRL.format(p.preco) + "</span>"
      : '<span class="price-ask">Preço sob consulta</span>';
  }

  function linkWhats(numero, msg) {
    return "https://wa.me/" + numero + "?text=" + encodeURIComponent(msg);
  }

  function msgProduto(p) {
    var nome = p.nome + (p.condicao === "Seminovo" ? " (seminovo)" : "");
    // função como substituto: "$&", "$1" etc. no nome não são interpretados
    return CFG.mensagemProduto.replace("{produto}", function () { return nome; });
  }

  function unidadesVenda() {
    return CFG.unidades.filter(function (u) { return u.vendas && u.whatsapp; });
  }

  // Fotos do produto: lista em "imagens" ou, se vazia, assets/img/produtos/<id>/1.webp
  function fotos(p) {
    return p.imagens && p.imagens.length ? p.imagens : ["assets/img/produtos/" + p.id + "/1.webp"];
  }

  // Foto da categoria: campo "imagem" ou assets/img/categorias/<id>.webp
  function fotoCategoria(c) {
    return c.imagem || (c.id ? "assets/img/categorias/" + c.id + ".webp" : null);
  }

  // A cor vai em data-cor e é aplicada via CSSOM (aplicarCores): sem style inline,
  // compatível com a CSP e sem risco de injeção de CSS. O hex já foi validado.
  function coresHTML(p) {
    if (!p.cores || !p.cores.length) return "";
    return '<ul class="swatches" aria-label="Cores disponíveis">' + p.cores.map(function (c) {
      return '<li title="' + esc(c.nome) + '" data-cor="' + esc(c.hex) + '"><span class="sr-only">' + esc(c.nome) + "</span></li>";
    }).join("") + "</ul>";
  }

  function aplicarCores(raiz) {
    $$("[data-cor]", raiz).forEach(function (li) {
      if (RE_HEX.test(li.dataset.cor)) li.style.backgroundColor = li.dataset.cor;
    });
  }

  // Foto do produto/categoria ou ilustração provisória
  function midia(src, icone, alt, eager) {
    if (src) {
      return '<img src="' + esc(src) + '" alt="' + esc(alt) + '" data-icone="' + esc(icone) + '"' +
        (eager ? "" : ' loading="lazy"') + ' decoding="async">';
    }
    return window.iconeSVG(icone);
  }

  // Se uma imagem não existir, troca pela ilustração
  document.addEventListener("error", function (e) {
    var img = e.target;
    if (img.tagName === "IMG" && img.dataset.icone) {
      img.insertAdjacentHTML("afterend", window.iconeSVG(img.dataset.icone));
      img.remove();
    }
  }, true);

  /* ------------------------------------------------- validação dos dados
     Todo dado que um dia possa vir de fora (config, catálogo, URL, futuro
     backend) é tratado como não confiável: tipos conferidos, textos
     limitados, URLs só https e de domínios esperados, caminhos de imagem
     restritos a assets/img/. Isto protege a página; NÃO substitui a
     validação que um backend futuro deverá fazer no servidor.            */
  var RE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var RE_WHATS = /^\d{10,15}$/;
  var RE_HEX = /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i;
  var RE_IMG = /^assets\/img\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+(?:\.[a-z0-9_-]+)*\.(?:webp|avif|png|jpe?g)$/i;
  var HOSTS_MAPA = ["google.com", "google.com.br", "goo.gl", "waze.com"];
  var HOSTS_INSTAGRAM = ["instagram.com"];

  function proprio(obj, chave) { return Object.prototype.hasOwnProperty.call(obj, chave); }

  function texto(v, max) {
    return typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, max) : "";
  }

  function urlSegura(v, hosts) {
    if (typeof v !== "string" || !v) return null;
    try {
      var u = new URL(v);
      if (u.protocol !== "https:") return null;
      var ok = hosts.some(function (h) { return u.hostname === h || u.hostname.slice(-(h.length + 1)) === "." + h; });
      return ok ? u.href : null;
    } catch (e) {
      return null;
    }
  }

  function imagemSegura(v) {
    // limite de tamanho antes da regex: evita custo excessivo com entradas enormes
    return typeof v === "string" && v.length <= 200 && RE_IMG.test(v) ? v : null;
  }

  function lista(v, max) { return Array.isArray(v) ? v.slice(0, max) : []; }

  function sanearConfig(c) {
    c = c && typeof c === "object" ? c : {};
    var padrao = "Olá! Vim pelo site da Olyver Import e preciso de atendimento.";
    var msgProd = texto(c.mensagemProduto, 300);
    return {
      mensagemPadrao: texto(c.mensagemPadrao, 300) || padrao,
      mensagemProduto: msgProd.indexOf("{produto}") >= 0 ? msgProd : "Olá! Vim pelo site da Olyver Import e gostaria de consultar a disponibilidade de: {produto}",
      instagram: urlSegura(c.instagram, HOSTS_INSTAGRAM),
      unidades: lista(c.unidades, 10).filter(function (u) {
        return u && typeof u === "object" && RE_ID.test(u.id) && texto(u.nome, 80);
      }).map(function (u) {
        var numero = String(u.whatsapp || "").replace(/\D/g, "");
        return {
          id: u.id,
          nome: texto(u.nome, 80),
          curto: texto(u.curto, 30) || texto(u.nome, 30),
          descricao: texto(u.descricao, 160),
          whatsapp: RE_WHATS.test(numero) ? numero : null,
          telefone: texto(u.telefone, 30),
          endereco: texto(u.endereco, 200),
          horario: texto(u.horario, 160),
          mapa: urlSegura(u.mapa, HOSTS_MAPA),
          vendas: u.vendas === true
        };
      })
    };
  }

  function sanearCategorias(cats) {
    var vistos = {};
    return lista(cats, 100).filter(function (c) {
      if (!c || typeof c !== "object" || !RE_ID.test(c.id) || vistos[c.id]) return false;
      return (vistos[c.id] = true);
    }).map(function (c) {
      return {
        id: c.id,
        nome: texto(c.nome, 60) || c.id,
        grupo: proprio(GRUPOS, c.grupo) ? c.grupo : "perifericos",
        icone: proprio(window.ICONES || {}, c.icone) ? c.icone : "box",
        imagem: imagemSegura(c.imagem)
      };
    });
  }

  function sanearProdutos(prods) {
    var vistos = {};
    return lista(prods, 2000).filter(function (p) {
      if (!p || typeof p !== "object" || !RE_ID.test(p.id) || vistos[p.id] || !texto(p.nome, 120)) return false;
      return (vistos[p.id] = true);
    }).map(function (p) {
      var specs = Object.create(null); // sem protótipo: chaves como "__proto__" não têm efeito colateral
      var fonte = p.especificacoes && typeof p.especificacoes === "object" ? p.especificacoes : {};
      Object.keys(fonte).slice(0, 40).forEach(function (k) {
        var chave = texto(k, 60), valor = texto(fonte[k], 300);
        if (chave && valor) specs[chave] = valor;
      });
      return {
        id: p.id,
        nome: texto(p.nome, 120),
        marca: texto(p.marca, 40) || "Diversas",
        categoria: RE_ID.test(p.categoria) ? p.categoria : "outros",
        condicao: p.condicao === "Seminovo" ? "Seminovo" : "Novo",
        descricao: texto(p.descricao, 220),
        detalhes: texto(p.detalhes, 1200),
        destaques: lista(p.destaques, 8).map(function (d) { return texto(d, 80); }).filter(Boolean),
        especificacoes: specs,
        preco: typeof p.preco === "number" && isFinite(p.preco) && p.preco >= 0 ? p.preco : null,
        status: proprio(STATUS, p.status) ? p.status : "consultar",
        imagens: lista(p.imagens, 12).map(imagemSegura).filter(Boolean),
        cores: lista(p.cores, 12).filter(function (c) { return c && RE_HEX.test(c.hex); })
          .map(function (c) { return { nome: texto(c.nome, 40), hex: c.hex }; }),
        destaque: p.destaque === true,
        lancamento: p.lancamento === true,
        ordem: typeof p.ordem === "number" && isFinite(p.ordem) ? p.ordem : null
      };
    });
  }

  CFG = sanearConfig(window.OLYVER_CONFIG);
  CATEGORIAS = sanearCategorias(window.CATEGORIAS);
  PRODUTOS = sanearProdutos(window.PRODUTOS);

  var ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Z"/><path d="M9 9.5c.4 2.3 2.2 4.4 5.5 5.5"/></svg>';
  var ICON_SETA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>';
  var ICON_SHARE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  var ICON_FECHAR ='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  /* ---------------------------------------------------------------- cards */
  function cardHTML(p) {
    var cat = categoria(p.categoria);
    var badges = "";
    if (p.lancamento) badges += '<span class="badge badge-new">Lançamento</span>';
    if (p.condicao === "Seminovo") badges += '<span class="badge badge-semi">Seminovo</span>';
    var feats = (p.destaques || []).slice(0, 3).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");

    return '<article class="card">' +
      '<div class="card-media">' + midia(fotos(p)[0], cat.icone, p.nome) +
        (badges ? '<div class="badges">' + badges + "</div>" : "") +
      "</div>" +
      '<div class="card-body">' +
        '<p class="card-brand">' + esc(p.marca) + " · " + esc(cat.nome) + "</p>" +
        '<h3 class="card-title"><button type="button" data-produto="' + esc(p.id) + '">' + esc(p.nome) + "</button></h3>" +
        '<p class="card-desc">' + esc(p.descricao) + "</p>" + coresHTML(p) +
        (feats ? '<ul class="card-feats">' + feats + "</ul>" : "") +
        '<div class="card-foot">' +
          '<div class="card-meta">' + precoHTML(p) + statusHTML(p) + "</div>" +
          '<div class="card-actions">' +
            '<button class="btn btn-outline" type="button" data-produto="' + esc(p.id) + '">Ver detalhes</button>' +
            '<button class="btn btn-wa" type="button" data-consultar="' + esc(p.id) + '" aria-label="Consultar disponibilidade de ' + esc(p.nome) + ' no WhatsApp">' + ICON_WA + "</button>" +
          "</div>" +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function porRelevancia(a, b) {
    var oa = a.ordem == null ? 999 : a.ordem, ob = b.ordem == null ? 999 : b.ordem;
    if (oa !== ob) return oa - ob;
    if (!!b.destaque !== !!a.destaque) return b.destaque ? 1 : -1;
    return PRODUTOS.indexOf(a) - PRODUTOS.indexOf(b);
  }

  // Link para a página de catálogo já filtrada (valores vêm só de dados internos)
  function linkCatalogo(filtros) {
    var params = new URLSearchParams();
    Object.keys(filtros || {}).forEach(function (k) { if (filtros[k]) params.set(k, filtros[k]); });
    var qs = params.toString();
    return "produtos.html" + (qs ? "?" + qs : "");
  }

  /* ---------------------------------------------------------- vitrines */
  function renderCategorias() {
    var itens = [
      { nome: "iPhone", cat: "iphone", icone: "phone" },
      { nome: "iPad", cat: "ipad", icone: "tablet" },
      { nome: "Mac", cat: "mac", icone: "laptop" },
      { nome: "Apple Watch", cat: "apple-watch", icone: "watch" },
      { nome: "AirPods", cat: "airpods", icone: "earbuds" },
      { nome: "JBL", marca: "JBL", icone: "speaker" },
      { nome: "Xiaomi", marca: "Xiaomi", icone: "phone" },
      { nome: "Acessórios", cat: "g:perifericos", icone: "charger" }
    ];
    var el = $("#cat-rail");
    if (!el) return;
    el.innerHTML = itens.map(function (it) {
      var c = it.cat && it.cat.indexOf("g:") !== 0 ? categoria(it.cat) : {};
      var destino = it.marca ? linkCatalogo({ marca: it.marca }) : linkCatalogo({ categoria: it.cat });
      return '<a class="cat-item" role="listitem" href="' + esc(destino) + '">' +
        '<span class="cat-thumb">' + midia(fotoCategoria(c), it.icone, "") + "</span>" + esc(it.nome) + "</a>";
    }).join("");
  }

  function renderDestaques() {
    var el = $("#dest-rail");
    if (!el) return;
    var lista = PRODUTOS.filter(function (p) { return p.destaque || p.lancamento; }).sort(porRelevancia);
    el.innerHTML = lista.map(cardHTML).join("");
    aplicarCores(el);
  }

  function renderApple() {
    // Vitrine no estilo "produto em destaque": título, frase, dois botões e foto grande
    var tiles = [
      { cat: "iphone", cls: "is-hero", txt: "Do iPhone 16 ao iPhone Duo. Novos e seminovos com garantia." },
      { cat: "ipad", txt: "Do iPad mini ao iPad Pro." },
      { cat: "mac", txt: "Notebooks e desktops com Apple Silicon." },
      { cat: "apple-watch", txt: "Series 12, Ultra 4 e SE 3." },
      { cat: "airpods", txt: "AirPods 5, Pro 3 e Max 2." },
      { cat: "acessorios-apple", cls: "is-wide", txt: "Carregadores, cabos e acessórios originais." }
    ];
    var grid = $("#apple-grid");
    if (!grid) return;
    grid.innerHTML = tiles.map(function (t) {
      var c = categoria(t.cat);
      var n = PRODUTOS.filter(function (p) { return p.categoria === c.id; }).length;
      return '<article class="apple-tile reveal ' + (t.cls || "") + '">' +
        '<div class="apple-copy"><h3>' + esc(c.nome) + "</h3><p>" + esc(t.txt) + "</p>" +
          '<div class="apple-ctas">' +
            '<a class="btn btn-sm ' + (t.cls === "is-hero" ? "btn-light" : "btn-dark") + '" href="' + esc(linkCatalogo({ categoria: c.id })) + '">' +
              (n > 1 ? "Ver modelos" : "Ver produtos") + "</a>" +
            '<button class="btn btn-sm ' + (t.cls === "is-hero" ? "btn-ghost" : "btn-outline") + '" type="button" data-consultar-linha="' + esc(c.nome) + '">Consultar</button>' +
          "</div></div>" +
        '<div class="apple-art">' + midia(fotoCategoria(c), c.icone, c.nome) + "</div></article>";
    }).join("");
  }

  function renderMarcas() {
    $$(".brand-products").forEach(function (el) {
      var marca = el.dataset.marca;
      var lista = PRODUTOS.filter(function (p) { return p.marca === marca; }).sort(porRelevancia).slice(0, 3);
      el.innerHTML = lista.map(cardHTML).join("");
      aplicarCores(el);
    });
  }

  function renderPerifericos() {
    var el = $("#per-grid");
    if (!el) return;
    var cats = CATEGORIAS.filter(function (c) { return c.grupo === "perifericos" || c.grupo === "audio"; });
    el.innerHTML = cats.map(function (c) {
      var n = PRODUTOS.filter(function (p) { return p.categoria === c.id; }).length;
      return '<a class="tile reveal" href="' + esc(linkCatalogo({ categoria: c.id })) + '">' +
        window.iconeSVG(c.icone) +
        "<span>" + esc(c.nome) + "<small>" + (n ? n + (n > 1 ? " produtos" : " produto") : "Consulte") + "</small></span></a>";
    }).join("");
  }

  /* ---------------------------------------------------------- modais */
  function abrirModal(dlg) {
    if (!dlg.open) dlg.showModal();
    document.body.classList.add("modal-open");
  }

  function prepararModal(dlg, aoFechar) {
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg || e.target.closest("[data-fechar]")) dlg.close();
    });
    dlg.addEventListener("close", function () {
      if (!$("dialog[open]")) document.body.classList.remove("modal-open");
      if (aoFechar) aoFechar();
    });
  }

  var modalProduto = $("#modal-produto");
  var modalContato = $("#modal-contato");

  // Histórico: abrir um produto cria uma entrada; "voltar" (navegador ou gesto
  // do celular) fecha a janela em vez de sair do site.
  var entradaPropria = false;    // a entrada atual do histórico foi criada por nós
  var fechandoPorHistorico = false;

  function urlComProduto(id) {
    var params = new URLSearchParams(location.search);
    if (id) params.set("produto", id); else params.delete("produto");
    var qs = params.toString();
    return location.pathname + (qs ? "?" + qs : "") + location.hash;
  }

  function relacionados(p) {
    var mesmaCat = PRODUTOS.filter(function (o) { return o.id !== p.id && o.categoria === p.categoria; });
    var mesmaMarca = PRODUTOS.filter(function (o) { return o.id !== p.id && o.categoria !== p.categoria && o.marca === p.marca; });
    return mesmaCat.sort(porRelevancia).concat(mesmaMarca.sort(porRelevancia)).slice(0, 4);
  }

  function abrirProduto(id, viaHistorico) {
    var p = produto(id);
    if (!p) return;
    var cat = categoria(p.categoria);
    var imgs = fotos(p);

    var slides = imgs.map(function (src, i) {
      return '<div class="pm-slide" role="group" aria-label="Imagem ' + (i + 1) + " de " + imgs.length + '">' +
        midia(src, cat.icone, p.nome + (imgs.length > 1 ? " — imagem " + (i + 1) : ""), i === 0) + "</div>";
    }).join("");
    var thumbs = imgs.length > 1 ? '<div class="pm-thumbs">' + imgs.map(function (src, i) {
      return '<button type="button" data-slide="' + i + '" aria-label="Ver imagem ' + (i + 1) + '"' + (i === 0 ? ' aria-current="true"' : "") + ">" +
        midia(src, cat.icone, "") + "</button>";
    }).join("") + "</div>" : "";

    var feats = (p.destaques || []).map(function (f) { return "<li>" + esc(f) + "</li>"; }).join("");
    var specs = Object.keys(p.especificacoes || {}).map(function (k) {
      return "<dt>" + esc(k) + "</dt><dd>" + esc(p.especificacoes[k]) + "</dd>";
    }).join("");
    specs = "<dt>Marca</dt><dd>" + esc(p.marca) + "</dd><dt>Categoria</dt><dd>" + esc(cat.nome) + "</dd>" +
      (p.condicao ? "<dt>Condição</dt><dd>" + esc(p.condicao) + (p.condicao === "Seminovo" ? " · 1 ano de garantia" : "") + "</dd>" : "") + specs;

    var unidades = unidadesVenda();
    var cta = unidades.length === 1
      ? '<a class="btn btn-wa" target="_blank" rel="noopener noreferrer" href="' + linkWhats(unidades[0].whatsapp, msgProduto(p)) + '">' + ICON_WA + "Consultar disponibilidade</a>"
      : '<p class="pm-cta-label">Consultar disponibilidade pelo WhatsApp</p><div class="pm-units">' + unidades.map(function (u) {
          return '<a class="btn btn-wa" target="_blank" rel="noopener noreferrer" href="' + linkWhats(u.whatsapp, msgProduto(p)) + '">' + ICON_WA + esc(u.curto) + "</a>";
        }).join("") + "</div>";

    $("#pm-conteudo").innerHTML =
      '<button class="icon-btn icon-btn-light modal-close" type="button" data-fechar aria-label="Fechar">' + ICON_FECHAR + "</button>" +
      '<div class="pm-gallery"><div class="pm-main" tabindex="0" aria-label="Galeria de imagens">' + slides + "</div>" + thumbs + "</div>" +
      '<div class="pm-info">' +
        '<p class="card-brand">' + esc(p.marca) + " · " + esc(cat.nome) + (p.lancamento ? " · Lançamento" : "") + "</p>" +
        '<h2 id="pm-nome" tabindex="-1">' + esc(p.nome) + "</h2>" +
        '<p class="pm-desc">' + esc(p.detalhes || p.descricao) + "</p>" +
        '<div class="pm-price-row">' + precoHTML(p) + statusHTML(p) + "</div>" +
        (feats ? '<div class="pm-section"><h3>Principais características</h3><ul class="pm-feats">' + feats + "</ul></div>" : "") +
        '<div class="pm-section"><h3>Especificações</h3><dl class="specs">' + specs + "</dl>" +
          '<p class="specs-note">Especificações de referência do fabricante; podem variar conforme modelo e região.</p></div>' +
        relacionadosHTML(p) +
        '<button class="link-btn pm-share" type="button" data-compartilhar="' + esc(p.id) + '">' + ICON_SHARE + "Compartilhar produto</button>" +
        '<p class="sr-only" id="pm-aviso" aria-live="polite"></p>' +
        '<div class="pm-cta">' + cta + "</div>" +
      "</div>";

    ligarGaleria();
    var jaAberto = modalProduto.open;
    abrirModal(modalProduto);
    modalProduto.querySelector(".pm-info").scrollTop = 0;
    modalProduto.querySelector(".modal-inner").scrollTop = 0;
    if (jaAberto) modalProduto.querySelector("#pm-nome").focus({ preventScroll: true });

    if (!viaHistorico) {
      if (jaAberto) {
        history.replaceState({ produto: p.id }, "", urlComProduto(p.id)); // troca de produto relacionado
      } else {
        history.pushState({ produto: p.id }, "", urlComProduto(p.id));
        entradaPropria = true;
      }
    }
    document.title = p.nome + " | Olyver Import";
  }

  function relacionadosHTML(p) {
    var rel = relacionados(p);
    if (!rel.length) return "";
    return '<div class="pm-section"><h3>Você também pode gostar</h3><ul class="pm-related">' + rel.map(function (o) {
      var c = categoria(o.categoria);
      return '<li><button type="button" data-produto="' + esc(o.id) + '">' +
        '<span class="pm-related-media">' + midia(fotos(o)[0], c.icone, "") + "</span>" +
        "<span>" + esc(o.nome) + "</span></button></li>";
    }).join("") + "</ul></div>";
  }

  function compartilhar(id) {
    var p = produto(id);
    if (!p) return;
    var url = location.origin + urlComProduto(p.id);
    var aviso = function (t) { var el = $("#pm-aviso"); if (el) { el.textContent = t; el.classList.remove("sr-only"); el.classList.add("pm-aviso"); } };
    if (navigator.share) {
      navigator.share({ title: p.nome + " | Olyver Import", url: url }).catch(function () {});
    } else if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(function () { aviso("Link copiado."); }, function () { aviso("Não foi possível copiar o link."); });
    } else {
      aviso(url);
    }
  }

  var tituloOriginal = document.title;
  prepararModal(modalProduto, function () {
    document.title = tituloOriginal;
    if (fechandoPorHistorico) { fechandoPorHistorico = false; return; }
    if (entradaPropria) {
      entradaPropria = false;
      history.back(); // remove a entrada do produto
      // Alguns navegadores ignoram history.back() sem gesto do usuário:
      // se a URL ainda tiver o produto, limpa mesmo assim.
      setTimeout(function () {
        if (!modalProduto.open && new URLSearchParams(location.search).has("produto")) {
          history.replaceState(null, "", urlComProduto(null));
        }
      }, 300);
    } else {
      history.replaceState(null, "", urlComProduto(null)); // produto veio no link de entrada
    }
  });

  window.addEventListener("popstate", function (e) {
    var id = e.state && e.state.produto;
    if (id && produto(id)) { entradaPropria = true; abrirProduto(id, true); return; }
    if (modalProduto.open) { fechandoPorHistorico = true; entradaPropria = false; modalProduto.close(); }
  });
  prepararModal(modalContato);

  function ligarGaleria() {
    var main = $(".pm-main", modalProduto);
    var thumbs = $$(".pm-thumbs button", modalProduto);
    if (!thumbs.length) return;
    thumbs.forEach(function (b) {
      b.addEventListener("click", function () {
        main.scrollTo({ left: main.clientWidth * +b.dataset.slide, behavior: "smooth" });
      });
    });
    var raf;
    main.addEventListener("scroll", function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        var i = Math.round(main.scrollLeft / main.clientWidth);
        thumbs.forEach(function (b, j) { b.setAttribute("aria-current", String(i === j)); });
      });
    });
  }

  function abrirContato(p) {
    var unidades = p ? unidadesVenda() : CFG.unidades.filter(function (u) { return u.whatsapp; });
    var msg = p ? msgProduto(p) : CFG.mensagemPadrao;
    if (unidades.length === 1) { window.open(linkWhats(unidades[0].whatsapp, msg), "_blank", "noopener,noreferrer"); return; }

    $("#mc-titulo").textContent = p ? "Consultar disponibilidade" : "Falar conosco";
    $("#mc-sub").textContent = p ? p.nome + " — escolha a unidade e continue no WhatsApp." : "Escolha a unidade e continue no WhatsApp.";
    $("#mc-opcoes").innerHTML = unidades.length ? unidades.map(function (u) {
      return '<a class="sheet-option" target="_blank" rel="noopener noreferrer" href="' + linkWhats(u.whatsapp, msg) + '">' +
        "<span><strong>" + esc(u.nome) + "</strong><small>" + esc(u.descricao || u.endereco || "Vendas e atendimento") + "</small></span>" + ICON_SETA + "</a>";
    }).join("") : "<p>Atendimento por WhatsApp indisponível no momento.</p>"; // sem números em js/config.js
    abrirModal(modalContato);
  }

  $("#mc-opcoes").addEventListener("click", function (e) {
    if (e.target.closest("a")) modalContato.close();
  });

  document.addEventListener("click", function (e) {
    var b;
    if ((b = e.target.closest("[data-produto]"))) { abrirProduto(b.dataset.produto); return; }
    if ((b = e.target.closest("[data-compartilhar]"))) { compartilhar(b.dataset.compartilhar); return; }
    if ((b = e.target.closest("[data-consultar]"))) { abrirContato(produto(b.dataset.consultar)); return; }
    if ((b = e.target.closest("[data-consultar-linha]"))) { abrirContato({ nome: b.dataset.consultarLinha }); return; }
    if ((b = e.target.closest("[data-contato]"))) { fecharMenu(); abrirContato(null); }
  });

  /* ---------------------------------------------------------- contato */
  function renderContato() {
    var ICON = {
      pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
      tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
      hora: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
    };
    function linha(icone, rotulo, valor) {
      return "<div>" + ICON[icone] + "<dl><dt>" + rotulo + "</dt><dd" + (valor ? "" : ' class="pending"') + ">" +
        (valor ? esc(valor) : "A informar") + "</dd></dl></div>";
    }
    var grade = $("#contact-grid");
    if (!grade) return;
    grade.innerHTML = CFG.unidades.map(function (u) {
      var lab = !u.vendas;
      return '<article class="contact-card reveal' + (lab ? " is-lab" : "") + '">' +
        "<div><h3>" + esc(u.nome) + "</h3>" +
        '<p class="contact-desc">' + esc(u.descricao || "Vendas, consultas e atendimento.") + "</p></div>" +
        '<div class="contact-info">' +
          linha("pin", "Endereço", u.endereco) +
          linha("tel", "Telefone", u.telefone) +
          linha("hora", "Horário", u.horario) +
        "</div>" +
        (u.mapa ? '<a class="link-arrow" href="' + esc(u.mapa) + '" target="_blank" rel="noopener noreferrer">Como chegar</a>' : "") +
        (u.whatsapp
          ? '<a class="btn ' + (lab ? "btn-gold" : "btn-wa") + '" target="_blank" rel="noopener noreferrer" href="' + linkWhats(u.whatsapp, CFG.mensagemPadrao) + '">' +
            ICON_WA + (lab ? "Falar com o laboratório" : "Chamar no WhatsApp") + "</a>"
          : '<p class="contact-desc">WhatsApp a informar.</p>') +
      "</article>";
    }).join("");

    if (CFG.instagram) {
      var s = $("#contact-social");
      s.hidden = false;
      s.innerHTML = '<a class="link-arrow" href="' + esc(CFG.instagram) + '" target="_blank" rel="noopener noreferrer">Siga a Olyver no Instagram</a>';
    }

    var lab = CFG.unidades.filter(function (u) { return !u.vendas; })[0];
    var cta = $("#lab-cta");
    if (cta && lab && lab.whatsapp) {
      cta.href = linkWhats(lab.whatsapp, CFG.mensagemPadrao);
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
    }
  }

  /* ---------------------------------------------------------- navegação */
  var toggle = $(".menu-toggle");
  var menu = $("#menu");

  // Com o menu mobile aberto, o resto da página fica inerte (o foco do teclado
  // não "vaza" para trás do menu)
  function inerte(sim) {
    ["#conteudo", ".site-footer", ".fab"].forEach(function (s) { var el = $(s); if (el) el.inert = sim; });
  }

  function fecharMenu(devolverFoco) {
    if (!menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menu");
    document.body.style.overflow = "";
    inerte(false);
    if (devolverFoco === true) toggle.focus();
  }

  toggle.addEventListener("click", function () {
    var abrir = !menu.classList.contains("is-open");
    if (!abrir) return fecharMenu(true);
    menu.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Fechar menu");
    document.body.style.overflow = "hidden";
    inerte(true);
    var primeiro = menu.querySelector("a");
    if (primeiro) primeiro.focus();
  });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) fecharMenu(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") fecharMenu(true); });
  matchMedia("(min-width: 961px)").addEventListener("change", fecharMenu);

  // Link ativo no menu conforme a seção visível
  function observarSecoes() {
    if (!("IntersectionObserver" in window)) return;
    var links = $$('.main-nav a[href^="#"]');
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        links.forEach(function (l) { l.setAttribute("aria-current", String(l.getAttribute("href") === "#" + id)); });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    links.forEach(function (l) {
      var s = document.querySelector(l.getAttribute("href"));
      if (s) io.observe(s);
    });
  }

  // Trilhos com setas
  function ligarTrilhos() {
    $$(".rail-controls").forEach(function (ctrl) {
      var rail = document.getElementById(ctrl.dataset.rail);
      ctrl.addEventListener("click", function (e) {
        var b = e.target.closest("[data-dir]");
        if (b) rail.scrollBy({ left: +b.dataset.dir * rail.clientWidth * .8, behavior: "smooth" });
      });
    });
  }

  // Animações de entrada
  function observarReveal() {
    var els = $$(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (el) { el.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  // Botão flutuante some na área de contato
  function ligarFab() {
    var fab = $(".fab");
    if (!fab || !("IntersectionObserver" in window)) return;
    var visiveis = {};
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) { visiveis[en.target === $("#contato") ? "contato" : "rodape"] = en.isIntersecting; });
      fab.classList.toggle("is-hidden", Object.keys(visiveis).some(function (k) { return visiveis[k]; }));
    });
    ["#contato", ".site-footer"].forEach(function (s) { if ($(s)) io.observe($(s)); });
  }

  /* ---------------------------------------------------------- início */
  // Em caso de falha, o visitante vê uma mensagem genérica (sem detalhes
  // técnicos) e o conteúdo fica visível; nada é registrado no console.
  function falhaGenerica() {
    $$(".reveal").forEach(function (el) { el.classList.add("is-in"); });
    var vazio = $("#vazio");
    if (vazio && $("#grid") && !$("#grid").children.length) {
      $("#f-contagem").textContent = "";
      vazio.hidden = false;
      $(".empty-title", vazio).textContent = "Não foi possível exibir o catálogo agora.";
    }
  }

  // Busca da página inicial → página de catálogo com o termo (o formulário nunca é enviado;
  // a CSP bloqueia envio com form-action 'none')
  var buscaHome = $("#busca-home");
  if (buscaHome) {
    buscaHome.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = texto($("#busca-home-q").value, 80);
      location.href = q ? linkCatalogo({ q: q }) : "produtos.html#busca";
    });
  }

  // Atalho "/" para buscar: na página de produtos foca o campo; nas outras, abre o catálogo
  document.addEventListener("keydown", function (e) {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || $("dialog[open]")) return;
    var ativo = document.activeElement;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(ativo.tagName) || ativo.isContentEditable) return;
    e.preventDefault();
    var busca = $("#f-busca");
    if (busca) busca.focus();
    else location.href = "produtos.html#busca";
  });

  // Funções compartilhadas com js/catalogo.js (somente leitura). Os dados já
  // passaram pela validação acima; ninguém de fora consegue trocá-los.
  window.Olyver = Object.freeze({
    produtos: Object.freeze(PRODUTOS.slice()),
    categorias: Object.freeze(CATEGORIAS.slice()),
    grupos: Object.freeze(Object.assign({}, GRUPOS)),
    marcasPrincipais: Object.freeze(MARCAS_PRINCIPAIS.slice()),
    status: Object.freeze(Object.assign({}, STATUS)),
    categoria: categoria,
    cardHTML: cardHTML,
    aplicarCores: aplicarCores,
    porRelevancia: porRelevancia,
    esc: esc,
    normalizar: normalizar,
    texto: texto,
    proprio: proprio,
    fecharMenu: fecharMenu,
    falhaGenerica: falhaGenerica,
    abrirProduto: function (id) { if (produto(id)) abrirProduto(id); }
  });

  try {
    renderCategorias();
    renderDestaques();
    renderApple();
    renderMarcas();
    renderPerifericos();
    renderContato();
    ligarTrilhos();
    observarSecoes();
    observarReveal();
    ligarFab();
    $("#ano").textContent = new Date().getFullYear();

    // Link direto para um produto: a página de fundo fica sem o parâmetro e o
    // produto entra como nova entrada do histórico (voltar fecha a janela).
    var inicial = new URLSearchParams(location.search).get("produto");
    if (inicial) {
      history.replaceState(null, "", urlComProduto(null));
      if (produto(inicial)) abrirProduto(inicial);
    }
  } catch (e) {
    falhaGenerica();
  }
})();
