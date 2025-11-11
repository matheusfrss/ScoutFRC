// frontend/assets/endgame.js
// Envia os dados finais ao backend (PUT se já existir id, POST se novo).
// Em caso de falha, salva payload no outbox (localStorage) para reenviar depois.
document.addEventListener("DOMContentLoaded", () => {
  const REG_KEY = "robo_dados";
  const OUTBOX_KEY = "outbox";
  // usa BASE já exposto por script.js se existir; senão usa origin
  const API_BASE = window.API_BASE || window.location.origin;

  // elementos do formulário/endgame
  const elEstComp = document.getElementById("estacionouCompleto");
  const elEstParc = document.getElementById("estacionouParcial");
  const elRoboParou = document.getElementById("roboParou");
  const elPenal = document.getElementById("penalidades");
  const elEstrategia = document.getElementById("estrategia");
  const elObs = document.getElementById("observacoes");
  const elNumEquipe = document.getElementById("numEquipeInput");
  const btnVoltar = document.getElementById("btnVoltar");
  const btnFinalizar = document.getElementById("finalizarBtn");

  // util: ler registro atual
  function carregarRegistro() {
    try {
      return JSON.parse(localStorage.getItem(REG_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  // util: salvar registro localmente
  function salvarRegistroLocal(reg) {
    try {
      localStorage.setItem(REG_KEY, JSON.stringify(reg));
    } catch (e) {
      console.error("Erro ao salvar registro local:", e);
    }
  }

  // util: adicionar item ao outbox
  function pushOutbox(item) {
    try {
      const arr = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
      arr.push(item);
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr));
      // atualiza contador visual se existir
      const oc = document.getElementById("outboxCount");
      if (oc) oc.textContent = String(arr.length);
    } catch (e) {
      console.error("Erro ao gravar outbox:", e);
    }
  }

  // tenta reenviar itens no outbox (usado opcionalmente)
  async function flushOutbox() {
    try {
      let arr = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
      if (!arr.length) return { sent: 0, remaining: 0 };

      const remaining = [];
      let sent = 0;

      for (const item of arr) {
        try {
          if (item.method === "POST") {
            const r = await fetch(`${API_BASE}${item.path}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.body),
            });
            if (!r.ok) throw new Error("HTTP " + r.status);
            sent++;
          } else if (item.method === "PUT") {
            // item.path deve conter /api/atualizar_robo/<id>
            const r = await fetch(`${API_BASE}${item.path}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(item.body),
            });
            if (!r.ok) throw new Error("HTTP " + r.status);
            sent++;
          } else {
            // desconhecido -> manter
            remaining.push(item);
          }
        } catch (err) {
          console.warn("Falha ao reenviar item do outbox:", err, item);
          remaining.push(item);
        }
      }

      localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
      const oc = document.getElementById("outboxCount");
      if (oc) oc.textContent = String(remaining.length);
      return { sent, remaining: remaining.length };
    } catch (e) {
      console.error("Erro ao processar outbox:", e);
      return { sent: 0, remaining: 0 };
    }
  }

  // preenche selects simples caso o HTML não tenha opções
  function ensureSelectOptions() {
    const yesNo = [
      { v: "", t: "Selecione..." },
      { v: "sim", t: "Sim" },
      { v: "nao", t: "Não" },
    ];
    const fill = (el) => {
      if (!el) return;
      if (el.options.length <= 1) {
        el.innerHTML = "";
        yesNo.forEach((o) => {
          const opt = document.createElement("option");
          opt.value = o.v;
          opt.textContent = o.t;
          el.appendChild(opt);
        });
      }
    };
    fill(elEstComp);
    fill(elEstParc);
    fill(elRoboParou);
  }

  ensureSelectOptions();

  // popula campos se registro já existir
  const registro = carregarRegistro();
  if (!registro) {
    alert("Nenhum registro ativo. Você será redirecionado para a página inicial.");
    window.location.href = "index.html";
    return;
  }

  (function preencherCampos() {
    const dados = registro.dados || {};
    const end = dados.endgame || {};
    if (elEstComp) elEstComp.value = end.estacionouCompleto || "";
    if (elEstParc) elEstParc.value = end.estacionouParcial || "";
    if (elRoboParou) elRoboParou.value = end.roboParou || "";
    if (elPenal) elPenal.value = end.penalidades || "";
    if (elEstrategia) elEstrategia.value = end.estrategia || "";
    if (elObs) elObs.value = end.observacoes || "";
    if (elNumEquipe) elNumEquipe.value = registro.numEquipe || registro.num_equipe || "";
  })();

  // voltar
  if (btnVoltar) {
    btnVoltar.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "teleoperado.html";
    });
  }

  // função que monta o payload final esperado pelo backend
  function montarPayload(finalRegistro) {
    return {
      dados: finalRegistro.dados || {},
      estrategia: finalRegistro.estrategia || finalRegistro.dados?.endgame?.estrategia || null,
      observacoes:
        finalRegistro.observacoes || finalRegistro.dados?.endgame?.observacoes || null,
      num_equipe: finalRegistro.numEquipe || finalRegistro.num_equipe || null,
      timestamp: new Date().toISOString(),
    };
  }

  // enviar: se tiver id -> PUT /api/atualizar_robo/<id>, se não -> POST /api/salvar_robo
  async function enviarRegistro(finalRegistro) {
    const payload = montarPayload(finalRegistro);
    // detecta id (pode ser id, _id ou id retornado pelo backend)
    const id =
      finalRegistro.id ||
      finalRegistro._id ||
      finalRegistro.id_robo ||
      finalRegistro.num_robo ||
      null;

    if (id) {
      // PUT
      const path = `/api/atualizar_robo/${id}`;
      try {
        const resp = await fetch(`${API_BASE}${path}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const j = await resp.json().catch(() => null);
        return { ok: true, result: j };
      } catch (err) {
        // em erro, empilha para outbox com método PUT
        pushOutbox({ method: "PUT", path, body: payload, original: finalRegistro, when: new Date().toISOString() });
        return { ok: false, error: err };
      }
    } else {
      // POST
      const path = `/api/salvar_robo`;
      try {
        const resp = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.assign({}, finalRegistro, { dados: finalRegistro.dados || {} })),
        });
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        const j = await resp.json().catch(() => null);
        // se backend retornou id, atualiza local
        if (j && j.id) {
          finalRegistro.id = j.id;
          finalRegistro._id = j.id;
          salvarRegistroLocal(finalRegistro);
        }
        return { ok: true, result: j };
      } catch (err) {
        // em erro, empilha para outbox com método POST
        pushOutbox({ method: "POST", path, body: Object.assign({}, finalRegistro, { dados: finalRegistro.dados || {} }), when: new Date().toISOString() });
        return { ok: false, error: err };
      }
    }
  }

  // handler do botão finalizar
  if (btnFinalizar) {
    btnFinalizar.addEventListener("click", async (e) => {
      e.preventDefault();
      btnFinalizar.disabled = true;
      btnFinalizar.textContent = "Enviando...";

      // coleta valores
      const estacionouCompleto = elEstComp ? elEstComp.value : "";
      const estacionouParcial = elEstParc ? elEstParc.value : "";
      const roboParou = elRoboParou ? elRoboParou.value : "";
      const penalidades = elPenal ? elPenal.value.trim() : "";
      const estrategia = elEstrategia ? elEstrategia.value : "";
      const observacoes = elObs ? elObs.value.trim() : "";
      const numEquipeVal = elNumEquipe ? elNumEquipe.value.trim() : "";

      // atualiza registro local
      const novoRegistro = carregarRegistro() || {};
      novoRegistro.dados = novoRegistro.dados || {};
      novoRegistro.dados.endgame = {
        estacionouCompleto,
        estacionouParcial,
        roboParou,
        penalidades,
        estrategia,
        observacoes,
        savedAt: new Date().toISOString(),
      };

      if (numEquipeVal) {
        const n = Number(numEquipeVal);
        if (!Number.isNaN(n)) {
          novoRegistro.numEquipe = n;
          novoRegistro.num_equipe = n;
        }
      }

      salvarRegistroLocal(novoRegistro);

      // tenta enviar
      const res = await enviarRegistro(novoRegistro);

      if (res.ok) {
        // remove registro local (opcional) e atualiza contador outbox
        try {
          localStorage.removeItem(REG_KEY);
        } catch (e) {}
        // tentar flush do outbox (opcional, não obrigatório)
        try {
          const flushRes = await flushOutbox();
          console.log("Flush outbox =>", flushRes);
        } catch (e) {
          console.warn("Flush outbox falhou:", e);
        }

        alert("✅ Registro finalizado e enviado (ou enfileirado). Voltando ao início.");
        // atualiza contador visual
        const oc = document.getElementById("outboxCount");
        if (oc) {
          const arr = JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]");
          oc.textContent = String(arr.length);
        }
        // redireciona
        window.location.href = "index.html";
      } else {
        // já foi empilhado no outbox dentro de enviarRegistro
        alert("⚠️ Não foi possível enviar agora. Registro salvo como pendente. Voltando ao início.");
        btnFinalizar.disabled = false;
        btnFinalizar.textContent = "Finalizar ✅";
        window.location.href = "index.html";
      }
    });
  }

  // expõe funções para debug no console
  window._endgame = {
    carregarRegistro,
    salvarRegistroLocal,
    pushOutbox,
    flushOutbox,
  };
});
