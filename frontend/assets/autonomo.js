document.addEventListener("DOMContentLoaded", () => {

  // opções do SELECT
  const opcoesLinha = ["Selecione", "Sim", "Não"];

   //  menu de todos os js -
  document.getElementById("menu-nav").innerHTML = `
    <a href="index.html" class="active">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Graficos</a>
  `;
  
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

    // PEGA O NÚMERO DA EQUIPE QUE JÁ DEVE ESTAR SALVO
    const numEquipe = localStorage.getItem('numEquipeAtual');
    
    if (!numEquipe) {
      alert("❌ Número da equipe não encontrado! Volte à página inicial e selecione uma equipe.");
      return;
    }

    // SALVAR DADOS NO MESMO FORMATO DO ENDGAME
    const dadosAutonomo = {
      linha: linhaVal,
      artefatosMedievais: document.getElementById("artefatosMedievais").value,
      artefatosPreHistoricos: document.getElementById("artefatosPreHistoricos").value
    };

    // Estrutura COMPATÍVEL com o grafico.js
    const dadosCompletos = {
      num_equipe: numEquipe,
      estrategia: "", // O autônomo não tem estratégia ainda
      dados: {
        autonomo: dadosAutonomo  // ← Estrutura correta!
      }
    };

    // Salva no LocalStorage na MESMA chave 'scouts'
    try {
      // Pega scouts existentes ou cria array vazio
      const scoutsExistentes = JSON.parse(localStorage.getItem('scouts')) || [];
      
      // Verifica se já existe um scout para esta equipe
      const scoutExistenteIndex = scoutsExistentes.findIndex(scout => scout.num_equipe === numEquipe);
      
      if (scoutExistenteIndex !== -1) {
        // Atualiza scout existente (adiciona autonomo ao scout)
        scoutsExistentes[scoutExistenteIndex].dados.autonomo = dadosAutonomo;
        console.log("✅ Dados autônomos ATUALIZADOS para equipe:", numEquipe);
      } else {
        // Cria novo scout
        scoutsExistentes.push(dadosCompletos);
        console.log("✅ NOVO scout autônomo criado para equipe:", numEquipe);
      }
      
      // Salva de volta no localStorage
      localStorage.setItem('scouts', JSON.stringify(scoutsExistentes));
      
      console.log('💾 Dados autônomos salvos com sucesso!', dadosCompletos);
      
      // Avança para teleop
      window.location.href = "teleop.html";
      
    } catch (error) {
      console.error('❌ Erro ao salvar dados autônomos:', error);
      alert('Erro ao salvar dados. Verifique o console.');
    }
  });

});