// frontend/assets/endgame.js
document.addEventListener("DOMContentLoaded", () => {
  const btnVoltar = document.getElementById("btnVoltar");
  const btnFinalizar = document.getElementById("finalizarBtn");

  // Helper: leitura da "outbox" local (lista)
  function loadOutbox() {
    try {
      return JSON.parse(localStorage.getItem("robo_outbox") || "[]");
    } catch (e) {
      return [];
    }
  }
  function saveOutbox(list) {
    localStorage.setItem("robo_outbox", JSON.stringify(list || []));
  }
  function pushOutbox(item) {
    const l = loadOutbox();
    l.push(item);
    saveOutbox(l);
  }

  // Helper: tentará enviar itens pendentes da outbox (chamar manualmente se quiser)
  async function flushOutbox() {
    const list = loadOutbox();
    if (!list.length) return;
    const remaining = [];
    for (const item of list) {
      try {
        const r = await fetch("/api/salvar_robo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item)
        });
        if (!r.ok) {
          // keep for retry
          remaining.push(item);
        } else {
          // sucesso: nada a fazer (item consumido)
          // optionally read response if needed: await r.json()
        }
      } catch (err) {
        remaining.push(item);
      }
    }
    saveOutbox(remaining);
  }

  // Voltará para a tela anterior
  if (btnVoltar) {
    btnVoltar.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "teleoperado.html";
    });
  }

  // Finalizar: monta o objeto final e tenta enviar
  if (btnFinalizar) {
    btnFinalizar.addEventListener("click", async (e) => {
      e.preventDefault();

      // Pega registro atual do AppStorage (assumo que storage.js oferece getRegistro/savePartial)
      let registro = null;
      try {
        if (typeof AppStorage !== "undefined" && typeof AppStorage.getRegistro === "function") {
          registro = AppStorage.getRegistro() || {};
        } else {
          // fallback read direto do localStorage (mesmo formato esperado)
          registro = JSON.parse(localStorage.getItem("robo_dados") || "null") || {};
        }
      } catch (err) {
        registro = {};
      }

      // lê os campos do End Game no DOM
      const estacionouCompleto = document.getElementById("estacionouCompleto") ? document.getElementById("estacionouCompleto").value : "";
      const estacionouParcial = document.getElementById("estacionouParcial") ? document.getElementById("estacionouParcial").value : "";
      const roboParou = document.getElementById("roboParou") ? document.getElementById("roboParou").value : "";
      const penalidades = document.getElementById("penalidades") ? document.getElementById("penalidades").value.trim() : "";
      const estrategia = document.getElementById("estrategia") ? document.getElementById("estrategia").value : "";
      const observacoes = document.getElementById("observacoes") ? document.getElementById("observacoes").value.trim() : "";
      const numEquipeInput = document.getElementById("numEquipeInput") ? document.getElementById("numEquipeInput").value : "";

      // validações mínimas
      if (!registro || (!registro.numEquipe && !numEquipeInput)) {
        alert("Nenhum registro ativo. Preencha a página inicial antes de finalizar.");
        return;
      }

      // garante que os dados estão presentes
      registro.dados = registro.dados || {};
      registro.dados.endgame = {
        estacionouCompleto,
        estacionouParcial,
        roboParou,
        penalidades,
        estrategia,
        observacoes
      };

      // se o usuario informou número de equipe no endgame, sobrescreve
      if (numEquipeInput) {
        try {
          registro.numEquipe = Number(numEquipeInput);
        } catch (e) {
          // ignora
        }
      }

      // timestamp final
      registro.timestamp = new Date().toISOString();

      // Mostrar ao usuário que está enviando
      btnFinalizar.disabled = true;
      btnFinalizar.textContent = "Enviando...";

      // Tenta enviar ao backend
      try {
        const resp = await fetch("/api/salvar_robo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registro)
        });

        if (!resp.ok) {
          // erro HTTP (500, 400, etc.)
          const text = await resp.text().catch(() => "");
          // Guarda no outbox para retry se falhar
          pushOutbox(registro);
          alert("Erro ao enviar para o servidor. Registro salvo localmente na outbox. Detalhe: " + (text || resp.statusText || resp.status));
          console.error("Erro enviar:", resp.status, text);
          btnFinalizar.disabled = false;
          btnFinalizar.textContent = "Finalizar ✅";
          return;
        }

        // sucesso: remove registro local (se existir) e tenta limpar outbox remanescente
        try {
          if (typeof AppStorage !== "undefined" && typeof AppStorage.clearRegistro === "function") {
            AppStorage.clearRegistro();
          } else {
            localStorage.removeItem("robo_dados");
          }
        } catch (e) { /* ignore */ }

        // tenta enviar tudo da outbox (em background)
        try { flushOutbox(); } catch (e) { /* ignore */ }

        // feedback e redirecionamento
        alert("Registro enviado com sucesso!");
        // redireciona ao início ou limpa a UI
        window.location.href = "index.html";
      } catch (err) {
        // rede/offline: salva na outbox
        pushOutbox(registro);
        console.error("Erro de rede ao enviar registro:", err);
        alert("Sem conexão ou erro na rede. Registro salvo na outbox para envio posterior.");
        btnFinalizar.disabled = false;
        btnFinalizar.textContent = "Finalizar ✅";
      }
    });
  }
});
