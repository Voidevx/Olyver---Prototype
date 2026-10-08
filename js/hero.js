/* Hero: escolhe o vídeo da logo animada conforme a tela (faixa 3:1 no desktop, 4:3 no celular)
   e o toca sempre que ele aparece na tela (reinicia quando o usuário volta a rolar até ele).

   Regra de ouro: a logo NUNCA pode sumir. O primeiro quadro do vídeo é vazio (só o fundo),
   então ele só é exibido enquanto o vídeo está de fato tocando. Em qualquer outra situação
   (movimento reduzido, economia de dados, autoplay bloqueado — ex.: Modo de Pouca Energia
   do iPhone —, erro de rede ou de decodificação) fica o poster, que é o quadro final com a logo. */
(function () {
  var v = document.getElementById("hero-video");
  if (!v) return;
  var mobile = window.matchMedia("(max-width: 760px)").matches;
  var nome = mobile ? "olyver-hero-mobile" : "olyver-hero-wide";
  v.poster = "assets/img/hero/" + nome + ".jpg";

  var conexao = navigator.connection || {};
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || conexao.saveData) return;

  v.muted = true; // propriedade, além do atributo: exigido por alguns navegadores para autoplay
  var desistiu = false;

  // Volta ao poster de forma definitiva (remove o vídeo; o navegador mostra o poster de novo)
  function usarPoster() {
    if (desistiu) return;
    desistiu = true;
    clearInterval(vigia);
    if (io) io.disconnect();
    v.pause();
    v.removeAttribute("src");
    v.load();
  }

  // Mostra o quadro final (logo completa) sem depender do poster
  function irParaFim() {
    if (isFinite(v.duration) && v.duration > 0) v.currentTime = Math.max(0, v.duration - 0.05);
  }

  function tocar(doInicio) {
    if (desistiu) return;
    if (doInicio && v.readyState > 0) v.currentTime = 0;
    var p = v.play();
    if (p && p.catch) p.catch(usarPoster); // autoplay bloqueado → poster com a logo
    vigiar();
  }

  // Vigia: se o vídeo travar (rede lenta, decodificação falhando) por 3 s sem ter
  // terminado — antes de começar ou no meio da animação —, fica o poster com a logo.
  var vigia = null;
  function vigiar() {
    clearInterval(vigia);
    var ultimo = -1, parado = 0;
    vigia = setInterval(function () {
      if (desistiu || v.ended || (v.paused && !visivel)) { clearInterval(vigia); return; }
      if (v.currentTime === ultimo) {
        if (++parado >= 3) usarPoster();
      } else {
        ultimo = v.currentTime;
        parado = 0;
      }
    }, 1000);
  }

  v.addEventListener("error", usarPoster);
  v.src = "assets/video/" + nome + ".mp4";

  var io = null;
  if (!("IntersectionObserver" in window)) { visivel = true; tocar(false); return; }

  // Toca ao entrar na tela; ao sair por completo, para no quadro final (logo visível) e
  // recomeça do início na próxima vez que o usuário voltar até ele.
  var visivel = false, jaTocou = false;
  io = new IntersectionObserver(function (entradas) {
    var e = entradas[entradas.length - 1];
    if (e.intersectionRatio >= 0.6 && !visivel) {
      visivel = true;
      tocar(jaTocou);
      jaTocou = true;
    } else if (e.intersectionRatio === 0 && visivel) {
      visivel = false;
      v.pause();
      irParaFim();
    }
  }, { threshold: [0, 0.6] });
  io.observe(v);
})();
