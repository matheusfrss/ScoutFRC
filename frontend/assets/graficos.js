document.addEventListener("DOMContentLoaded", async () => {
  let todosRobos = [];
  let chartInstances = {};

  // Cores modernas para os gráficos
  const cores = {
    primary: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'],
    gradient: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'],
    pastel: ['#6ab7ff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8', '#20c997']
  };

  // Buscar dados da API
  async function carregarDados() {
    try {
      mostrarLoading(true);
      const response = await fetch('/api/todos_robos');
      todosRobos = await response.json();
      console.log("📊 Dados carregados:", todosRobos);
      
      if (todosRobos.length === 0) {
        mostrarEstadoVazio();
        return;
      }
      
      atualizarStatsCards();
      inicializarGraficos();
      preencherTabela();
      
    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error);
      mostrarErro();
    } finally {
      mostrarLoading(false);
    }
  }

  // Mostrar/ocultar loading
  function mostrarLoading(mostrar) {
    const loading = document.getElementById('loading');
    if (!loading && mostrar) {
      const loadingDiv = document.createElement('div');
      loadingDiv.id = 'loading';
      loadingDiv.innerHTML = '<div class="spinner"></div><p>Carregando dados...</p>';
      loadingDiv.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        text-align: center; z-index: 1000;
      `;
      document.body.appendChild(loadingDiv);
    } else if (loading) {
      loading.remove();
    }
  }

  // Estado vazio
  function mostrarEstadoVazio() {
    document.querySelector('.charts-grid').innerHTML = `
      <div class="empty-state">
        <i class="fas fa-chart-bar" style="font-size: 4em; color: #bdc3c7; margin-bottom: 20px;"></i>
        <h3>Nenhum dado disponível</h3>
        <p>Realize alguns scouts para ver as análises</p>
        <button onclick="window.location.href='index.html'" class="btn-refresh">
          <i class="fas fa-plus"></i> Começar Scout
        </button>
      </div>
    `;
  }

  // Mostrar erro
  function mostrarErro() {
    document.querySelector('.charts-grid').innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle" style="font-size: 4em; color: #e74c3c; margin-bottom: 20px;"></i>
        <h3>Erro ao carregar dados</h3>
        <p>Verifique se o servidor está rodando</p>
        <button onclick="carregarDados()" class="btn-refresh">
          <i class="fas fa-sync-alt"></i> Tentar Novamente
        </button>
      </div>
    `;
  }

  // Atualizar cards de estatísticas
  function atualizarStatsCards() {
    const totalScouts = todosRobos.length;
    const equipesUnicas = [...new Set(todosRobos.map(r => r.num_equipe))].length;
    
    const pontuacoes = todosRobos.map(robo => calcularPontuacao(robo));
    const mediaPontos = pontuacoes.length > 0 ? (pontuacoes.reduce((a, b) => a + b, 0) / pontuacoes.length).toFixed(1) : 0;
    const topPontuacao = pontuacoes.length > 0 ? Math.max(...pontuacoes) : 0;

    document.getElementById('totalScouts').textContent = totalScouts;
    document.getElementById('mediaPontos').textContent = mediaPontos;
    document.getElementById('topPontuacao').textContent = topPontuacao;
    document.getElementById('totalEquipes').textContent = equipesUnicas;
  }

  // Calcular pontuação total
  function calcularPontuacao(robo) {
    let pontos = 0;
    
    // Pontos autônomos
    if (robo.dados.autonomo) {
      if (robo.dados.autonomo.linha === 'sim') pontos += 20;
      pontos += (parseInt(robo.dados.autonomo.artefatosMedievais) || 0) * 5;
      pontos += (parseInt(robo.dados.autonomo.artefatosPreHistoricos) || 0) * 3;
    }
    
    // Pontos teleoperados
    if (robo.dados.teleop) {
      pontos += (parseInt(robo.dados.teleop.medieval) || 0) * 5;
      pontos += (parseInt(robo.dados.teleop.preHistorico) || 0) * 3;
    }
    
    // Pontos endgame
    if (robo.dados.endgame) {
      if (robo.dados.endgame.labelCompleto === 'sim') pontos += 30;
      if (robo.dados.endgame.labelParcial === 'sim') pontos += 15;
    }
    
    return pontos;
  }

  // Inicializar todos os gráficos
  function inicializarGraficos() {
    // Destruir gráficos existentes
    Object.values(chartInstances).forEach(chart => {
      if (chart) chart.destroy();
    });
    chartInstances = {};

    criarGraficoRanking();
    criarGraficoFases();
    criarGraficoArtefatos();
    criarGraficoEstrategias();
    criarGraficoAutonomo();
    criarGraficoTeleop();
  }

  // Gráfico de Ranking
  function criarGraficoRanking() {
    const robosComPontos = todosRobos.map(robo => ({
      ...robo,
      pontuacao: calcularPontuacao(robo)
    })).sort((a, b) => b.pontuacao - a.pontuacao).slice(0, 10); // Top 10

    const ctx = document.getElementById('graficoRanking').getContext('2d');
    
    chartInstances.ranking = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: robosComPontos.map(r => `#${r.num_equipe}`),
        datasets: [{
          label: 'Pontuação Total',
          data: robosComPontos.map(r => r.pontuacao),
          backgroundColor: robosComPontos.map((_, i) => cores.gradient[i % cores.gradient.length]),
          borderColor: robosComPontos.map((_, i) => cores.primary[i % cores.primary.length]),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            titleFont: { size: 14 },
            bodyFont: { size: 13 },
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.1)'
            },
            ticks: {
              font: { size: 12 }
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              font: { size: 11, weight: 'bold' }
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  }

  // Gráfico de Fases (Radar)
  function criarGraficoFases() {
    const equipes = [...new Set(todosRobos.map(r => r.num_equipe))].slice(0, 5); // Top 5 equipes
    
    const ctx = document.getElementById('graficoFases').getContext('2d');
    
    chartInstances.fases = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['Linha Autônoma', 'Artefatos Auto', 'Artefatos Teleop', 'Estacionamento', 'Estratégia'],
        datasets: equipes.map((equipe, index) => {
          const robo = todosRobos.find(r => r.num_equipe === equipe);
          return {
            label: `Equipe ${equipe}`,
            data: [
              robo.dados.autonomo?.linha === 'sim' ? 100 : 0,
              ((parseInt(robo.dados.autonomo?.artefatosMedievais) || 0) + 
               (parseInt(robo.dados.autonomo?.artefatosPreHistoricos) || 0)) * 10,
              ((parseInt(robo.dados.teleop?.medieval) || 0) + 
               (parseInt(robo.dados.teleop?.preHistorico) || 0)) * 10,
              (robo.dados.endgame?.labelCompleto === 'sim' ? 100 : 
               robo.dados.endgame?.labelParcial === 'sim' ? 50 : 0),
              robo.dados.endgame?.labelEstrategia ? 75 : 25
            ],
            backgroundColor: cores.pastel[index] + '40',
            borderColor: cores.primary[index],
            borderWidth: 2,
            pointBackgroundColor: cores.primary[index],
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: cores.primary[index]
          };
        })
      },
      options: {
        responsive: true,
        scales: {
          r: {
            angleLines: {
              color: 'rgba(0,0,0,0.1)'
            },
            grid: {
              color: 'rgba(0,0,0,0.1)'
            },
            suggestedMin: 0,
            suggestedMax: 100
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { size: 11 },
              usePointStyle: true
            }
          }
        }
      }
    });
  }

  // Gráfico de Artefatos
  function criarGraficoArtefatos() {
    const equipes = todosRobos.slice(0, 6).map(r => `#${r.num_equipe}`);
    
    const ctx = document.getElementById('graficoArtefatos').getContext('2d');
    
    chartInstances.artefatos = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Medievais Auto', 'Pré-históricos Auto', 'Medievais Teleop', 'Pré-históricos Teleop'],
        datasets: [{
          data: [
            todosRobos.reduce((sum, r) => sum + (parseInt(r.dados.autonomo?.artefatosMedievais) || 0), 0),
            todosRobos.reduce((sum, r) => sum + (parseInt(r.dados.autonomo?.artefatosPreHistoricos) || 0), 0),
            todosRobos.reduce((sum, r) => sum + (parseInt(r.dados.teleop?.medieval) || 0), 0),
            todosRobos.reduce((sum, r) => sum + (parseInt(r.dados.teleop?.preHistorico) || 0), 0)
          ],
          backgroundColor: ['#e74c3c', '#e67e22', '#c0392b', '#d35400'],
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              font: { size: 11 }
            }
          }
        },
        animation: {
          animateScale: true,
          animateRotate: true
        }
      }
    });
  }

  // Gráfico de Estratégias
  function criarGraficoEstrategias() {
    const estrategias = {};
    todosRobos.forEach(robo => {
      const estrategia = robo.dados.endgame?.labelEstrategia || 'Não informado';
      estrategias[estrategia] = (estrategias[estrategia] || 0) + 1;
    });

    const ctx = document.getElementById('graficoEstrategias').getContext('2d');
    
    chartInstances.estrategias = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(estrategias),
        datasets: [{
          data: Object.values(estrategias),
          backgroundColor: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'],
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 15
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              font: { size: 11 },
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    const percentage = ((value / data.datasets[0].data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                    return {
                      text: `${label} (${value} - ${percentage}%)`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: data.datasets[0].borderColor,
                      lineWidth: data.datasets[0].borderWidth,
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          }
        }
      }
    });
  }

  // Gráfico de Eficiência Autônoma
  function criarGraficoAutonomo() {
    const ctx = document.getElementById('graficoAutonomo').getContext('2d');
    
    const equipes = todosRobos.slice(0, 5).map(r => `#${r.num_equipe}`);
    const linhas = todosRobos.slice(0, 5).map(r => r.dados.autonomo?.linha === 'sim' ? 100 : 0);
    
    chartInstances.autonomo = new Chart(ctx, {
      type: 'line',
      data: {
        labels: equipes,
        datasets: [{
          label: 'Linha Autônoma',
          data: linhas,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#3498db',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 6
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: 0,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }

  // Gráfico de Performance Teleoperada
  function criarGraficoTeleop() {
    const ctx = document.getElementById('graficoTeleop').getContext('2d');
    
    const equipes = todosRobos.slice(0, 6).map(r => `#${r.num_equipe}`);
    const artefatos = todosRobos.slice(0, 6).map(r => 
      (parseInt(r.dados.teleop?.medieval) || 0) + (parseInt(r.dados.teleop?.preHistorico) || 0)
    );
    
    chartInstances.teleop = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: equipes,
        datasets: [{
          label: 'Total Artefatos Teleop',
          data: artefatos,
          backgroundColor: cores.gradient,
          borderColor: '#fff',
          borderWidth: 2,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.1)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  // Preencher tabela de dados
  function preencherTabela() {
    const tbody = document.querySelector('#tabelaRobos tbody');
    tbody.innerHTML = '';

    const robosOrdenados = [...todosRobos].sort((a, b) => calcularPontuacao(b) - calcularPontuacao(a));

    robosOrdenados.forEach(robo => {
      const pontuacao = calcularPontuacao(robo);
      const status = pontuacao >= 80 ? 'status-top' : pontuacao >= 50 ? 'status-good' : 'status-avg';
      const statusText = pontuacao >= 80 ? 'Top' : pontuacao >= 50 ? 'Bom' : 'Médio';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>#${robo.num_equipe}</strong></td>
        <td><strong>${pontuacao}</strong></td>
        <td>${calcularPontosAutonomo(robo)}</td>
        <td>${calcularPontosTeleop(robo)}</td>
        <td>${calcularPontosEndgame(robo)}</td>
        <td>${calcularTotalArtefatos(robo)}</td>
        <td>${robo.dados.endgame?.labelEstrategia || 'N/A'}</td>
        <td><span class="status-badge ${status}">${statusText}</span></td>
      `;
      tbody.appendChild(tr);
    });

    // Adicionar busca na tabela
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filtrarTabela);
  }

  // Funções auxiliares
  function calcularPontosAutonomo(robo) {
    let pontos = 0;
    if (robo.dados.autonomo) {
      if (robo.dados.autonomo.linha === 'sim') pontos += 20;
      pontos += (parseInt(robo.dados.autonomo.artefatosMedievais) || 0) * 5;
      pontos += (parseInt(robo.dados.autonomo.artefatosPreHistoricos) || 0) * 3;
    }
    return pontos;
  }

  function calcularPontosTeleop(robo) {
    let pontos = 0;
    if (robo.dados.teleop) {
      pontos += (parseInt(robo.dados.teleop.medieval) || 0) * 5;
      pontos += (parseInt(robo.dados.teleop.preHistorico) || 0) * 3;
    }
    return pontos;
  }

  function calcularPontosEndgame(robo) {
    let pontos = 0;
    if (robo.dados.endgame) {
      if (robo.dados.endgame.labelCompleto === 'sim') pontos += 30;
      if (robo.dados.endgame.labelParcial === 'sim') pontos += 15;
    }
    return pontos;
  }

  function calcularTotalArtefatos(robo) {
    return ((parseInt(robo.dados.autonomo?.artefatosMedievais) || 0) +
            (parseInt(robo.dados.autonomo?.artefatosPreHistoricos) || 0) +
            (parseInt(robo.dados.teleop?.medieval) || 0) +
            (parseInt(robo.dados.teleop?.preHistorico) || 0));
  }

  function filtrarTabela() {
    const filter = document.getElementById('searchInput').value.toLowerCase();
    const rows = document.querySelectorAll('#tabelaRobos tbody tr');
    
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(filter) ? '' : 'none';
    });
  }

  // Exportar dados (função básica)
  function exportarDados() {
    const dataStr = JSON.stringify(todosRobos, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scout-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Inicializar
  carregarDados();

  // Tornar funções globais para os botões
  window.carregarDados = carregarDados;
  window.exportarDados = exportarDados;
});