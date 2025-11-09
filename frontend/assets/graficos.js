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
      const response = await fetch("/api/todos_robos");
      if (!response.ok) throw new Error(`Erro ${response.status}`);

      todosRobos = await response.json();
      console.log(`✅ ${todosRobos.length} registros carregados.`);

      if (todosRobos.length === 0) {
        mostrarEstadoVazio();
        return;
      }

      criarGraficos();
      preencherTabela?.(); // se tiver tabela, atualiza (mantive opcional)
      configurarEventos?.();

    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      mostrarErro(error.message);
    }
  }

  // cria todos os gráficos (inclui o pequeno)
  function criarGraficos() {
    // destruir existentes
    Object.values(chartInstances).forEach(c => c?.destroy());
    chartInstances = {};

    criarGraficoDesempenhoGeral();
    criarGraficoPontuacaoMedia();
    criarGraficoDistribuicaoPontos();
    criarGraficoPequenoArtefatos(); // o pequeno extra
    // garante que Chart.js redimensione corretamente
    setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
  }

  // 1. Desempenho Geral (BARRAS)
  function criarGraficoDesempenhoGeral() {
    const el = document.getElementById("chart1");
    if (!el) return;
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
            backgroundColor: cores.autonomo
          },
          {
            label: "Teleoperado",
            data: equipes.map(e => e.teleop),
            backgroundColor: cores.teleop
          },
          {
            label: "End Game",
            data: equipes.map(e => e.endgame),
            backgroundColor: cores.endgame
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
          x: { ticks: { color: cores.texto }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: cores.texto }, grid: { color: "#334155" } }
        }
      }
    });
  }

  // 2. Pontuação Média (LINHA)
  function criarGraficoPontuacaoMedia() {
    const el = document.getElementById("chart2");
    if (!el) return;
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
          pointBackgroundColor: cores.autonomo
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: cores.texto } } },
        scales: { x: { ticks: { color: cores.texto } }, y: { ticks: { color: cores.texto }, beginAtZero: true } }
      }
    });
  }

  // 3. Distribuição (GRANDE)
  function criarGraficoDistribuicaoPontos() {
    const el = document.getElementById("chart3");
    if (!el) return;
    const ctx = el.getContext("2d");

    const autonomo = todosRobos.reduce((t, r) => t + calcularPontosAutonomo(r), 0);
    const teleop = todosRobos.reduce((t, r) => t + calcularPontosTeleop(r), 0);
    const endgame = todosRobos.reduce((t, r) => t + calcularPontosEndgame(r), 0);

    if (chartInstances.pizza) chartInstances.pizza.destroy();

    chartInstances.pizza = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Autônomo", "Teleoperado", "End Game"],
        datasets: [{ data: [autonomo, teleop, endgame], backgroundColor: [cores.autonomo, cores.teleop, cores.endgame] }]
      },
      options: {
        responsive: true,
        cutout: '55%',
        plugins: { legend: { labels: { color: cores.texto } } }
      }
    });
  }

  // 4. Pequeno extra — Artefatos por Top 5 equipes (HORIZONTAL)
  function criarGraficoPequenoArtefatos() {
    const el = document.getElementById("chart4");
    if (!el) return;
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
          backgroundColor: arr.map((_,i)=> i===0 ? '#f59e0b' : '#60a5fa')
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c)=> `${c.parsed.x} artefatos` } } },
        scales: { x: { ticks: { color: cores.texto } }, y: { ticks: { color: cores.texto } } }
      }
    });
  }

  // ==== Funções de cálculo (mantidas) ====
  function calcularPontuacaoTotal(r) {
    return calcularPontosAutonomo(r) + calcularPontosTeleop(r) + calcularPontosEndgame(r);
  }
  function calcularPontosAutonomo(r) {
    let pts = 0;
    if (r.dados?.autonomo) {
      if (r.dados.autonomo.linha === "sim") pts += 20;
      pts += (parseInt(r.dados.autonomo.artefatosMedievais) || 0) * 5;
      pts += (parseInt(r.dados.autonomo.artefatosPreHistoricos) || 0) * 3;
    }
    return pts;
  }
  function calcularPontosTeleop(r) {
    let pts = 0;
    if (r.dados?.teleop) {
      pts += (parseInt(r.dados.teleop.medieval) || 0) * 5;
      pts += (parseInt(r.dados.teleop.preHistorico) || 0) * 3;
    }
    return pts;
  }
  function calcularPontosEndgame(r) {
    let pts = 0;
    if (r.dados?.endgame) {
      if (r.dados.endgame.labelCompleto === "sim") pts += 30;
      if (r.dados.endgame.labelParcial === "sim") pts += 15;
    }
    return pts;
  }
  function calcularTotalArtefatos(r) {
    return ((parseInt(r.dados?.autonomo?.artefatosMedievais) || 0) +
            (parseInt(r.dados?.autonomo?.artefatosPreHistoricos) || 0) +
            (parseInt(r.dados?.teleop?.medieval) || 0) +
            (parseInt(r.dados?.teleop?.preHistorico) || 0));
  }

  // ==== UI de fallback ====
  function mostrarEstadoVazio() {
    document.querySelector(".main").innerHTML = `
      <div style="text-align:center; padding: 4rem; color:#94a3b8;">
        <h2>Nenhum dado disponível 📉</h2>
        <p>Adicione scouts para gerar estatísticas.</p>
      </div>`;
  }
  function mostrarErro(msg) {
    document.querySelector(".main").innerHTML = `
      <div style="text-align:center; padding: 4rem; color:#ef4444;">
        <h2>Erro ao carregar dados ⚠️</h2>
        <p>${msg}</p>
      </div>`;
  }

  // Inicia
  inicializarSistema();
});
