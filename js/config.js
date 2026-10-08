/* ==========================================================================
   Olyver Import — Configurações da loja
   Edite aqui os dados de contato. Campos com null aparecem como
   "A informar" no site até serem preenchidos.
   ========================================================================== */

window.OLYVER_CONFIG = {
  nome: "Olyver Import",
  slogan: "A escolha certa",

  // Ex.: "https://instagram.com/olyverimport"
  instagram: null,

  // Mensagem padrão enviada ao abrir o WhatsApp
  mensagemPadrao: "Olá! Vim pelo site da Olyver Import e preciso de atendimento.",
  mensagemProduto: "Olá! Vim pelo site da Olyver Import e gostaria de consultar a disponibilidade de: {produto}",

  // Unidades de atendimento. O número de WhatsApp (só dígitos, com DDI e DDD, ex.: "5511999999999") é público. Está em branco (null) neste repositório: preencha com o seu número comercial.
  // "vendas: true" aparece na escolha de loja
  // ao consultar um produto.
  unidades: [
    {
      id: "paragominas",
      nome: "Olyver Import Paragominas",
      curto: "Paragominas",
      whatsapp: null,
      telefone: null,
      endereco: null,
      horario: null,
      mapa: null, // link do Google Maps
      vendas: true
    },
    {
      id: "tailandia",
      nome: "Olyver Import Tailândia",
      curto: "Tailândia",
      whatsapp: null,
      telefone: null,
      endereco: null,
      horario: null,
      mapa: null,
      vendas: true
    },
    {
      id: "lab",
      nome: "Olyver Lab",
      curto: "Laboratório",
      descricao: "Diagnóstico, reparo e suporte técnico.",
      whatsapp: null,
      telefone: null,
      endereco: null,
      horario: null,
      mapa: null,
      vendas: false
    }
  ]
};
