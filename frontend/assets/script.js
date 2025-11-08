document.addEventListener("DOMContentLoaded", () => {

  //  menu de todos os js -
  document.getElementById("menu-nav").innerHTML = `
    <a href="index.html" class="active">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Graficos</a>
  `;

  // listas automáticas para preencher selects
  const tiposPartida = ["Selecione", "Playoff", "Treino", "Qualificatórias", "Semifinais"];
  const cores = ["Selecione", "Vermelha", "Azul"];
  const posicoes = ["1", "2", "3"];

  /**
   Função para preencher selects dinamicamente
   Se o id for "corAliança", aplica cor às opções
   */
  function preencherSelect(id, lista) {
    const select = document.getElementById(id);

    lista.forEach(valor => {
      const option = document.createElement("option");
      option.textContent = valor;
      option.value = valor;

      //  estilo individual para a cor da aliança
      if (id === "corAliança") {
        if (valor === "Vermelha") {
          option.style.color = "red";
        } else if (valor === "Azul") {
          option.style.color = "blue";
        }
      }

      select.appendChild(option);
    });
  }

  // preenchendo selects da tela de início
  preencherSelect("tipoPartida", tiposPartida);
  preencherSelect("corAliança", cores);
  preencherSelect("posicao", posicoes);

  //  botão "Próximo"
  document.getElementById("btnProximo").addEventListener("click", () => {
    // SALVAR NÚMERO DA EQUIPE NO LOCALSTORAGE
    const numEquipe = document.getElementById("numEquipe").value;
    if (numEquipe) {
      localStorage.setItem('numEquipe', numEquipe);
      console.log("💾 Número da equipe salvo:", numEquipe);
    }

    window.location.href = "autonomo.html";
  });

});