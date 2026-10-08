/* ==========================================================================
   Olyver Import — Ilustrações provisórias (usadas enquanto não há foto)
   Traços simples em SVG; herdam a cor via currentColor.
   ========================================================================== */

window.ICONES = {
  phone:      '<rect x="17" y="6" width="30" height="52" rx="7"/><path d="M28 10h8"/>',
  tablet:     '<rect x="10" y="8" width="44" height="48" rx="5"/><circle cx="32" cy="52" r=".8"/>',
  laptop:     '<rect x="12" y="14" width="40" height="27" rx="3"/><path d="M5 47h54l-3 4H8z"/>',
  watch:      '<rect x="19" y="18" width="26" height="28" rx="7"/><path d="M24 18l2-10h12l2 10M24 46l2 10h12l2-10M45 28h2v6h-2"/>',
  earbuds:    '<path d="M22 12a7 7 0 0 1 7 7v4a7 7 0 0 1-5 6.7V50a3 3 0 0 1-6 0V19a7 7 0 0 1 4-7"/><path d="M42 12a7 7 0 0 0-7 7v4a7 7 0 0 0 5 6.7V50a3 3 0 0 0 6 0V19a7 7 0 0 0-4-7"/>',
  headphones: '<path d="M12 40V32a20 20 0 0 1 40 0v8"/><rect x="10" y="38" width="10" height="16" rx="4"/><rect x="44" y="38" width="10" height="16" rx="4"/>',
  speaker:    '<rect x="8" y="20" width="48" height="24" rx="12"/><circle cx="22" cy="32" r="6"/><circle cx="42" cy="32" r="6"/>',
  charger:    '<rect x="18" y="20" width="28" height="30" rx="6"/><path d="M26 20v-8M38 20v-8M29 36h6"/>',
  cable:      '<path d="M14 10v12a6 6 0 0 0 6 6h24a6 6 0 0 1 6 6v20"/><rect x="10" y="4" width="8" height="8" rx="2"/><rect x="46" y="52" width="8" height="8" rx="2"/>',
  adapter:    '<rect x="14" y="22" width="36" height="20" rx="6"/><path d="M8 32h6M50 32h6M24 32h4M36 32h4"/>',
  battery:    '<rect x="16" y="10" width="32" height="46" rx="7"/><path d="M26 30l6-8v8h6l-6 8v-8z"/>',
  case:       '<rect x="16" y="6" width="32" height="52" rx="8"/><rect x="21" y="11" width="10" height="12" rx="3"/>',
  shield:     '<rect x="17" y="6" width="30" height="52" rx="7"/><path d="M22 18l20 20M22 30l14 14"/>',
  stand:      '<rect x="22" y="8" width="20" height="34" rx="4"/><path d="M32 42v10M20 56h24"/>',
  keyboard:   '<rect x="6" y="20" width="52" height="26" rx="4"/><path d="M12 28h2M20 28h2M28 28h2M36 28h2M44 28h2M50 28h2M12 34h2M20 34h2M28 34h2M36 34h2M44 34h2M20 40h24"/>',
  mouse:      '<rect x="20" y="10" width="24" height="44" rx="12"/><path d="M32 10v12"/>',
  box:        '<path d="M10 22l22-10 22 10v22L32 54 10 44z"/><path d="M10 22l22 10 22-10M32 32v22"/>'
};

window.iconeSVG = function (nome, extraClass) {
  // Só aceita nomes da lista acima (nunca insere texto externo no SVG)
  var p = Object.prototype.hasOwnProperty.call(window.ICONES, nome) ? window.ICONES[nome] : window.ICONES.box;
  return '<svg class="illus ' + (extraClass || "") + '" viewBox="0 0 64 64" aria-hidden="true">' + p + "</svg>";
};
