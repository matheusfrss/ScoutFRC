document.addEventListener("DOMContentLoaded", () => {

  // menu igual em todas as páginas
  document.getElementById("menu-nav").innerHTML = `
    <a href="index.html">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html" class="active">Teleoperado</a>
    <a href="endgame.html">End Game</a>
  `;

  // botões de navegação
  document.getElementById("btnVoltar").addEventListener("click", () => {
    window.location.href = "autonomo.html";
  });

  document.getElementById("btnProximo").addEventListener("click", () => {

    // validação para impedir o usuario de passar sem preencher algo
    const medieval = parseInt(document.getElementById("teleopMedieval").value);
    const preHistorico = parseInt(document.getElementById("teleopPreHistorico").value);

    if (medieval < 0 || preHistorico < 0) {
      alert("Os valores não podem ser negativos!");
      return;
    }

    // SALVAR DADOS TELEOPERADOS NO LOCALSTORAGE
    const dadosTeleop = {
      medieval: medieval,
      preHistorico: preHistorico
    };
    
    localStorage.setItem('dadosTeleop', JSON.stringify(dadosTeleop));
    console.log("💾 Dados teleoperados salvos:", dadosTeleop);

    window.location.href = "endgame.html";
  });

});