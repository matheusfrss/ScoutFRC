localStorage.clear();
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Federal Force Scout System - Iniciando...");

  let todosRobos = [];
  let chartInstances = {};

  const cores = {
    autonomo: "#0ea5ff",
    teleop: "#1e3a8a", 
    endgame: "#3b82f6",
    fundo: "#111827",
    texto: "#b6c7e6"
  };

  async function inicializarSistema() {
    try {
      console.log("📡 Buscando dados da API...");
      
      // Tenta buscar dados reais da API
      const response = await fetch("/api/robos");
      
      if (response.ok) {
        // Se a API retornar dados, usa eles
        todosRobos = await response.json();
        console.log(`✅ ${todosRobos.length} registros carregados da API.`);
      } else {
        // Se a API não tiver dados, verifica o LocalStorage
        console.log("📭 API não retornou dados. Verificando LocalStorage...");
        todosRobos = carregarDoLocalStorage();
        
        if (todosRobos.length === 0) {
          mostrarEstadoVazio();
          return;
        }
      }

      if (todosRobos.length === 0) {
        mostrarEstadoVazio();
        return;
      }

      // DEBUG: Mostra estrutura dos dados
      debugDadosEstrutura(todosRobos);
      
      console.log(`🎯 Total de ${todosRobos.length} robôs carregados`);
      criarGraficos();
      preencherTabela();

    } catch (error) {
      console.error("❌ Erro ao carregar dados da API:", error);
      
      // Se der erro na API, tenta carregar do LocalStorage
      console.log("🔄 Tentando carregar do LocalStorage...");
      todosRobos = carregarDoLocalStorage();
      
      if (todosRobos.length === 0) {
        mostrarEstadoVazio();
      } else {
        console.log(`✅ ${todosRobos.length} registros carregados do LocalStorage`);
        criarGraficos();
        preencherTabela();
      }
    }
  }

  // NOVA FUNÇÃO: Carrega dados do LocalStorage
  function carregarDoLocalStorage() {
    try {
      console.log("🔍 Verificando LocalStorage...");
      
      // Tenta carregar da chave 'scouts' (usada pelo endgame.js)
      const scoutsSalvos = localStorage.getItem('scouts');
      
      if (scoutsSalvos) {
        const dados = JSON.parse(scoutsSalvos);
        console.log(`📊 ${dados.length} scouts encontrados no LocalStorage`);
        return dados;
      }
      
      // Tenta outras chaves possíveis
      const chaves = Object.keys(localStorage);
      const chavesRobos = chaves.filter(chave => 
        chave.includes('robo') || chave.includes('scout') || chave.includes('equipe')
      );
      
      console.log("Chaves relacionadas encontradas:", chavesRobos);
      
      // Se encontrar outras chaves, tenta carregar
      if (chavesRobos.length > 0) {
        const todosDados = [];
        chavesRobos.forEach(chave => {
          try {
            const dados = JSON.parse(localStorage.getItem(chave));
            if (dados && typeof dados === 'object') {
              todosDados.push(dados);
            }
          } catch (e) {
            console.warn(`Não foi possível ler a chave ${chave}:`, e);
          }
        });
        return todosDados;
      }
      
      console.log("📭 Nenhum dado encontrado no LocalStorage");
      return [];
      
    } catch (error) {
      console.error("❌ Erro ao carregar do LocalStorage:", error);
      return [];
    }
  }

  // NOVA FUNÇÃO: Debug para ver estrutura dos dados
  function debugDadosEstrutura(robos) {
    console.log("🔍 ESTRUTURA DOS DADOS RECEBIDOS:");
    robos.forEach((robo, index) => {
      console.log(`Robo ${index + 1}:`, {
        num_equipe: robo.num_equipe,
        estrategia: robo.estrategia,
        dados: robo.dados,
        temAutonomo: !!robo.dados?.autonomo,
        temTeleop: !!robo.dados?.teleop,
        temEndgame: !!robo.dados?.endgame
      });
    });
  }

  // Preenche a tabela com dados calculados
  function preencherTabela() {
    const tbody = document.querySelector("#tabelaDesempenho tbody");
    if (!tbody) return;

    // Limpa dados de exemplo estáticos
    tbody.innerHTML = "";

    // Calcula dados para cada equipe
    const dadosEquipes = todosRobos.map(robo => {
      const autonomo = calcularPontosAutonomo(robo);
      const teleop = calcularPontosTeleop(robo);
      const endgame = calcularPontosEndgame(robo);
      const total = calcularPontuacaoTotal(robo);
      const artefatos = calcularTotalArtefatos(robo);

      let status = "status-medio";
      let statusTexto = "MÉDIO";
      if (total > 90) {
        status = "status-top";
        statusTexto = "TOP";
      } else if (total > 60) {
        status = "status-bom";
        statusTexto = "BOM";
      }

      return {
        equipe: robo.num_equipe,
        total,
        autonomo,
        teleop,
        endgame,
        artefatos,
        estrategia: robo.estrategia,
        status,
        statusTexto
      };
    }).sort((a, b) => b.total - a.total);

    // Preenche a tabela
    dadosEquipes.forEach(dados => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>#${dados.equipe}</td>
        <td><strong>${dados.total}</strong></td>
        <td>${dados.autonomo}</td>
        <td>${dados.teleop}</td>
        <td>${dados.endgame}</td>
        <td>${dados.artefatos}</td>
        <td><span class="estrategia-badge">${dados.estrategia}</span></td>
        <td><span class="status-tag ${dados.status}">${dados.statusTexto}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Função de filtro para a tabela
  function filtrarTabela() {
    const input = document.getElementById("buscaEquipe");
    const filter = input.value.toUpperCase();
    const table = document.getElementById("tabelaDesempenho");
    const tr = table.getElementsByTagName("tr");

    for (let i = 1; i < tr.length; i++) {
      const td = tr[i].getElementsByTagName("td")[0];
      if (td) {
        const txtValue = td.textContent || td.innerText;
        if (txtValue.toUpperCase().includes(filter)) {
          tr[i].style.display = "";
        } else {
          tr[i].style.display = "none";
        }
      }
    }
  }

  // cria todos os gráficos
  function criarGraficos() {
    // destruir existentes
    Object.values(chartInstances).forEach(c => c?.destroy());
    chartInstances = {};

    criarGraficoDesempenhoGeral();
    criarGraficoPontuacaoMedia();
    criarGraficoDistribuicaoPontos();
    criarGraficoPequenoArtefatos();
    
    // garante que Chart.js redimensione corretamente
    setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
  }

  // 1. Desempenho Geral (BARRAS)
  function criarGraficoDesempenhoGeral() {
    const el = document.getElementById("chart1");
    if (!el) {
      console.warn("Elemento chart1 não encontrado");
      return;
    }
    const ctx = el.getContext("2d");

    const equipes = [...todosRobos]
      .map(r => ({
        equipe: r.num_equipe,
        autonomo: calcularPontosAutonomo(r),
        teleop: calcularPontosTeleop(r),
        endgame: calcularPontosEndgame(r),
        total: calcularPontuacaoTotal(r)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);

    if (chartInstances.desempenho) chartInstances.desempenho.destroy();

    chartInstances.desempenho = new Chart(ctx, {
      type: "bar",
      data: {
        labels: equipes.map(e => `#${e.equipe}`),
        datasets: [
          {
            label: "Autônomo",
            data: equipes.map(e => e.autonomo),
            backgroundColor: cores.autonomo,
            borderRadius: 6
          },
          {
            label: "Teleoperado",
            data: equipes.map(e => e.teleop),
            backgroundColor: cores.teleop,
            borderRadius: 6
          },
          {
            label: "End Game",
            data: equipes.map(e => e.endgame),
            backgroundColor: cores.endgame,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: cores.texto, font: { size: 12 } },
            position: "top"
          },
          title: {
            display: false
          }
        },
        scales: {
          x: { 
            ticks: { color: cores.texto }, 
            grid: { display: false } 
          },
          y: { 
            beginAtZero: true, 
            ticks: { color: cores.texto }, 
            grid: { color: "#334155" } 
          }
        }
      }
    });
  }

  // 2. Pontuação Média (LINHA)
  function criarGraficoPontuacaoMedia() {
    const el = document.getElementById("chart2");
    if (!el) {
      console.warn("Elemento chart2 não encontrado");
      return;
    }
    const ctx = el.getContext("2d");

    const map = {};
    todosRobos.forEach(r => {
      const eq = r.num_equipe;
      if (!map[eq]) map[eq] = [];
      map[eq].push(calcularPontuacaoTotal(r));
    });

    const medias = Object.entries(map)
      .map(([eq, vals]) => ({ equipe: eq, media: vals.reduce((a,b)=>a+b,0)/vals.length }))
      .sort((a,b)=>b.media-a.media)
      .slice(0,6);

    if (chartInstances.media) chartInstances.media.destroy();

    chartInstances.media = new Chart(ctx, {
      type: "line",
      data: {
        labels: medias.map(m => `#${m.equipe}`),
        datasets: [{
          label: "Pontuação Média",
          data: medias.map(m => parseFloat(m.media.toFixed(1))),
          borderColor: cores.autonomo,
          backgroundColor: "rgba(14,165,255,0.18)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: cores.autonomo,
          pointBorderColor: "#fff",
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: { 
          legend: { 
            labels: { color: cores.texto } 
          } 
        },
        scales: { 
          x: { 
            ticks: { color: cores.texto } 
          }, 
          y: { 
            ticks: { color: cores.texto }, 
            beginAtZero: true,
            grid: { color: "#334155" }
          } 
        }
      }
    });
  }

  // 3. Distribuição (GRANDE)
  function criarGraficoDistribuicaoPontos() {
    const el = document.getElementById("chart3");
    if (!el) {
      console.warn("Elemento chart3 não encontrado");
      return;
    }
    const ctx = el.getContext("2d");

    const autonomo = todosRobos.reduce((t, r) => t + calcularPontosAutonomo(r), 0);
    const teleop = todosRobos.reduce((t, r) => t + calcularPontosTeleop(r), 0);
    const endgame = todosRobos.reduce((t, r) => t + calcularPontosEndgame(r), 0);

    if (chartInstances.pizza) chartInstances.pizza.destroy();

    chartInstances.pizza = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Autônomo", "Teleoperado", "End Game"],
        datasets: [{ 
          data: [autonomo, teleop, endgame], 
          backgroundColor: [cores.autonomo, cores.teleop, cores.endgame],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        cutout: '55%',
        plugins: { 
          legend: { 
            labels: { 
              color: cores.texto,
              font: { size: 12 }
            } 
          } 
        }
      }
    });
  }

  // 4. Pequeno extra — Artefatos por Top 5 equipes (HORIZONTAL)
  function criarGraficoPequenoArtefatos() {
    const el = document.getElementById("chart4");
    if (!el) {
      console.warn("Elemento chart4 não encontrado");
      return;
    }
    const ctx = el.getContext("2d");

    // soma artefatos por equipe
    const map = {};
    todosRobos.forEach(r => {
      const eq = r.num_equipe;
      const totalArte = calcularTotalArtefatos(r);
      map[eq] = (map[eq] || 0) + totalArte;
    });

    const arr = Object.entries(map).map(([eq, val]) => ({ eq, val }))
      .sort((a,b)=>b.val-a.val)
      .slice(0,5);

    if (chartInstances.pequeno) chartInstances.pequeno.destroy();

    chartInstances.pequeno = new Chart(ctx, {
      type: "bar",
      data: {
        labels: arr.map(a => `#${a.eq}`),
        datasets: [{
          label: "Artefatos (total)",
          data: arr.map(a => a.val),
          backgroundColor: arr.map((_,i) => i === 0 ? '#f59e0b' : '#60a5fa'),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { 
          legend: { display: false }, 
          tooltip: { 
            callbacks: { 
              label: (context) => `${context.parsed.x} artefatos` 
            } 
          } 
        },
        scales: { 
          x: { 
            ticks: { color: cores.texto },
            grid: { color: "#334155" }
          }, 
          y: { 
            ticks: { color: cores.texto },
            grid: { display: false }
          } 
        }
      }
    });
  }

  // ==== Funções de cálculo CORRIGIDAS ====
  function calcularPontuacaoTotal(r) {
    const total = calcularPontosAutonomo(r) + calcularPontosTeleop(r) + calcularPontosEndgame(r);
    return isNaN(total) ? 0 : total; // Garante que nunca retorne NaN
  }

  function calcularPontosAutonomo(r) {
    let pts = 0;
    if (r.dados?.autonomo) {
      if (r.dados.autonomo.linha === "sim") pts += 20;
      pts += (parseInt(r.dados.autonomo.artefatosMedievais) || 0) * 5;
      pts += (parseInt(r.dados.autonomo.artefatosPreHistoricos) || 0) * 3;
    }
    return pts; // Retorna 0 se não tiver autonomo
  }

  function calcularPontosTeleop(r) {
    let pts = 0;
    if (r.dados?.teleop) {
      pts += (parseInt(r.dados.teleop.medieval) || 0) * 5;
      pts += (parseInt(r.dados.teleop.preHistorico) || 0) * 3;
    }
    return pts; // Retorna 0 se não tiver teleop
  }

  function calcularPontosEndgame(r) {
    let pts = 0;
    if (r.dados?.endgame) {
      if (r.dados.endgame.labelCompleto === "sim") pts += 30;
      if (r.dados.endgame.labelParcial === "sim") pts += 15;
    }
    return pts; // Pelo menos o endgame deve existir!
  }

  function calcularTotalArtefatos(r) {
    let total = 0;
    if (r.dados?.autonomo) {
      total += (parseInt(r.dados.autonomo.artefatosMedievais) || 0);
      total += (parseInt(r.dados.autonomo.artefatosPreHistoricos) || 0);
    }
    if (r.dados?.teleop) {
      total += (parseInt(r.dados.teleop.medieval) || 0);
      total += (parseInt(r.dados.teleop.preHistorico) || 0);
    }
    return total;
  }

  // ==== UI de fallback CORRIGIDA ====
  function mostrarEstadoVazio() {
    // Limpa apenas o conteúdo dos gráficos e tabela, mantendo a estrutura da página
    const tbody = document.querySelector("#tabelaDesempenho tbody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: #94a3b8;">
            <h3>Nenhum dado disponível 📉</h3>
            <p>Adicione scouts para gerar estatísticas.</p>
          </td>
        </tr>`;
    }
    
    // Limpa containers de gráficos
    const chartContainers = ['chart1', 'chart2', 'chart3', 'chart4'];
    chartContainers.forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        // Mantém o canvas mas mostra mensagem
        const parent = container.parentElement;
        if (parent) {
          parent.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #94a3b8; height: 100%; display: flex; align-items: center; justify-content: center;">
              <div>
                <p>Sem dados para exibir</p>
                <small>Adicione scouts para ver gráficos</small>
              </div>
            </div>`;
        }
      }
    });
    
    console.log("📭 Sistema carregado - aguardando dados...");
  }

  function mostrarErro(msg) {
    // Mostra erro sem destruir a estrutura da página
    const main = document.querySelector(".main");
    if (main) {
      const errorDiv = document.createElement("div");
      errorDiv.style.cssText = "text-align:center; padding: 2rem; color:#ef4444; background: #1f2937; margin: 1rem; border-radius: 8px;";
      errorDiv.innerHTML = `
        <h3>Erro ao carregar dados ⚠️</h3>
        <p>${msg}</p>
      `;
      // Insere no topo da main sem substituir todo o conteúdo
      main.insertBefore(errorDiv, main.firstChild);
    }
  }

  // Torna a função filtrarTabela global
  window.filtrarTabela = filtrarTabela;

  // Inicia o sistema
  inicializarSistema();
});