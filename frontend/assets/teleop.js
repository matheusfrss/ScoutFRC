// frontend/assets/teleop.js
// Teleoperado — salva em 'scouts' local e empacota item para outbox/backend

document.addEventListener("DOMContentLoaded", () => {

  // ====== menu (consistente com o resto) ======
  const navHtml = `
    <a href="index.html">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html" class="active">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Gráficos</a>
  `;
  const navEl = document.getElementById("menu-nav");
  if (navEl) navEl.innerHTML = navHtml;

  // Botões
  const btnVoltar = document.getElementById("btnVoltar");
  const btnProximo = document.getElementById("btnProximo");

  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      window.location.href = 'autonomo.html';
    });
  }

  if (btnProximo) {
    btnProximo.addEventListener("click", async () => {

      // pega o número da equipe salvo na página inicial
      const numEquipeStr = localStorage.getItem('numEquipeAtual');
      if (!numEquipeStr) {
        alert("❌ Número da equipe não encontrado! Volte à página inicial e selecione uma equipe.");
        return;
      }
      const numEquipe = Number(numEquipeStr);

      // captura os dados do formulário (força Number)
      const dadosTeleop = {
        medieval: Number(document.getElementById("teleopMedieval").value || 0),
        preHistorico: Number(document.getElementById("teleopPreHistorico").value || 0)
      };

      // estrutura compatível com seu grafico.js / legado
      const dadosCompletos = {
        num_equipe: numEquipe,
        estrategia: "",
        dados: {
          teleop: dadosTeleop
        },
        timestamp: new Date().toISOString()
      };

      try {
        // --- 1) atualizar/insert em 'scouts' (mantendo compatibilidade local) ---
        const raw = localStorage.getItem('scouts');
        let scoutsExistentes = [];
        try { scoutsExistentes = raw ? JSON.parse(raw) : []; } catch(e) { scoutsExistentes = []; }

        const idx = scoutsExistentes.findIndex(s => Number(s.num_equipe) === numEquipe);
        if (idx !== -1) {
          // atualiza apenas a parte de teleop (mantendo o resto)
          scoutsExistentes[idx].dados = scoutsExistentes[idx].dados || {};
          scoutsExistentes[idx].dados.teleop = dadosTeleop;
          scoutsExistentes[idx].timestamp = dadosCompletos.timestamp;
          console.log("✅ Teleop ATUALIZADO para equipe:", numEquipe);
        } else {
          // insere novo registro
          scoutsExistentes.push(dadosCompletos);
          console.log("✅ NOVO scout com Teleop criado para equipe:", numEquipe);
        }

        localStorage.setItem('scouts', JSON.stringify(scoutsExistentes));

        // --- 2) preparar item padronizado para enviar ao servidor (outbox) ---
        const outboxItem = {
          numEquipe: numEquipe,
          fase: 'teleop',
          payload: dadosTeleop,
          full_record: dadosCompletos,
          timestamp: new Date().toISOString()
        };

        // salva na outbox usando função global, se existir
        if (typeof saveToOutbox === 'function') {
          saveToOutbox(outboxItem);
        } else {
          // fallback manual
          try {
            const arr = JSON.parse(localStorage.getItem('outbox') || '[]');
            arr.push(outboxItem);
            localStorage.setItem('outbox', JSON.stringify(arr));
          } catch (e) {
            console.warn('Falha ao gravar outbox manualmente', e);
          }
        }

        // tenta sincronizar imediatamente (se syncOutbox existir)
        if (typeof syncOutbox === 'function') {
          await syncOutbox();
        }
        if (typeof updateOutboxCount === 'function') updateOutboxCount();

        console.log('💾 Dados teleop salvos localmente e empurrados para outbox:', outboxItem);

        // avança para a próxima etapa
        window.location.href = 'endgame.html';

      } catch (error) {
        console.error('❌ Erro ao salvar Teleop:', error);
        alert('Erro ao salvar dados. Verifique o console.');
      }
    });
  }

  // Permitir Enter para navegar (se houver o form)
  const form = document.getElementById("form-teleop");
  if (form) {
    form.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        btnProximo && btnProximo.click();
      }
    });
  }
});
