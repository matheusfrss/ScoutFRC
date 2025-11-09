// executa o código somente depois que todo o HTML tiver carregado
document.addEventListener("DOMContentLoaded", () => {
  
  document.getElementById("menu-nav").innerHTML = `
    <a href="index.html" class="active">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Gráficos</a>
  `;

  // lista com todas as perguntas/campos do EndGame
  const config = [
    {
      labelId: "labelCompleto",
      label: "Estacionou completamente no poço de escavação?",
      selectId: "estacionouCompleto",
      opcoes: ["Selecione", "Sim", "Não"],
      chave: "labelCompleto"
    },
    {
      labelId: "labelParcial",
      label: "Estacionou parcialmente no sítio arqueológico?",
      selectId: "estacionouParcial",
      opcoes: ["Selecione", "Sim", "Não"],
      chave: "labelParcial"
    },
    {
      labelId: "labelParou",
      label: "O robô parou?",
      selectId: "roboParou",
      opcoes: ["Selecione", "Sim", "Não"],
      chave: "parou"
    },
    {
      labelId: "labelPenalidades",
      label: "Penalidades:",
      inputId: "penalidades",
      tipo: "input",
      chave: "penalidades"
    },
    {
      labelId: "labelEstrategia",
      label: "Estratégia do robô:",
      selectId: "estrategia",
      opcoes: ["Selecione", "Robô de defesa", "Robô de ataque"],
      chave: "estrategia"
    },
    {
      labelId: "labelObservacoes",
      label: "Observações:",
      inputId: "observacoes",
      tipo: "textarea",
      chave: "observacoes"
    }
  ];

  // percorre cada item da lista e adiciona o conteúdo na tela
  config.forEach(campo => {
    // preenche o texto do label no HTML
    document.getElementById(campo.labelId).textContent = campo.label;

    // se o campo for um select (possui opcoes), adiciona as opções nele
    if (campo.opcoes) {
      const select = document.getElementById(campo.selectId);

      campo.opcoes.forEach(op => {
        const option = document.createElement("option");
        option.textContent = op;

        // valor vazio para "Selecione"
        option.value = op.toLowerCase() === "selecione" ? "" : op.toLowerCase();

        select.appendChild(option);
      });
    }
  });

  // botão finalizar - CORRIGIDO
  document.getElementById("finalizarBtn").addEventListener("click", () => {
    // ✅ PEGA O NÚMERO DA EQUIPE SALVO NA PÁGINA INICIAL
    const numEquipe = localStorage.getItem('numEquipeAtual');
    
    if (!numEquipe) {
      alert("❌ Número da equipe não encontrado! Volte à página inicial e selecione uma equipe.");
      return;
    }

    const dadosEndgame = {};

    // captura os dados do formulário
    config.forEach(campo => {
      const elemento =
        document.getElementById(campo.selectId) ||
        document.getElementById(campo.inputId);

      if (elemento) {
        dadosEndgame[campo.chave] = elemento.value.trim();
      }
    });

    // Validação dos campos obrigatórios
    if (!dadosEndgame.labelCompleto || !dadosEndgame.labelParcial || !dadosEndgame.parou || !dadosEndgame.estrategia) {
      alert("❌ Por favor, preencha todos os campos obrigatórios do End Game.");
      return;
    }

    // Estrutura compatível com o grafico.js
    const dadosCompletos = {
      num_equipe: numEquipe,
      estrategia: dadosEndgame.estrategia,
      dados: {
        endgame: {
          labelCompleto: dadosEndgame.labelCompleto,
          labelParcial: dadosEndgame.labelParcial,
          parou: dadosEndgame.parou,
          penalidades: dadosEndgame.penalidades || "0"
        }
      },
      observacoes: dadosEndgame.observacoes || ""
    };

    // SALVA NO LOCALSTORAGE 
    try {
      // Pega scouts existentes ou cria array vazio
      const scoutsExistentes = JSON.parse(localStorage.getItem('scouts')) || [];
      
      // Verifica se já existe um scout para esta equipe
      const scoutExistenteIndex = scoutsExistentes.findIndex(scout => scout.num_equipe === numEquipe);
      
      if (scoutExistenteIndex !== -1) {
        // ✅ ATUALIZA scout existente (adiciona/mantém endgame)
        scoutsExistentes[scoutExistenteIndex].dados.endgame = dadosCompletos.dados.endgame;
        scoutsExistentes[scoutExistenteIndex].estrategia = dadosCompletos.estrategia;
        scoutsExistentes[scoutExistenteIndex].observacoes = dadosCompletos.observacoes;
        console.log("✅ EndGame ATUALIZADO para equipe:", numEquipe);
      } else {
        // Cria novo scout
        scoutsExistentes.push(dadosCompletos);
        console.log("✅ NOVO scout com EndGame criado para equipe:", numEquipe);
      }
      
      // Salva de volta no localStorage
      localStorage.setItem('scouts', JSON.stringify(scoutsExistentes));
      
      console.log('💾 EndGame salvo com sucesso!', dadosCompletos);
      alert('Dados do End Game salvos com sucesso!');
      
      // Redireciona para a página de gráficos
      window.location.href = 'graficos.html';
      
    } catch (error) {
      console.error('❌ Erro ao salvar EndGame:', error);
      alert('Erro ao salvar dados. Verifique o console.');
    }
  });

  // Botão Voltar
  document.getElementById("voltarBtn").addEventListener("click", () => {
    window.location.href = 'teleop.html';
  });
});