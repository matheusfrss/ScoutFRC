// executa o código somente depois que todo o HTML tiver carregado
document.addEventListener("DOMContentLoaded", () => {
  
   //  menu de todos os js -
  document.getElementById("menu-nav").innerHTML = `
    <a href="index.html" class="active">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Graficos</a>
  `;
 
  // lista com todas as perguntas/campos do EndGame
  const config = [
    {
      labelId: "labelCompleto",
      label: "Estacionou completamente no poço de escavação?",
      selectId: "estacionouCompleto",
      opcoes: ["Selecione", "Sim", "Não"]
    },
    {
      labelId: "labelParcial",
      label: "Estacionou parcialmente no sítio arqueológico?",
      selectId: "estacionouParcial",
      opcoes: ["Selecione", "Sim", "Não"]
    },
    {
      labelId: "labelParou",
      label: "O robô parou?",
      selectId: "roboParou",
      opcoes: ["Selecione", "Sim", "Não"]
    },
    {
      labelId: "labelPenalidades",
      label: "Penalidades:",
      inputId: "penalidades",
      tipo: "input"
    },
    {
      labelId: "labelEstrategia",
      label: "Estratégia do robô:",
      selectId: "estrategia",
      opcoes: ["Selecione", "Robô de defesa", "Robô de ataque"]
    },
    {
      labelId: "labelObservacoes",
      label: "Observações:",
      inputId: "observacoes",
      tipo: "textarea"
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

  // BOTÃO FINALIZAR CORRIGIDO
  document.getElementById("finalizarBtn").addEventListener("click", async () => {
    const dadosEndgame = {};

    // Capturar dados do EndGame
    config.forEach(campo => {
      const elemento = document.getElementById(campo.selectId) || document.getElementById(campo.inputId);
      dadosEndgame[campo.labelId] = elemento.value.trim();
    });

    // Pegar dados de todas as páginas
    const dadosCompletos = {
      numEquipe: localStorage.getItem('numEquipe') || '0',
      autonomo: JSON.parse(localStorage.getItem('dadosAutonomo') || '{}'),
      teleop: JSON.parse(localStorage.getItem('dadosTeleop') || '{}'),
      endgame: dadosEndgame
    };

    console.log("📤 Enviando dados:", dadosCompletos);

    try {
      // Enviar para o Flask
      const response = await fetch('http://localhost:5000/api/salvar_robo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosCompletos)
      });

      const resultado = await response.json();
      
      if (resultado.status === "sucesso") {
        alert("✅ Scout salvo com sucesso no banco de dados!");
        window.location.href = "index.html";
      } else {
        alert("❌ Erro ao salvar: " + resultado.message);
      }
    } catch (error) {
      alert("❌ Erro de conexão: " + error.message);
    }
  });
});