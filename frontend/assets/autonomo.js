// frontend/assets/autonomo.js
document.addEventListener("DOMContentLoaded", () => {
  const btnVoltar = document.getElementById("btnVoltar");
  const btnProximo = document.getElementById("btnProximo");

  // preenche se já existente
  const reg = AppStorage.getRegistro();
  if (reg && reg.dados && reg.dados.autonomo) {
    const a = reg.dados.autonomo;
    if (document.getElementById("linha")) document.getElementById("linha").value = a.linha || "";
    if (document.getElementById("artefatosMedievais")) document.getElementById("artefatosMedievais").value = a.artefatosMedievais ?? 0;
    if (document.getElementById("artefatosPreHistoricos")) document.getElementById("artefatosPreHistoricos").value = a.artefatosPreHistoricos ?? 0;
  }

  if (btnVoltar) {
    btnVoltar.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "index.html";
    });
  }

  if (btnProximo) {
    btnProximo.addEventListener("click", (e) => {
      e.preventDefault();
      const linha = document.getElementById("linha").value;
      const artefatosMedievais = Number(document.getElementById("artefatosMedievais").value || 0);
      const artefatosPreHistoricos = Number(document.getElementById("artefatosPreHistoricos").value || 0);

      // valida se deseja (opcional)
      if (!linha) {
        alert("Selecione se o robô ultrapassou a linha de largada (Sim/Não).");
        return;
      }

      AppStorage.savePartial("autonomo", {
        linha,
        artefatosMedievais,
        artefatosPreHistoricos
      });

      // próximo passo
      window.location.href = "teleoperado.html";
    });
  }
});
