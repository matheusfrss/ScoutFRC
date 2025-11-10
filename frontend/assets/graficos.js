// frontend/assets/graficos.js
// Painel de gráficos + tabela que consome /api/todos_robos
// Ajuste os WEIGHTS abaixo para refletir as regras de pontuação da sua equipe.

const API_BASE = 'http://127.0.0.1:5000'; // ajuste se necessário

// ======= Regras / pesos (personalizáveis) =======
const WEIGHTS = {
  autonomo_line: 5,               // cruzou a linha no autônomo
  artefato_medieval: 3,           // cada artefato "medieval"
  artefato_prehistorico: 2,       // cada artefato "pré-histórico"
  teleop_item: 1,                 // ponto por item no teleop (base)
  endgame_completo: 10,
  endgame_parcial: 5,
  endgame_parou: 2
};

// variáveis Chart.js para destruir antes de redesenhar
let chart1, chart2, chart3, chart4;

// Quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  carregarEDesennhar();
});

// inicializa hooks UI
function initUI() {
  // busca input
  const buscaEl = document.getElementById('buscaEquipe');
  if (buscaEl) buscaEl.addEventListener('input', filtrarTabela);
}

// Faz fetch dos dados e desenha tudo
async function carregarEDesennhar() {
  try {
    const resp = await fetch(`${API_BASE}/api/todos_robos`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json(); // array de registros

    // transforma os registros em agrupamento por equipe
    const porEquipe = agruparPorEquipe(data);

    // calcula métricas
    const metrics = calcularMetrics(porEquipe);

    // desenha gráficos
    desenharChart1(metrics); // desempenho por fase
    desenharChart2(metrics); // pontuação média
    desenharChart3(metrics); // distribuição de pontos
    desenharChart4(metrics); // artefatos top

    // popula tabela
    popularTabela(metrics);

  } catch (err) {
    console.error('Erro ao carregar dados para gráficos:', err);
    // fallback: mostra mensagem na tabela
    const tbody = document.querySelector('#tabelaDesempenho tbody');
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8">Erro ao carregar dados: ${err.message}</td></tr>`;
    }
  }
}

// Agrupa registros retornados pelo backend por num_equipe
function agruparPorEquipe(registros) {
  // registros: [{id, num_equipe, dados: {...}, data_criacao}, ...]
  // Alguns registros podem armazenar payloads diferentes; lidamos com ambos 'dados' e 'full_record'
  const mapa = new Map();

  registros.forEach(r => {
    // r pode ser {id, num_equipe, dados, data_criacao} se vier do /api/todos_robos formatei assim no backend
    const numEquipe = r.num_equipe ?? (r.dados && r.dados.num_equipe) ?? (r.full_record && r.full_record.num_equipe) ?? null;
    if (!numEquipe) return;

    // tenta extrair autonomo/teleop/endgame de várias formas
    let autonomo = null, teleop = null, endgame = null, full = null, estrategia = '';

    // prioridade: r.dados (quando backend gravou outboxItem.payload or full_record)
    if (r.dados && typeof r.dados === 'object') {
      // se r.dados já vem como { autonomo: {...}, teleop: {...}, endgame: {...} }
      if (r.dados.autonomo || r.dados.teleop || r.dados.endgame) {
        autonomo = r.dados.autonomo ?? null;
        teleop = r.dados.teleop ?? null;
        endgame = r.dados.endgame ?? null;
        estrategia = r.dados.estrategia ?? '';
      } else {
        // r.dados pode ser payload genérico — tenta encontrar chaves
        if (r.dados.payload) {
          const p = r.dados.payload;
          autonomo = p.autonomo ?? p;
          teleop = p.teleop ?? p;
          endgame = p.endgame ?? p;
        } else {
          // fallback: r.dados é o full_record possivel
          full = r.dados;
        }
      }
    }

    // se não encontrou, tenta r.dados dentro de full_record ou r (payloads diferentes)
    if (!full) {
      if (r.dados && r.dados.full_record) full = r.dados.full_record;
      else if (r.full_record) full = r.full_record;
      else if (r.dados && r.dados.dados) full = r.dados; // caso já tenha .dados
    }

    // se full existe, tenta extrair
    if (full) {
      if (full.dados) {
        autonomo = autonomo || full.dados.autonomo;
        teleop = teleop || full.dados.teleop;
        endgame = endgame || full.dados.endgame;
      }
      estrategia = estrategia || full.estrategia || '';
    }

    // acumula no mapa
    const key = String(numEquipe);
    if (!mapa.has(key)) {
      mapa.set(key, { numEquipe: key, registros: [], autonomoList: [], teleopList: [], endgameList: [], estrategias: [] });
    }

    const entry = mapa.get(key);
    entry.registros.push(r);
    if (autonomo) entry.autonomoList.push(autonomo);
    if (teleop) entry.teleopList.push(teleop);
    if (endgame) entry.endgameList.push(endgame);
    if (estrategia) entry.estrategias.push(estrategia);
  });

  return Array.from(mapa.values());
}

// Calcula métricas por equipe a partir dos arrays de fases
function calcularMetrics(equipes) {
  // Para cada equipe, resumimos em uma linha: totals e pontuação estimada
  const result = equipes.map(e => {
    // sumariza autonomo
    let autonomoScore = 0;
    let autonomoCross = 0;
    let autonomoArteMed = 0;
    let autonomoArtePre = 0;

    e.autonomoList.forEach(a => {
      if (!a) return;
      // se a linha for boolean ou 'sim'/'nao'
      const linha = (a.linha === true || String(a.linha).toLowerCase() === 'sim');
      if (linha) { autonomoScore += WEIGHTS.autonomo_line; autonomoCross += 1; }
      // artefatos
      const am = Number(a.artefatosMedievais ?? a.artefatos_medievais ?? a.artefatosMedievais ?? 0);
      const ap = Number(a.artefatosPreHistoricos ?? a.artefatos_prehistoricos ?? a.artefatosPreHistoricos ?? 0);
      autonomoArteMed += am;
      autonomoArtePre += ap;
      autonomoScore += am * WEIGHTS.artefato_medieval + ap * WEIGHTS.artefato_prehistorico;
    });

    // sumariza teleop
    let teleopScore = 0;
    let teleopArteTotal = 0;
    e.teleopList.forEach(t => {
      if (!t) return;
      // diferentes nomes possíveis; tenta pegar campos de artefatos
      const tm = Number(t.medieval ?? t.artefatosMedievais ?? t.teleopMedieval ?? 0);
      const tp = Number(t.preHistorico ?? t.artefatosPreHistoricos ?? t.teleopPreHistorico ?? 0);
      teleopArteTotal += tm + tp;
      teleopScore += (tm + tp) * WEIGHTS.teleop_item;
    });

    // sumariza endgame
    let endgameScore = 0;
    let endgameCompleto = 0;
    let endgameParcial = 0;
    let endgameParou = 0;
    e.endgameList.forEach(ed => {
      if (!ed) return;
      const c = (!!ed.estacionouCompleto) || String(ed.estacionouCompleto).toLowerCase() === 'sim';
      const p = (!!ed.estacionouParcial) || String(ed.estacionouParcial).toLowerCase() === 'sim';
      const parou = (!!ed.roboParou) || String(ed.roboParou).toLowerCase() === 'sim';
      if (c) { endgameScore += WEIGHTS.endgame_completo; endgameCompleto += 1; }
      if (p) { endgameScore += WEIGHTS.endgame_parcial; endgameParcial += 1; }
      if (parou) { endgameScore += WEIGHTS.endgame_parou; endgameParou += 1; }
    });

    // total artifacts
    const artefatosTotal = autonomoArteMed + autonomoArtePre + teleopArteTotal;

    // pontuação total estimada
    const totalScore = autonomoScore + teleopScore + endgameScore;

    // média por registro (se houver)
    const registrosCount = Math.max(1, e.registros.length);
    const avgScore = totalScore / registrosCount;

    // estratégia mais comum
    const estrategia = mode(e.estrategias) || '';

    return {
      numEquipe: e.numEquipe,
      registros: e.registros.length,
      autonomo: { score: autonomoScore, crossCount: autonomoCross, arteMed: autonomoArteMed, artePre: autonomoArtePre },
      teleop: { score: teleopScore, arteTotal: teleopArteTotal },
      endgame: { score: endgameScore, completo: endgameCompleto, parcial: endgameParcial, parou: endgameParou },
      artefatosTotal,
      totalScore,
      avgScore,
      estrategia
    };
  });

  // ordenar por totalScore descendente
  result.sort((a,b) => b.totalScore - a.totalScore);
  return result;
}

// ====== Funções para desenhar gráficos ======

function limparChart(chart) {
  if (chart) {
    chart.destroy();
  }
}

function desenharChart1(metrics) {
  // Desempenho por fase: somas médias (autonomo, teleop, endgame)
  const labels = metrics.map(m => m.numEquipe);
  const autonomoVals = metrics.map(m => m.autonomo.score);
  const teleopVals = metrics.map(m => m.teleop.score);
  const endgameVals = metrics.map(m => m.endgame.score);

  const ctx = document.getElementById('chart1').getContext('2d');
  limparChart(chart1);
  chart1 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Autônomo', data: autonomoVals, stack: 'stack1' },
        { label: 'Teleop', data: teleopVals, stack: 'stack1' },
        { label: 'EndGame', data: endgameVals, stack: 'stack1' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: 'Pontos (estimados)' } } }
    }
  });
}

function desenharChart2(metrics) {
  // Pontuação média (avgScore)
  const labels = metrics.map(m => m.numEquipe);
  const avg = metrics.map(m => round2(m.avgScore));

  const ctx = document.getElementById('chart2').getContext('2d');
  limparChart(chart2);
  chart2 = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'Pontuação Média', data: avg, fill: true, tension: 0.3 }]
    },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { title: { display:true, text: 'Pts médios' } } } }
  });
}

function desenharChart3(metrics) {
  // Distribuição de Pontos (top N)
  const top = metrics.slice(0, 8);
  const labels = top.map(m => m.numEquipe);
  const dataVals = top.map(m => round2(m.totalScore));

  const ctx = document.getElementById('chart3').getContext('2d');
  limparChart(chart3);
  chart3 = new Chart(ctx, {
    type: 'pie',
    data: { labels, datasets: [{ data: dataVals, label: 'Pontos' }] },
    options: { responsive: true }
  });
}

function desenharChart4(metrics) {
  // Artefatos por top equipes
  const top = metrics.slice(0, 8);
  const labels = top.map(m => m.numEquipe);
  const med = top.map(m => m.autonomo.arteMed + (m.teleop.arteTotal ? m.teleop.arteTotal : 0)); // bruto
  const pre = top.map(m => m.autonomo.artePre);

  const ctx = document.getElementById('chart4').getContext('2d');
  limparChart(chart4);
  chart4 = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Medievais', data: med },
        { label: 'Pré-históricos', data: pre }
      ]
    },
    options: { responsive: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true } } }
  });
}

// ====== Tabela ======

function popularTabela(metrics) {
  const tbody = document.querySelector('#tabelaDesempenho tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  metrics.forEach(m => {
    const tr = document.createElement('tr');

    const estrategiaText = m.estrategia || '-';
    const status = m.totalScore > 0 ? 'Ativo' : 'Sem dados';

    tr.innerHTML = `
      <td class="equipe">${escapeHtml(m.numEquipe)}</td>
      <td>${round2(m.totalScore)}</td>
      <td>${round2(m.autonomo.score)} (linhas:${m.autonomo.crossCount})</td>
      <td>${round2(m.teleop.score)} (arte:${m.teleop.arteTotal ?? 0})</td>
      <td>${round2(m.endgame.score)} (c:${m.endgame.completo}, p:${m.endgame.parcial})</td>
      <td>${m.artefatosTotal}</td>
      <td>${escapeHtml(estrategiaText)}</td>
      <td>${escapeHtml(status)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// busca/filtra tabela
function filtrarTabela() {
  const q = (document.getElementById('buscaEquipe')?.value || '').trim().toLowerCase();
  const rows = document.querySelectorAll('#tabelaDesempenho tbody tr');
  rows.forEach(r => {
    const equipe = (r.querySelector('.equipe')?.textContent || '').toLowerCase();
    r.style.display = (q === '' || equipe.includes(q)) ? '' : 'none';
  });
}

// ====== util ======
function round2(v) { return Math.round((v + Number.EPSILON) * 100) / 100; }
function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"'`=\/]/g, s => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;' })[s]);
}
function mode(arr) {
  if (!arr || !arr.length) return null;
  const counts = {};
  arr.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
  let top = null, best = 0;
  for (const k in counts) if (counts[k] > best) { best = counts[k]; top = k; }
  return top;
}
