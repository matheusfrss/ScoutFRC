document.addEventListener("DOMContentLoaded", () => {

  // Menu de navegação
  document.getElementById("menu-nav").innerHTML = `
    <a href="index.html">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html" class="active">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Gráficos</a>
  `;

  // Botão Voltar
  document.getElementById("btnVoltar").addEventListener("click", () => {
    window.location.href = 'autonomo.html';
  });

  // Botão Próximo
  document.getElementById("btnProximo").addEventListener("click", () => {
    // ✅ PEGA O NÚMERO DA EQUIPE SALVO NA PÁGINA INICIAL
    const numEquipe = localStorage.getItem('numEquipeAtual');
    
    if (!numEquipe) {
      alert("❌ Número da equipe não encontrado! Volte à página inicial e selecione uma equipe.");
      return;
    }

    // Captura os dados do formulário
    const dadosTeleop = {
      medieval: document.getElementById("teleopMedieval").value || "0",
      preHistorico: document.getElementById("teleopPreHistorico").value || "0"
    };

    // Estrutura compatível com o grafico.js
    const dadosCompletos = {
      num_equipe: numEquipe,
      estrategia: "", // O teleop não tem estratégia ainda
      dados: {
        teleop: dadosTeleop  // ← Estrutura correta!
      }
    };

    // SALVA NO LOCALSTORAGE 
    try {
      // Pega scouts existentes ou cria array vazio
      const scoutsExistentes = JSON.parse(localStorage.getItem('scouts')) || [];
      
      // Verifica se já existe um scout para esta equipe
      const scoutExistenteIndex = scoutsExistentes.findIndex(scout => scout.num_equipe === numEquipe);
      
      if (scoutExistenteIndex !== -1) {
        // ✅ ATUALIZA scout existente (adiciona/mantém teleop)
        scoutsExistentes[scoutExistenteIndex].dados.teleop = dadosTeleop;
        console.log("✅ Teleop ATUALIZADO para equipe:", numEquipe);
      } else {
        // Cria novo scout
        scoutsExistentes.push(dadosCompletos);
        console.log("✅ NOVO scout com Teleop criado para equipe:", numEquipe);
      }
      
      // Salva de volta no localStorage
      localStorage.setItem('scouts', JSON.stringify(scoutsExistentes));
      
      console.log('💾 Teleop salvo com sucesso!', dadosCompletos);
      
      // Avança para End Game
      window.location.href = 'endgame.html';
      
    } catch (error) {
      console.error('❌ Erro ao salvar Teleop:', error);
      alert('Erro ao salvar dados. Verifique o console.');
    }
  });

  // Permitir Enter para navegar
  document.getElementById("form-teleop").addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById("btnProximo").click();
    }
  });
});