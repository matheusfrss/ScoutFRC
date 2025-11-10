// frontend/assets/autonomo.js (versão recomendada: mantém 'scouts' local e adiciona outbox padrão)

document.addEventListener("DOMContentLoaded", () => {

  // ====== menu (garante consistência com as outras páginas) ======
  const navHtml = `
    <a href="index.html">Início</a>
    <a href="autonomo.html" class="active">Autônomo</a>
    <a href="teleop.html">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Graficos</a>
  `;
  const navEl = document.getElementById("menu-nav");
  if (navEl) navEl.innerHTML = navHtml;

  // opções do SELECT
  const opcoesLinha = ["Selecione", "Sim", "Não"];
  preencherSelectPlaceholder("linha", opcoesLinha);

  // Botões
  const btnVoltar = document.getElementById("btnVoltar");
  const btnProximo = document.getElementById("btnProximo");

  if (btnVoltar) {
    btnVoltar.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  if (btnProximo) {
    btnProximo.addEventListener("click", async () => {
      const linhaVal = document.getElementById("linha").value;
      if (!linhaVal) {
        alert("Por favor, selecione se o robô ultrapassou a linha de largada.");
        return;
      }

      // pega o número da equipe salvo na página inicial
      const numEquipeStr = localStorage.getItem('numEquipeAtual');
      if (!numEquipeStr) {
        alert("❌ Número da equipe não encontrado! Volte à página inicial e selecione uma equipe.");
        return;
      }
      const numEquipe = Number(numEquipeStr);

      // monta dados do autônomo
      const dadosAutonomo = {
        linha: linhaVal,
        artefatosMedievais: Number(document.getElementById("artefatosMedievais").value || 0),
        artefatosPreHistoricos: Number(document.getElementById("artefatosPreHistoricos").value || 0)
      };

      // estrutura compatível com grafico.js / legado
      const dadosCompletos = {
        num_equipe: numEquipe,
        estrategia: "",
        dados: {
          autonomo: dadosAutonomo
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
          // atualiza apenas a parte de autonomo
          scoutsExistentes[idx].dados = scoutsExistentes[idx].dados || {};
          scoutsExistentes[idx].dados.autonomo = dadosAutonomo;
          scoutsExistentes[idx].timestamp = dadosCompletos.timestamp;
          console.log("✅ Dados autônomos ATUALIZADOS para equipe:", numEquipe);
        } else {
          // insere novo registro
          scoutsExistentes.push(dadosCompletos);
          console.log("✅ NOVO scout autônomo criado para equipe:", numEquipe);
        }

        localStorage.setItem('scouts', JSON.stringify(scoutsExistentes));

        // --- 2) preparar item padronizado para enviar ao servidor (outbox) ---
        const outboxItem = {
          numEquipe: numEquipe,          // campo top-level (o backend lê isto)
          fase: 'autonomo',              // qual fase esse item representa
          payload: dadosAutonomo,        // dados minimalistas da fase
          full_record: dadosCompletos,   // cópia completa (opcional, útil para debug e análises)
          timestamp: new Date().toISOString()
        };

        // salva na outbox usando função global, se existir (mantém padrão)
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

        console.log('💾 Dados autônomos salvos localmente e empurrados para outbox:', outboxItem);

        // avança para a próxima etapa
        window.location.href = "teleop.html";
      } catch (error) {
        console.error('❌ Erro ao salvar dados autônomos:', error);
        alert('Erro ao salvar dados. Verifique o console.');
      }
    });
  }

  // ----------------- Funções auxiliares locais -----------------

  function preencherSelectPlaceholder(id, lista) {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = "";
    lista.forEach((valor, idx) => {
      const option = document.createElement("option");
      option.textContent = valor;
      if (idx === 0 && /selecion|selecione/i.test(valor)) {
        option.value = "";
        option.selected = true;
        option.disabled = true;
      } else {
        // padroniza valor para 'sim'/'nao' em minúsculas
        const lower = String(valor).toLowerCase();
        if (lower === 'sim') option.value = 'sim';
        else if (lower === 'não' || lower === 'nao') option.value = 'nao';
        else option.value = valor;
      }
      select.appendChild(option);
    });
  }

});
