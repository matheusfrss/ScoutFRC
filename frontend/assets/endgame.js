// frontend/assets/endgame.js
// Endgame — segue padrão: atualiza 'scouts' local, cria outboxItem {numEquipe, fase:'endgame', payload,...}, tenta sync

document.addEventListener('DOMContentLoaded', () => {
  // menu (padronizado)
  const navHtml = `
    <a href="index.html">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html">Teleoperado</a>
    <a href="endgame.html" class="active">End Game</a>
    <a href="graficos.html">Gráficos</a>
  `;
  const navEl = document.getElementById('menu-nav');
  if (navEl) navEl.innerHTML = navHtml;

  // elements
  const selCompleto = document.getElementById('estacionouCompleto');
  const selParcial = document.getElementById('estacionouParcial');
  const selParou = document.getElementById('roboParou');
  const inpPenal = document.getElementById('penalidades');
  const selEstrat = document.getElementById('estrategia');
  const taObs = document.getElementById('observacoes');
  const inpNumEquipe = document.getElementById('numEquipeInput');

  const btnVoltar = document.getElementById('btnVoltar');
  const btnFinalizar = document.getElementById('finalizarBtn');

  // preencher selects com opções simples
  preencherSelectPlaceholderOptions(selCompleto, ['Selecione', 'Sim', 'Não']);
  preencherSelectPlaceholderOptions(selParcial, ['Selecione', 'Sim', 'Não']);
  preencherSelectPlaceholderOptions(selParou, ['Selecione', 'Sim', 'Não']);

  // Voltar
  if (btnVoltar) btnVoltar.addEventListener('click', () => window.location.href = 'teleop.html');

  // Finalizar
  if (btnFinalizar) {
    btnFinalizar.addEventListener('click', async () => {
      // pega equipe: usa input se preenchido, senão pega do localStorage numEquipeAtual
      let numEquipe = null;
      const v = inpNumEquipe && inpNumEquipe.value ? Number(inpNumEquipe.value) : null;
      if (v && !Number.isNaN(v) && v > 0) numEquipe = v;
      else {
        const saved = localStorage.getItem('numEquipeAtual');
        if (saved) numEquipe = Number(saved);
      }

      if (!numEquipe) {
        alert('Número da equipe não informado. Preencha o campo ou volte à página inicial para selecionar a equipe.');
        return;
      }

      // valida selects
      if (!selCompleto.value) { alert('Selecione se estacionou completo (Sim/Não)'); selCompleto.focus(); return; }
      if (!selParcial.value) { alert('Selecione se estacionou parcial (Sim/Não)'); selParcial.focus(); return; }
      if (!selParou.value) { alert('Selecione se o robô parou (Sim/Não)'); selParou.focus(); return; }

      // montar dados do endgame
      const dadosEndgame = {
        estacionouCompleto: selCompleto.value === 'sim',
        estacionouParcial: selParcial.value === 'sim',
        roboParou: selParou.value === 'sim',
        penalidades: (inpPenal && inpPenal.value) ? String(inpPenal.value).trim() : '',
        estrategia: (selEstrat && selEstrat.value) ? selEstrat.value : '',
        observacoes: (taObs && taObs.value) ? taObs.value.trim() : '',
      };

      // full record (compatível com scouts/legado)
      const dadosCompletos = {
        num_equipe: numEquipe,
        estrategia: dadosEndgame.estrategia || '',
        dados: {
          endgame: dadosEndgame
        },
        timestamp: new Date().toISOString()
      };

      try {
        // 1) atualizar/insert em 'scouts' local
        const raw = localStorage.getItem('scouts');
        let scoutsExistentes = [];
        try { scoutsExistentes = raw ? JSON.parse(raw) : []; } catch (e) { scoutsExistentes = []; }

        const idx = scoutsExistentes.findIndex(s => Number(s.num_equipe) === Number(numEquipe));
        if (idx !== -1) {
          scoutsExistentes[idx].dados = scoutsExistentes[idx].dados || {};
          scoutsExistentes[idx].dados.endgame = dadosEndgame;
          scoutsExistentes[idx].timestamp = dadosCompletos.timestamp;
          console.log('✅ Endgame ATUALIZADO para equipe:', numEquipe);
        } else {
          scoutsExistentes.push(dadosCompletos);
          console.log('✅ NOVO scout (endgame) criado para equipe:', numEquipe);
        }

        localStorage.setItem('scouts', JSON.stringify(scoutsExistentes));

        // 2) criar outboxItem padronizado
        const outboxItem = {
          numEquipe: Number(numEquipe),
          fase: 'endgame',
          payload: dadosEndgame,
          full_record: dadosCompletos,
          timestamp: new Date().toISOString()
        };

        // salvar em outbox via função global se existir
        if (typeof saveToOutbox === 'function') {
          saveToOutbox(outboxItem);
        } else {
          try {
            const arr = JSON.parse(localStorage.getItem('outbox') || '[]');
            arr.push(outboxItem);
            localStorage.setItem('outbox', JSON.stringify(arr));
          } catch (e) {
            console.warn('Falha ao gravar outbox manualmente', e);
          }
        }

        // tentar sincronizar agora
        if (typeof syncOutbox === 'function') {
          await syncOutbox();
        }
        if (typeof updateOutboxCount === 'function') updateOutboxCount();

        alert('Dados finalizados e salvos! Obrigado.');
        // redireciona para página inicial (ou onde preferir)
        window.location.href = 'index.html';
      } catch (err) {
        console.error('Erro ao finalizar endgame:', err);
        alert('Erro ao salvar dados. Veja o console.');
      }
    });
  }

  // permitir Enter no form
  const form = document.getElementById('form-endgame');
  if (form) {
    form.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); btnFinalizar && btnFinalizar.click(); }
    });
  }

  // util: preencher selects com placeholder
  function preencherSelectPlaceholderOptions(selectEl, lista) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    lista.forEach((v, idx) => {
      const opt = document.createElement('option');
      opt.textContent = v;
      if (idx === 0 && /selecion|selecione/i.test(v)) {
        opt.value = '';
        opt.selected = true;
        opt.disabled = true;
      } else {
        const lower = String(v).toLowerCase();
        if (lower === 'sim') opt.value = 'sim';
        else if (lower === 'não' || lower === 'nao') opt.value = 'nao';
        else opt.value = v;
      }
      selectEl.appendChild(opt);
    });
  }

});
