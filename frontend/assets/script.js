// ===================== SCRIPT: Página Inicial (adaptado para seu backend Flask) ===================== //

const API_BASE = 'http://127.0.0.1:5000'; // <-- ajuste se você hospedar em outro lugar
const OUTBOX_KEY = 'outbox';
const DADOS_KEY = 'dadosPartida';
const NUM_EQ_KEY = 'numEquipeAtual';

document.addEventListener("DOMContentLoaded", () => {

  // ====== MENU DE NAVEGAÇÃO ======
  const nav = document.getElementById("menu-nav");
  nav.innerHTML = `
    <a href="index.html" class="active">Início</a>
    <a href="autonomo.html">Autônomo</a>
    <a href="teleop.html">Teleoperado</a>
    <a href="endgame.html">End Game</a>
    <a href="graficos.html">Gráficos</a>
  `;

  // ====== ELEMENTOS PRINCIPAIS ======
  const form = document.getElementById("form-inicio");
  const btnProximo = document.getElementById("btnProximo");
  const btnSync = document.getElementById("btnSync");
  const btnMigrate = document.getElementById("btnMigrate");
  const btnLimpar = document.getElementById("btnLimpar");
  const outboxCountEl = document.getElementById("outboxCount");
  let dadosPartida = {};

  // ===================== EVENTOS ===================== //

  // Botão "Próximo"
  btnProximo.addEventListener("click", async () => {
    if (validarFormulario()) {
      await salvarDados();         // tenta salvar no servidor (ou fallback para offline)
      window.location.href = "autonomo.html";
    }
  });

  // Botão forçar sincronização
  btnSync.addEventListener("click", async () => {
    btnSync.disabled = true;
    btnSync.textContent = 'Sincronizando...';
    try {
      const result = await syncOutbox();
      alert(`Sincronização concluída: ${result.synced}/${result.total} sincronizados.`);
    } catch (err) {
      alert('Falha na sincronização. Veja o console para detalhes.');
    } finally {
      btnSync.disabled = false;
      btnSync.textContent = 'Forçar Sincronização';
      updateOutboxCount();
    }
  });

  // Botão migrar (usa chave "scouts" por padrão)
  btnMigrate.addEventListener("click", async () => {
    const confirmM = confirm('Deseja migrar os dados da chave "scouts" para o servidor agora?');
    if (!confirmM) return;
    await migrateLocalStorage('scouts');
    updateOutboxCount();
  });

  // Botão limpar dados locais
  btnLimpar.addEventListener("click", () => {
    const ok = confirm('Tem certeza que quer apagar dados locais (dadosPartida, outbox, scouts)?');
    if (!ok) return;
    limparDadosPartida();
    updateOutboxCount();
  });

  // Enter envia o formulário
  form.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      btnProximo.click();
    }
  });

  // Sincroniza quando o navegador volta online
  window.addEventListener('online', () => {
    console.log('online: tentando sincronizar outbox...');
    syncOutbox().then(()=> updateOutboxCount());
  });

  // Inicializa página
  carregarDadosSalvos();
  updateOutboxCount();

  // Tenta sincronizar itens pendentes assim que carregar
  syncOutbox()
    .then(() => updateOutboxCount())
    .catch(err => console.warn('syncOutbox init falhou', err));
});


// ===================== FUNÇÕES INTERNAS ===================== //


// ✅ Valida todos os campos
function validarFormulario() {
  const campos = [
    { id: "numPartida", nome: "Número da partida" },
    { id: "tipoPartida", nome: "Tipo de partida" },
    { id: "numEquipe", nome: "Número da equipe" },
    { id: "corAlianca", nome: "Cor da aliança" },
    { id: "posicao", nome: "Posição na arena" },
    { id: "nomeScout", nome: "Nome do scout" },
  ];

  for (const campo of campos) {
    const elemento = document.getElementById(campo.id);
    if (!elemento.value || !String(elemento.value).trim()) {
      alert(`Por favor, preencha o campo: ${campo.nome}`);
      elemento.focus();
      return false;
    }
  }

  // Validação extra: número da equipe
  const numEquipe = parseInt(document.getElementById("numEquipe").value, 10);
  if (isNaN(numEquipe) || numEquipe <= 0) {
    alert("Número da equipe deve ser maior que 0");
    document.getElementById("numEquipe").focus();
    return false;
  }

  return true;
}


// monta o objeto com os valores do formulário
function buildDadosPartidaObject() {
  const numEquipe = document.getElementById("numEquipe").value;

  const obj = {
    numPartida: document.getElementById("numPartida").value,
    tipoPartida: document.getElementById("tipoPartida").value,
    numEquipe: Number(numEquipe),
    corAlianca: document.getElementById("corAlianca").value,
    posicao: document.getElementById("posicao").value,
    nomeScout: document.getElementById("nomeScout").value,
    timestamp: new Date().toISOString(),
    source: 'client' // marca de origem, útil para debug
  };

  return obj;
}


// Salva dados: tenta enviar ao servidor, se falhar salva na outbox (offline)
async function salvarDados() {
  dadosPartida = buildDadosPartidaObject();

  // salva localmente sempre para permitir edição/continuidade
  try {
    localStorage.setItem(DADOS_KEY, JSON.stringify(dadosPartida));
    localStorage.setItem(NUM_EQ_KEY, String(dadosPartida.numEquipe));
  } catch (err) {
    console.warn('falha ao gravar localStorage (não crítico)', err);
  }

  // tenta enviar ao servidor para /api/salvar_robo
  try {
    const resp = await fetch(`${API_BASE}/api/salvar_robo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosPartida)
    });

    if (!resp.ok) {
      const text = await resp.text().catch(()=>'');
      throw new Error(`HTTP ${resp.status} ${text}`);
    }

    const json = await resp.json();
    // opcional: grava server_id se backend retornar id
    if (json && json.id) {
      dadosPartida.server_id = json.id;
      try { localStorage.setItem(DADOS_KEY, JSON.stringify(dadosPartida)); } catch(e) {}
    }

    console.log('✅ Dados enviados ao servidor:', json);
  } catch (err) {
    // fallback: salva em outbox para sincronização posterior
    console.warn('✖ Erro ao enviar para servidor — salvando offline (outbox).', err);
    saveToOutbox(dadosPartida);
    updateOutboxCount();
  }
}


// ===================== CARREGAMENTO / EDIÇÃO ===================== //

// ✅ Carrega dados salvos (para edição)
function carregarDadosSalvos() {
  const dadosSalvos = localStorage.getItem(DADOS_KEY);
  if (!dadosSalvos) return;

  try {
    dadosPartida = JSON.parse(dadosSalvos);
  } catch (e) {
    console.warn('Formato inválido em localStorage dadosPartida', e);
    return;
  }

  for (const [chave, valor] of Object.entries(dadosPartida)) {
    const campo = document.getElementById(chave);
    if (campo) {
      if (campo.type === 'number') campo.value = valor ?? '';
      else campo.value = valor ?? '';
    }
  }

  console.log("📂 Dados carregados:", dadosPartida);
}


// ===================== OUTBOX (fallback offline) ===================== //

function readOutbox() {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
  } catch (err) {
    console.error('readOutbox: formato inválido', err);
    return [];
  }
}

function saveToOutbox(item) {
  try {
    const arr = readOutbox();
    arr.push(item);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr));
  } catch (err) {
    console.error('saveToOutbox: falha ao gravar', err);
  }
}

function clearOutbox() {
  localStorage.removeItem(OUTBOX_KEY);
}

function updateOutboxCount() {
  const c = readOutbox().length;
  const el = document.getElementById('outboxCount');
  if (el) el.textContent = String(c);
}


// tenta sincronizar a outbox com o servidor, usando /api/import quando possível
async function syncOutbox() {
  let items = readOutbox();
  if (!items.length) {
    return { synced: 0, total: 0 };
  }

  console.log(`syncOutbox: tentando sincronizar ${items.length} item(s)`);

  // Se houver mais de 1 item, tenta enviar em lote via /api/import
  if (items.length > 1) {
    try {
      const res = await fetch(`${API_BASE}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items)
      });

      if (res.ok) {
        clearOutbox();
        console.log(`syncOutbox: sincronizados ${items.length} itens via /api/import`);
        updateOutboxCount();
        return { synced: items.length, total: items.length };
      } else {
        console.warn('syncOutbox: /api/import retornou erro, caindo para envio individual', res.status);
      }
    } catch (err) {
      console.warn('syncOutbox: falha ao chamar /api/import, caindo para envio individual', err);
    }
  }

  // fallback: envio item a item
  const remaining = [];
  let synced = 0;

  for (const item of items) {
    try {
      const res = await fetch(`${API_BASE}/api/salvar_robo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      if (res.ok) {
        synced += 1;
        // opcional: ler id retornado
        // const json = await res.json();
      } else {
        const txt = await res.text().catch(()=> '');
        console.warn('syncOutbox: servidor respondeu erro para um item', res.status, txt);
        remaining.push(item);
      }
    } catch (err) {
      console.warn('syncOutbox: falha conexão ao enviar item, mantendo na outbox', err);
      remaining.push(item);
    }
  }

  // grava os que restaram (se houver)
  if (remaining.length) {
    try {
      localStorage.setItem(OUTBOX_KEY, JSON.stringify(remaining));
    } catch (err) {
      console.error('syncOutbox: falha ao atualizar outbox local', err);
    }
  } else {
    clearOutbox();
  }

  updateOutboxCount();
  console.log(`syncOutbox: sincronizados ${synced}/${items.length}`);
  return { synced, total: items.length };
}


// ===================== MIGRAÇÃO (chave antiga do localStorage) ===================== //

/*
Se você tinha uma chave antiga no localStorage (ex: "scouts"), chame migrateLocalStorage('scouts')
Ele enviará os registros um a um para /api/salvar_robo.
*/
async function migrateLocalStorage(oldKey = 'scouts') {
  const raw = localStorage.getItem(oldKey);
  if (!raw) return alert(`Nenhum dado encontrado na chave "${oldKey}"`);

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return alert('Formato inválido no localStorage para a chave ' + oldKey);
  }

  if (!Array.isArray(data)) data = [data];

  // tenta batch se muitos itens
  if (data.length > 1) {
    try {
      const res = await fetch(`${API_BASE}/api/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        alert(`Migração concluída! ${data.length} itens enviados via /api/import.`);
        localStorage.removeItem(oldKey);
        updateOutboxCount();
        return;
      } else {
        console.warn('migrateLocalStorage: /api/import retornou erro, caindo para envio individual', res.status);
      }
    } catch (err) {
      console.warn('migrateLocalStorage: falha ao chamar /api/import, caindo para envio individual', err);
    }
  }

  // fallback: enviar item a item
  const failed = [];
  let success = 0;
  for (const item of data) {
    try {
      const res = await fetch(`${API_BASE}/api/salvar_robo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) success += 1;
      else failed.push(item);
    } catch (err) {
      failed.push(item);
    }
  }

  if (failed.length === 0) {
    alert(`Migração concluída! ${success} itens enviados.`);
    localStorage.removeItem(oldKey);
  } else {
    alert(`Migração parcial: ${success} enviados, ${failed.length} falharam. Falhas guardadas na outbox.`);
    const outbox = readOutbox().concat(failed);
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(outbox));
  }

  updateOutboxCount();
}


// ===================== FUNÇÕES GLOBAIS (compatibilidade com seu código anterior) ===================== //

// Retorna os dados da partida (mantive a função)
function obterDadosPartida() {
  const dados = localStorage.getItem(DADOS_KEY);
  return dados ? JSON.parse(dados) : null;
}

// Retorna o número da equipe atual (mantive a função)
function obterNumEquipeAtual() {
  return localStorage.getItem(NUM_EQ_KEY);
}

// Limpa dados da partida (para testes)
function limparDadosPartida() {
  localStorage.removeItem(DADOS_KEY);
  localStorage.removeItem(NUM_EQ_KEY);
  localStorage.removeItem('scouts'); // mantendo a limpeza original
  localStorage.removeItem(OUTBOX_KEY);
  console.log("🧹 Dados limpos");
  alert("Dados limpos com sucesso!");
}
