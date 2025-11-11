// frontend/assets/inicio.js
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-inicio");
  const btnProximo = document.getElementById("btnProximo");

  // pré-preencher se já houver registro
  const reg = AppStorage.getRegistro();
  if (reg) {
    if (reg.numPartida && document.getElementById("numPartida")) document.getElementById("numPartida").value = reg.numPartida;
    if (reg.tipoPartida && document.getElementById("tipoPartida")) document.getElementById("tipoPartida").value = reg.tipoPartida;
    if (reg.numEquipe && document.getElementById("numEquipe")) document.getElementById("numEquipe").value = reg.numEquipe;
    if (reg.corAlianca && document.getElementById("corAlianca")) document.getElementById("corAlianca").value = reg.corAlianca;
    if (reg.posicao && document.getElementById("posicao")) document.getElementById("posicao").value = reg.posicao;
    if (reg.nomeScout && document.getElementById("nomeScout")) document.getElementById("nomeScout").value = reg.nomeScout;
  }

  if (btnProximo) {
    btnProximo.addEventListener("click", (e) => {
      e.preventDefault();
      // validações básicas
      const numPartida = document.getElementById("numPartida").value.trim();
      const tipoPartida = document.getElementById("tipoPartida").value.trim();
      const numEquipe = document.getElementById("numEquipe").value.trim();
      const corAlianca = document.getElementById("corAlianca").value.trim();
      const posicao = document.getElementById("posicao").value.trim();
      const nomeScout = document.getElementById("nomeScout").value.trim();

      if (!numPartida || !tipoPartida || !numEquipe || !corAlianca || !posicao || !nomeScout) {
        alert("Por favor preencha todos os campos da página inicial antes de prosseguir.");
        return;
      }

      // salvar metadados (top-level)
      AppStorage.saveMeta({
        numPartida: numPartida,
        tipoPartida: tipoPartida,
        numEquipe: Number(numEquipe),
        corAlianca,
        posicao,
        nomeScout,
        timestamp: new Date().toISOString()
      });

      // salvar também como parte dos dados.inicio para histórico
      AppStorage.savePartial("inicio", {
        numPartida, tipoPartida, numEquipe: Number(numEquipe), corAlianca, posicao, nomeScout
      });

      // ir para Autônomo
      window.location.href = "autonomo.html";
    });
  }

});
