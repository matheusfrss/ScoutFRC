// ===================== SCRIPT: Página Inicial (versão Supabase) ===================== //
const API_BASE = ''; // Ex: '' para local ou 'https://seu-backend.onrender.com'

document.addEventListener('DOMContentLoaded', () => {
  const nav = document.getElementById("menu-nav");
  nav.innerHTML = `
    <a href="index.html" class="active">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Gráficos</a>
  `;

  const btnProximo = document.getElementById("btnProximo");
  const btnSync = document.getElementById("btnSync");
  const btnLimpar = document.getElementById("btnLimpar");
  const outboxCountEl = document.getElementById("outboxCount");

  atualizarOutboxContador();

  btnProximo.addEventListener("click", salvarDados);
  btnSync.addEventListener("click", syncOutbox);
  btnLimpar.addEventListener("click", limparDadosLocais);

  // ================================================================ //
  function validarFormulario() {
    const camposObrigatorios = ["numPartida", "numEquipe", "corAlianca", "posicao", "nomeScout"];
    for (const id of camposObrigatorios) {
      const campo = document.getElementById(id);
      if (!campo.value.trim()) {
        alert(`Preencha o campo: ${campo.previousElementSibling.textContent}`);
        campo.focus();
        return false;
      }
    }
    return true;
  }

  async function salvarDados() {
    if (!validarFormulario()) return;

    const payload = {
      numPartida: document.getElementById("numPartida").value,
      isPlayoff: document.getElementById("isPlayoff").checked,
      isTreino: document.getElementById("isTreino").checked,
      isQualificatoria: document.getElementById("isQualificatoria").checked,
      isSemifinal: document.getElementById("isSemifinal").checked,
      numEquipe: document.getElementById("numEquipe").value,
      corAlianca: document.getElementById("corAlianca").value,
      posicao: document.getElementById("posicao").value,
      nomeScout: document.getElementById("nomeScout").value,
      dados: {},
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_BASE}/api/salvar_robo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Erro ao salvar no servidor");

      localStorage.setItem("robo_id", data.id);
      localStorage.setItem("numEquipeAtual", payload.numEquipe);
      console.log("✅ Registro criado no backend ID:", data.id);

      window.location.href = "autonomo.html";
    } catch (error) {
      console.error("❌ Erro ao salvar:", error);
      pushOutbox({ op: "create", payload });
      alert("Sem conexão: dados salvos localmente e serão sincronizados depois.");
      localStorage.setItem("robo_id", `local_${Date.now()}`);
      localStorage.setItem("numEquipeAtual", payload.numEquipe);
      window.location.href = "autonomo.html";
    }
  }

  // ================================================================ //
  // -------- Funções de Sincronização Offline -------- //
  function getOutbox() {
    return JSON.parse(localStorage.getItem("outbox") || "[]");
  }
  function setOutbox(arr) {
    localStorage.setItem("outbox", JSON.stringify(arr));
    atualizarOutboxContador();
  }
  function pushOutbox(item) {
    const arr = getOutbox();
    arr.push(item);
    setOutbox(arr);
  }
  function atualizarOutboxContador() {
    const count = getOutbox().length;
    outboxCountEl.textContent = count;
  }
  async function syncOutbox() {
    const outbox = getOutbox();
    if (!outbox.length) return alert("Nenhum registro pendente.");
    if (!confirm(`Enviar ${outbox.length} item(ns) pendente(s)?`)) return;

    const items = outbox.map(o => o.payload);

    try {
      const res = await fetch(`${API_BASE}/api/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      alert(`✅ ${data.inserted} registros sincronizados.`);
      localStorage.removeItem("outbox");
      atualizarOutboxContador();
    } catch (e) {
      alert("❌ Falha ao sincronizar. Verifique a conexão.");
    }
  }

  function limparDadosLocais() {
    if (!confirm("Apagar todos os dados locais (outbox e cache)?")) return;
    localStorage.clear();
    atualizarOutboxContador();
    alert("Dados locais apagados.");
  }

  window.addEventListener("online", () => {
    console.log("🌐 Online - tentando sincronizar automaticamente...");
    syncOutbox();
  });
});
