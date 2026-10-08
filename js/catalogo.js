/* ==========================================================================
   Olyver Import — Página de catálogo (produtos.html)
   Busca com sugestões, filtros combináveis com contagem (facetas), ordenação,
   grade/lista, filtros ativos removíveis e estado sincronizado com a URL.
   Usa os dados JÁ VALIDADOS expostos por js/app.js (window.Olyver).
   ========================================================================== */
(function () {
  "use strict";

  var O = window.Olyver;
  if (!O || !document.getElementById("facetas")) return;

  var PRODUTOS = O.produtos;
  var esc = O.esc, normalizar = O.normalizar;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ------------------------------------------------- atributos derivados
     Armazenamento e RAM saem das especificações (ex.: "256 GB, 512 GB ou 1 TB").
     Valores ≥ 64 GB contam como armazenamento; ≤ 32 GB, como memória RAM.  */
  function tamanhos(texto) {
    var out = [], re = /(\d+(?:[.,]\d+)?)\s*(GB|TB)\b/gi, m;
    while ((m = re.exec(texto))) out.push(Math.round(parseFloat(m[1].replace(",", ".")) * (m[2].toUpperCase() === "TB" ? 1024 : 1)));
    return out;
  }

  var ATR = {}; // id → { arm: [GB], ram: [GB], texto: string normalizado p/ busca, nome: string normalizado }
  PRODUTOS.forEach(function (p) {
    var arm = {}, ram = {};
    var specs = p.especificacoes || {};
    Object.keys(specs).forEach(function (k) {
      var chave = normalizar(k);
      if (/armazenamento|capacidade/.test(chave)) tamanhos(specs[k]).forEach(function (g) { if (g >= 64) arm[g] = 1; });
      if (/\bram\b|memoria/.test(chave)) tamanhos(specs[k]).forEach(function (g) { if (g <= 32) ram[g] = 1; });
    });
    var cat = O.categoria(p.categoria);
    var specsTexto = Object.keys(specs).map(function (k) { return k + " " + specs[k]; }).join(" ");
    ATR[p.id] = {
      arm: Object.keys(arm).map(Number),
      ram: Object.keys(ram).map(Number),
      nome: normalizar(p.nome),
      marcaCat: normalizar(p.marca + " " + cat.nome),
      resto: normalizar([p.descricao, p.detalhes, p.condicao, (p.destaques || []).join(" "), specsTexto].join(" "))
    };
  });

  function rotuloGB(g) { return g >= 1024 ? (g / 1024) + " TB" : g + " GB"; }
  function chaveGB(g) { return g >= 1024 ? (g / 1024) + "tb" : g + "gb"; }
  function deChaveGB(s) {
    var m = /^(\d{1,4})(gb|tb)$/.exec(s || "");
    return m ? parseInt(m[1], 10) * (m[2] === "tb" ? 1024 : 1) : null;
  }

  /* ------------------------------------------------- definição das facetas */
  var temPrecos = PRODUTOS.some(function (p) { return typeof p.preco === "number"; });

  function valoresUnicos(fn) {
    var vistos = {};
    PRODUTOS.forEach(function (p) { [].concat(fn(p)).forEach(function (v) { if (v != null && v !== "") vistos[v] = 1; }); });
    return Object.keys(vistos);
  }

  var FACETAS = [
    {
      id: "marca", titulo: "Marca", param: "marca",
      opcoes: valoresUnicos(function (p) { return p.marca; }).sort(function (a, b) {
        var ia = O.marcasPrincipais.indexOf(a), ib = O.marcasPrincipais.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b, "pt-BR");
      }).map(function (m) { return { valor: m, rotulo: m === "Diversas" ? "Outras marcas" : m }; }),
      de: function (p) { return [p.marca]; }
    },
    {
      id: "categoria", titulo: "Categoria", param: "categoria", agrupada: true,
      opcoes: O.categorias.filter(function (c) {
        return PRODUTOS.some(function (p) { return p.categoria === c.id; });
      }).map(function (c) { return { valor: c.id, rotulo: c.nome, grupo: c.grupo }; }),
      de: function (p) { return [p.categoria]; }
    },
    {
      id: "condicao", titulo: "Condição", param: "condicao",
      opcoes: [{ valor: "Novo", rotulo: "Novo" }, { valor: "Seminovo", rotulo: "Seminovo · 1 ano de garantia" }],
      de: function (p) { return [p.condicao]; }
    },
    {
      id: "armazenamento", titulo: "Armazenamento", param: "armazenamento", chips: true,
      opcoes: valoresUnicos(function (p) { return ATR[p.id].arm; }).map(Number).sort(function (a, b) { return a - b; })
        .map(function (g) { return { valor: chaveGB(g), rotulo: rotuloGB(g) }; }),
      de: function (p) { return ATR[p.id].arm.map(chaveGB); }
    },
    {
      id: "ram", titulo: "Memória RAM", param: "ram", chips: true,
      opcoes: valoresUnicos(function (p) { return ATR[p.id].ram; }).map(Number).sort(function (a, b) { return a - b; })
        .map(function (g) { return { valor: chaveGB(g), rotulo: rotuloGB(g) }; }),
      de: function (p) { return ATR[p.id].ram.map(chaveGB); }
    },
    {
      id: "status", titulo: "Disponibilidade", param: "status",
      opcoes: valoresUnicos(function (p) { return p.status; }).map(function (s) { return { valor: s, rotulo: O.status[s] || s }; }),
      de: function (p) { return [p.status]; }
    },
    {
      id: "selecao", titulo: "Seleção", param: "selecao",
      opcoes: [{ valor: "lancamento", rotulo: "Lançamentos" }, { valor: "destaque", rotulo: "Destaques da loja" }],
      de: function (p) { var v = []; if (p.lancamento) v.push("lancamento"); if (p.destaque) v.push("destaque"); return v; }
    }
  ].filter(function (f) { return f.opcoes.length >= 2; }); // faceta com 1 opção não ajuda a filtrar

  var FACETA = {};
  FACETAS.forEach(function (f) { FACETA[f.id] = f; f.permitidos = f.opcoes.map(function (o) { return o.valor; }); });

  /* ------------------------------------------------- estado */
  var ORDENS = $$("#f-ordem option").map(function (o) { return o.value; });
  if (!temPrecos) {
    $$('#f-ordem option[value$="preco"]').forEach(function (o) { o.remove(); });
    ORDENS = ORDENS.filter(function (o) { return !/preco$/.test(o); });
  }

  var estado = novoEstado();
  function novoEstado() {
    var s = { q: "", min: "", max: "", ordem: "relevancia", vista: "grade", sel: {} };
    FACETAS.forEach(function (f) { s.sel[f.id] = []; });
    return s;
  }

  function lerURL() {
    var p = new URLSearchParams(location.search);
    estado = novoEstado();
    estado.q = O.texto(p.get("q"), 80);
    FACETAS.forEach(function (f) {
      var vals = (p.get(f.param) || "").split(",").map(function (v) { return v.trim(); }).filter(Boolean).slice(0, 20);
      // Compatível com os atalhos da página inicial: categoria=g:<grupo> seleciona o grupo inteiro
      if (f.id === "categoria") {
        vals = vals.reduce(function (acc, v) {
          if (v.indexOf("g:") === 0 && O.proprio(O.grupos, v.slice(2))) {
            return acc.concat(f.opcoes.filter(function (o) { return o.grupo === v.slice(2); }).map(function (o) { return o.valor; }));
          }
          return acc.concat(v);
        }, []);
      }
      // Só valores da lista permitida (parâmetro de URL é entrada não confiável)
      estado.sel[f.id] = vals.filter(function (v, i, a) { return f.permitidos.indexOf(v) >= 0 && a.indexOf(v) === i; });
    });
    var num = function (v) { return /^\d{1,7}$/.test(v || "") ? v : ""; };
    estado.min = temPrecos ? num(p.get("min")) : "";
    estado.max = temPrecos ? num(p.get("max")) : "";
    estado.ordem = ORDENS.indexOf(p.get("ordem")) >= 0 ? p.get("ordem") : "relevancia";
    estado.vista = p.get("vista") === "lista" ? "lista" : "grade";
  }

  function salvarURL() {
    var atual = new URLSearchParams(location.search);
    var p = new URLSearchParams();
    if (estado.q) p.set("q", estado.q);
    FACETAS.forEach(function (f) { if (estado.sel[f.id].length) p.set(f.param, estado.sel[f.id].join(",")); });
    if (estado.min) p.set("min", estado.min);
    if (estado.max) p.set("max", estado.max);
    if (estado.ordem !== "relevancia") p.set("ordem", estado.ordem);
    if (estado.vista === "lista") p.set("vista", "lista");
    if (atual.get("produto")) p.set("produto", atual.get("produto")); // janela de produto aberta
    var qs = p.toString();
    history.replaceState(history.state, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
  }

  /* ------------------------------------------------- busca e filtragem */
  function termos() {
    var q = normalizar(estado.q).trim();
    return q ? q.split(/\s+/).slice(0, 8) : [];
  }

  // Pontua a relevância: nome vale mais que marca/categoria, que vale mais que descrição e especificações.
  // Retorna -1 se algum termo não aparece em lugar nenhum (busca exige todos os termos).
  function pontuar(p, ts) {
    if (!ts.length) return 0;
    var a = ATR[p.id], total = 0;
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i];
      if (a.nome.indexOf(t) === 0) total += 6;
      else if (a.nome.indexOf(t) > 0) total += 4;
      else if (a.marcaCat.indexOf(t) >= 0) total += 2;
      else if (a.resto.indexOf(t) >= 0) total += 1;
      else return -1;
    }
    return total;
  }

  // Um produto passa se atende a todas as facetas (OR dentro de cada faceta), exceto a ignorada
  function passa(p, ignorar) {
    for (var i = 0; i < FACETAS.length; i++) {
      var f = FACETAS[i], sel = estado.sel[f.id];
      if (f.id === ignorar || !sel.length) continue;
      var vals = f.de(p), ok = false;
      for (var j = 0; j < vals.length && !ok; j++) ok = sel.indexOf(vals[j]) >= 0;
      if (!ok) return false;
    }
    if (temPrecos && (estado.min || estado.max)) {
      var min = parseFloat(estado.min), max = parseFloat(estado.max);
      if (!isNaN(min) && !isNaN(max) && min > max) { var t = min; min = max; max = t; }
      if (typeof p.preco !== "number") return false;
      if (!isNaN(min) && p.preco < min) return false;
      if (!isNaN(max) && p.preco > max) return false;
    }
    return true;
  }

  var pontos = {};
  function filtrar() {
    var ts = termos();
    pontos = {};
    var lista = PRODUTOS.filter(function (p) {
      var s = pontuar(p, ts);
      if (s < 0) return false;
      pontos[p.id] = s;
      return passa(p);
    });
    var semPreco = function (v, dir) { return typeof v === "number" ? v : dir * Infinity; };
    switch (estado.ordem) {
      case "nome": lista.sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); }); break;
      case "menor-preco": lista.sort(function (a, b) { return semPreco(a.preco, 1) - semPreco(b.preco, 1); }); break;
      case "maior-preco": lista.sort(function (a, b) { return semPreco(b.preco, -1) - semPreco(a.preco, -1); }); break;
      case "lancamentos": lista.sort(function (a, b) { return (b.lancamento ? 1 : 0) - (a.lancamento ? 1 : 0) || O.porRelevancia(a, b); }); break;
      default: lista.sort(function (a, b) { return (pontos[b.id] - pontos[a.id]) || O.porRelevancia(a, b); });
    }
    return lista;
  }

  // Contagem de cada opção considerando a busca e os OUTROS filtros (facetas).
  // Reaproveita a pontuação calculada em filtrar(): produto fora da busca não está em "pontos".
  function contar(f) {
    var cont = {};
    PRODUTOS.forEach(function (p) {
      if (pontos[p.id] === undefined || !passa(p, f.id)) return;
      f.de(p).forEach(function (v) { cont[v] = (cont[v] || 0) + 1; });
    });
    return cont;
  }

  /* ------------------------------------------------- render: facetas */
  var ICON_CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  function opcaoHTML(f, o, n) {
    var marcado = estado.sel[f.id].indexOf(o.valor) >= 0;
    var desab = !n && !marcado;
    var idc = "f-" + f.id + "-" + o.valor.replace(/[^a-z0-9]/gi, "");
    if (f.chips) {
      return '<button type="button" class="chip-filtro" data-faceta="' + f.id + '" data-valor="' + esc(o.valor) + '" aria-pressed="' + marcado + '"' +
        (desab ? " disabled" : "") + ">" + esc(o.rotulo) + "</button>";
    }
    return '<label class="opcao' + (desab ? " is-off" : "") + '" for="' + idc + '">' +
      '<input type="checkbox" id="' + idc + '" data-faceta="' + f.id + '" value="' + esc(o.valor) + '"' + (marcado ? " checked" : "") + (desab ? " disabled" : "") + ">" +
      '<span class="caixa" aria-hidden="true">' + ICON_CHECK + "</span>" +
      '<span class="opcao-rotulo">' + esc(o.rotulo) + "</span>" +
      '<span class="opcao-n">' + (n || 0) + "</span></label>";
  }

  function renderFacetas() {
    var abertas = {};
    $$("#facetas details").forEach(function (d) { abertas[d.dataset.faceta] = d.open; });

    var html = FACETAS.map(function (f) {
      var cont = contar(f);
      var corpo;
      if (f.agrupada) {
        corpo = Object.keys(O.grupos).map(function (g) {
          var ops = f.opcoes.filter(function (o) { return o.grupo === g; });
          if (!ops.length) return "";
          return '<p class="faceta-grupo">' + esc(O.grupos[g]) + "</p>" + ops.map(function (o) { return opcaoHTML(f, o, cont[o.valor]); }).join("");
        }).join("");
      } else {
        corpo = f.opcoes.map(function (o) { return opcaoHTML(f, o, cont[o.valor]); }).join("");
      }
      var n = estado.sel[f.id].length;
      var aberta = abertas[f.id] !== undefined ? abertas[f.id] : (f.id !== "status" && f.id !== "selecao") || n > 0;
      return '<details class="faceta" data-faceta="' + f.id + '"' + (aberta ? " open" : "") + ">" +
        "<summary>" + esc(f.titulo) + (n ? ' <span class="faceta-n">' + n + "</span>" : "") + "</summary>" +
        '<fieldset><legend class="sr-only">' + esc(f.titulo) + "</legend>" +
        '<div class="faceta-corpo' + (f.chips ? " is-chips" : "") + '">' + corpo + "</div></fieldset></details>";
    }).join("");

    if (temPrecos) {
      html += '<details class="faceta" data-faceta="preco" open><summary>Preço</summary><div class="faceta-corpo preco">' +
        '<label><span class="sr-only">Preço mínimo</span><input type="number" inputmode="numeric" min="0" id="f-min" placeholder="Mín." value="' + esc(estado.min) + '"></label>' +
        '<span aria-hidden="true">—</span>' +
        '<label><span class="sr-only">Preço máximo</span><input type="number" inputmode="numeric" min="0" id="f-max" placeholder="Máx." value="' + esc(estado.max) + '"></label></div></details>';
    }
    $("#facetas").innerHTML = html;
  }

  /* ------------------------------------------------- render: resultados */
  var POR_PAGINA = 24;
  var limite = POR_PAGINA;
  var ultima = [];

  function totalFiltros() {
    return FACETAS.reduce(function (n, f) { return n + estado.sel[f.id].length; }, 0) + (estado.min ? 1 : 0) + (estado.max ? 1 : 0);
  }

  function renderAtivos() {
    var itens = [];
    if (estado.q) itens.push({ tipo: "q", rotulo: "“" + estado.q + "”" });
    FACETAS.forEach(function (f) {
      estado.sel[f.id].forEach(function (v) {
        var o = f.opcoes.filter(function (x) { return x.valor === v; })[0];
        itens.push({ tipo: f.id, valor: v, rotulo: (f.chips ? f.titulo + ": " : "") + (o ? o.rotulo : v) });
      });
    });
    if (estado.min) itens.push({ tipo: "min", rotulo: "A partir de R$ " + estado.min });
    if (estado.max) itens.push({ tipo: "max", rotulo: "Até R$ " + estado.max });

    var ul = $("#filtros-ativos");
    ul.hidden = !itens.length;
    ul.innerHTML = itens.map(function (it) {
      return '<li><button type="button" class="ativo" data-remover="' + esc(it.tipo) + '"' + (it.valor ? ' data-valor="' + esc(it.valor) + '"' : "") +
        ' aria-label="Remover filtro ' + esc(it.rotulo) + '">' + esc(it.rotulo) +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button></li>';
    }).join("") + (itens.length > 1 ? '<li><button type="button" class="link-btn" data-limpar-tudo>Limpar tudo</button></li>' : "");

    var n = totalFiltros();
    var cont = $("#contador-filtros");
    cont.hidden = !n;
    cont.textContent = n;
    $$(".painel-topo [data-limpar-tudo]").forEach(function (b) { b.hidden = !(n || estado.q); });
  }

  function renderResultados(manterLimite) {
    if (!manterLimite) limite = POR_PAGINA;
    var lista = ultima = filtrar();
    var grid = $("#grid");
    grid.classList.toggle("is-lista", estado.vista === "lista");
    grid.innerHTML = lista.slice(0, limite).map(O.cardHTML).join("");
    O.aplicarCores(grid);
    atualizarMais();

    var n = lista.length;
    $("#f-contagem").textContent = n === 1 ? "1 produto encontrado" : n + " produtos encontrados";
    $("#ver-resultados").textContent = n ? "Ver " + n + (n === 1 ? " resultado" : " resultados") : "Nenhum resultado";
    $("#vazio").hidden = n > 0;
    if (!n) renderVazio();

    $$("[data-vista]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.vista === estado.vista)); });
    $("#f-ordem").value = estado.ordem;
    var campo = $("#f-busca");
    if (campo.value !== estado.q && document.activeElement !== campo) campo.value = estado.q;

    renderFacetas();
    renderAtivos();
    renderAtalhos();
    salvarURL();
  }

  function atualizarMais() {
    var resto = ultima.length - limite, b = $("#f-mais");
    b.hidden = resto <= 0;
    if (resto > 0) b.textContent = "Mostrar mais (" + resto + (resto === 1 ? " produto)" : " produtos)");
  }

  function mostrarMais() {
    var antes = limite;
    limite += POR_PAGINA;
    var grid = $("#grid");
    grid.insertAdjacentHTML("beforeend", ultima.slice(antes, limite).map(O.cardHTML).join(""));
    O.aplicarCores(grid);
    atualizarMais();
    var novo = grid.children[antes] && grid.children[antes].querySelector(".card-title button");
    if (novo) novo.focus({ preventScroll: true });
  }

  // Sem resultados: sugere buscas que existem no catálogo
  function renderVazio() {
    var txt = estado.q ? "Nada encontrado para “" + estado.q + "”" + (totalFiltros() ? " com os filtros escolhidos." : ".") : "Nenhum produto com essa combinação de filtros.";
    $("#vazio .empty-title").textContent = txt;
    var sugestoes = ["iPhone", "AirPods", "iPad", "JBL", "Carregadores", "Seminovo"];
    $("#vazio-sugestoes").innerHTML = '<p>Experimente:</p>' + sugestoes.map(function (s) {
      return '<button type="button" class="chip" data-buscar="' + esc(s) + '">' + esc(s) + "</button>";
    }).join("");
  }

  // Atalhos de categoria no topo (categorias com produto), com o estado atual marcado
  function renderAtalhos() {
    var f = FACETA.categoria;
    if (!f) return;
    var principais = ["iphone", "ipad", "mac", "apple-watch", "airpods", "caixas-de-som", "fones", "smartphones", "carregadores"];
    $("#atalhos-cat").innerHTML = principais.filter(function (id) { return f.permitidos.indexOf(id) >= 0; }).map(function (id) {
      var o = f.opcoes.filter(function (x) { return x.valor === id; })[0];
      var ativo = estado.sel.categoria.length === 1 && estado.sel.categoria[0] === id;
      return '<button type="button" class="chip chip-escuro" data-atalho="' + esc(id) + '" aria-pressed="' + ativo + '">' + esc(o.rotulo) + "</button>";
    }).join("");
  }

  /* ------------------------------------------------- sugestões da busca (combobox) */
  var sugAtiva = -1, sugLista = [];

  function renderSugestoes() {
    var campo = $("#f-busca"), ul = $("#sugestoes");
    var ts = termos();
    sugLista = ts.length ? PRODUTOS.map(function (p) { return { p: p, s: pontuar(p, ts) }; })
      .filter(function (x) { return x.s >= 0; })
      .sort(function (a, b) { return b.s - a.s || O.porRelevancia(a.p, b.p); })
      .slice(0, 6).map(function (x) { return x.p; }) : [];
    sugAtiva = -1;
    if (!sugLista.length || document.activeElement !== campo) return fecharSugestoes();
    ul.innerHTML = sugLista.map(function (p, i) {
      var c = O.categoria(p.categoria);
      return '<li role="option" id="sug-' + i + '" aria-selected="false" data-produto-sug="' + esc(p.id) + '">' +
        '<span class="sug-nome">' + esc(p.nome) + '</span><span class="sug-meta">' + esc(p.marca + " · " + c.nome) + "</span></li>";
    }).join("");
    ul.hidden = false;
    campo.setAttribute("aria-expanded", "true");
  }

  function fecharSugestoes() {
    var ul = $("#sugestoes");
    ul.hidden = true;
    ul.innerHTML = "";
    sugAtiva = -1;
    $("#f-busca").setAttribute("aria-expanded", "false");
    $("#f-busca").removeAttribute("aria-activedescendant");
  }

  function moverSugestao(d) {
    if (!sugLista.length) return;
    sugAtiva = (sugAtiva + d + sugLista.length) % sugLista.length;
    $$("#sugestoes [role=option]").forEach(function (li, i) { li.setAttribute("aria-selected", String(i === sugAtiva)); });
    $("#f-busca").setAttribute("aria-activedescendant", "sug-" + sugAtiva);
  }

  function abrirSugestao(id) {
    fecharSugestoes();
    O.abrirProduto(id);
  }

  /* ------------------------------------------------- gaveta de filtros (celular) */
  var gaveta = $("#gaveta-filtros");
  var painel = $("#painel-filtros");

  function abrirGaveta() {
    $("#gaveta-corpo").appendChild(painel);
    gaveta.showModal();
    document.body.classList.add("modal-open");
  }

  // Devolve o painel à lateral. Idempotente: roda no fechamento pelos botões,
  // pelo Esc ("cancel") e pelo evento "close", qualquer que chegue primeiro.
  function restaurarPainel() {
    if (painel.parentNode !== $("#lateral")) $("#lateral").appendChild(painel);
    if (!$("dialog[open]")) document.body.classList.remove("modal-open");
  }

  function fecharGaveta() {
    if (gaveta.open) gaveta.close();
    restaurarPainel();
    var r = $("#resultados");
    if (r) r.focus({ preventScroll: true });
  }

  gaveta.addEventListener("close", restaurarPainel);
  gaveta.addEventListener("cancel", function () { setTimeout(restaurarPainel, 0); });
  gaveta.addEventListener("click", function (e) {
    if (e.target === gaveta || e.target.closest("[data-fechar]")) fecharGaveta();
  });
  matchMedia("(min-width: 961px)").addEventListener("change", function (e) { if (e.matches && gaveta.open) fecharGaveta(); });

  /* ------------------------------------------------- eventos */
  function alternar(lista, v) {
    var i = lista.indexOf(v);
    if (i >= 0) lista.splice(i, 1); else lista.push(v);
  }

  var tBusca, tPreco;

  $("#busca").addEventListener("submit", function (e) {
    e.preventDefault();
    clearTimeout(tBusca);
    if (sugAtiva >= 0) return abrirSugestao(sugLista[sugAtiva].id);
    estado.q = O.texto($("#f-busca").value, 80);
    fecharSugestoes();
    renderResultados();
    $("#resultados").focus({ preventScroll: true });
    $("#resultados").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });

  $("#f-busca").addEventListener("input", function (e) {
    clearTimeout(tBusca);
    var v = e.target.value;
    tBusca = setTimeout(function () { estado.q = O.texto(v, 80); renderResultados(); renderSugestoes(); }, 150);
  });
  $("#f-busca").addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); if ($("#sugestoes").hidden) renderSugestoes(); moverSugestao(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); moverSugestao(-1); }
    else if (e.key === "Escape" && !$("#sugestoes").hidden) { e.preventDefault(); e.stopPropagation(); fecharSugestoes(); }
  });
  $("#f-busca").addEventListener("focus", renderSugestoes);
  $("#f-busca").addEventListener("blur", function () { setTimeout(fecharSugestoes, 150); });
  $("#sugestoes").addEventListener("mousedown", function (e) {
    var li = e.target.closest("[data-produto-sug]");
    if (li) { e.preventDefault(); abrirSugestao(li.dataset.produtoSug); }
  });

  // Checkboxes das facetas (delegação: o painel é recriado a cada atualização)
  painel.addEventListener("change", function (e) {
    var el = e.target;
    if (el.matches("input[type=checkbox][data-faceta]") && FACETA[el.dataset.faceta]) {
      var f = FACETA[el.dataset.faceta];
      if (f.permitidos.indexOf(el.value) < 0) return;
      alternar(estado.sel[f.id], el.value);
      var foco = el.id;
      renderResultados();
      var novo = document.getElementById(foco);
      if (novo) novo.focus();
    }
  });
  painel.addEventListener("input", function (e) {
    if (e.target.id !== "f-min" && e.target.id !== "f-max") return;
    clearTimeout(tPreco);
    var id = e.target.id, v = e.target.value;
    tPreco = setTimeout(function () {
      estado[id === "f-min" ? "min" : "max"] = /^\d{0,7}$/.test(v) ? v : "";
      renderResultados();
      var novo = document.getElementById(id);
      if (novo) novo.focus();
    }, 350);
  });

  document.addEventListener("click", function (e) {
    var b;
    if ((b = e.target.closest(".chip-filtro[data-faceta]"))) {
      var f = FACETA[b.dataset.faceta];
      if (!f || f.permitidos.indexOf(b.dataset.valor) < 0) return;
      alternar(estado.sel[f.id], b.dataset.valor);
      renderResultados();
      var mesmo = $('.chip-filtro[data-faceta="' + f.id + '"][data-valor="' + b.dataset.valor + '"]');
      if (mesmo) mesmo.focus();
      return;
    }
    if ((b = e.target.closest("[data-remover]"))) {
      var tipo = b.dataset.remover;
      if (tipo === "q") { estado.q = ""; $("#f-busca").value = ""; }
      else if (tipo === "min" || tipo === "max") estado[tipo] = "";
      else if (FACETA[tipo]) alternar(estado.sel[tipo], b.dataset.valor);
      renderResultados();
      $("#resultados").focus({ preventScroll: true });
      return;
    }
    if ((b = e.target.closest("[data-limpar-tudo]"))) {
      var ordem = estado.ordem, vista = estado.vista;
      estado = novoEstado();
      estado.ordem = ordem; estado.vista = vista;
      $("#f-busca").value = "";
      renderResultados();
      return;
    }
    if ((b = e.target.closest("[data-atalho]"))) {
      var id = b.dataset.atalho;
      var ativo = estado.sel.categoria.length === 1 && estado.sel.categoria[0] === id;
      estado.sel.categoria = ativo ? [] : [id];
      renderResultados();
      return;
    }
    if ((b = e.target.closest("[data-buscar]"))) {
      estado = novoEstado();
      estado.q = O.texto(b.dataset.buscar, 80);
      $("#f-busca").value = estado.q;
      renderResultados();
      return;
    }
    if ((b = e.target.closest("[data-vista]"))) {
      estado.vista = b.dataset.vista === "lista" ? "lista" : "grade";
      renderResultados(true);
      return;
    }
    if (e.target.closest(".abrir-filtros")) { abrirGaveta(); return; }
    if (e.target.closest("[data-focar-busca]")) { e.preventDefault(); O.fecharMenu(); focarBusca(); }
  });

  $("#f-ordem").addEventListener("change", function (e) {
    estado.ordem = ORDENS.indexOf(e.target.value) >= 0 ? e.target.value : "relevancia";
    renderResultados();
  });
  $("#f-mais").addEventListener("click", mostrarMais);

  function focarBusca() {
    var campo = $("#f-busca");
    campo.scrollIntoView({ behavior: "auto", block: "center" });
    campo.focus({ preventScroll: true });
  }

  /* ------------------------------------------------- início */
  try {
    lerURL();
    renderResultados();
    if (location.hash === "#busca") focarBusca();
  } catch (e) {
    O.falhaGenerica();
  }
})();
