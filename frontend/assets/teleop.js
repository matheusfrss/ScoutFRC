// frontend/assets/teleop.js
document.addEventListener("DOMContentLoaded", () => {
  const btnVoltar = document.getElementById("btnVoltar");
  const btnProximo = document.getElementById("btnProximo");

  // preenche se já houver algo
  const reg = AppStorage.getRegistro();
  if (reg && reg.dados && reg.dados.teleop) {
    const t = reg.dados.teleop;
    if (document.getElementById("teleopMedieval")) document.getElementById("teleopMedieval").value = t.artefatosMedievais ?? 0;
    if (document.getElementById("teleopPreHistorico")) document.getElementById("teleopPreHistorico").value = t.artefatosPreHistoricos ?? 0;
  }

  if (btnVoltar) {
    btnVoltar.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "autonomo.html";
    });
  }

  if (btnProximo) {
    btnProximo.addEventListener("click", (e) => {
      e.preventDefault();
      const artefatosMedievais = Number(document.getElementById("teleopMedieval").value || 0);
      const artefatosPreHistoricos = Number(document.getElementById("teleopPreHistorico").value || 0);

      AppStorage.savePartial("teleop", {
        artefatosMedievais,
        artefatosPreHistoricos
      });

      // segue para End Game onde o registro será finalizado/enviado
      window.location.href = "endgame.html";
    });
  }
});
