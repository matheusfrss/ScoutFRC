document.addEventListener("DOMContentLoaded", () => {

  // opções do SELECT
  const opcoesLinha = ["Selecione", "Sim", "Não"];

  function preencherSelectPlaceholder(id, lista) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = ""; 
    lista.forEach((valor, idx) => {
      const option = document.createElement("option");
      option.textContent = valor;
      // placeholder: valor vazio
      if (idx === 0 && /selecion|selecione/i.test(valor)) {
        option.value = "";
        option.selected = true;
        option.disabled = true;
      } else {
        option.value = valor;
      }
      select.appendChild(option);
    });
  }

  preencherSelectPlaceholder("linha", opcoesLinha);

  // voltar e Próximo (com validação simples)
  document.getElementById("btnVoltar").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  document.getElementById("btnProximo").addEventListener("click", () => {
    const linhaVal = document.getElementById("linha").value;
    // placeholder, impede avançar
    if (!linhaVal) {
      alert("Por favor, selecione se o robô ultrapassou a linha de largada.");
      return;
    }

    // SALVAR DADOS AUTÔNOMOS NO LOCALSTORAGE
    const dadosAutonomo = {
      linha: linhaVal,
      artefatosMedievais: document.getElementById("artefatosMedievais").value,
      artefatosPreHistoricos: document.getElementById("artefatosPreHistoricos").value
    };
    
    localStorage.setItem('dadosAutonomo', JSON.stringify(dadosAutonomo));
    console.log("💾 Dados autônomos salvos:", dadosAutonomo);

    window.location.href = "teleop.html";
  });

});