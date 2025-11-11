// ===================== SCRIPT: Página Inicial ===================== //
document.addEventListener("DOMContentLoaded", () => {
  const BASE_URL = "http://127.0.0.1:5000"; // altere se backend estiver em outro lugar

  // ====== MENU DE NAVEGAÇÃO ======
  const nav = document.getElementById("menu-nav");
  if (nav) {
    nav.innerHTML = `
      <a href="index.html" class="active">Início</a>
      <a href="autonomo.html">Autônomo</a>
      <a href="teleop.html">Teleoperado</a>
      <a href="endgame.html">End Game</a>
      <a href="graficos.html">Gráficos</a>
    `;
  }

  const form = document.getElementById("form-inicio");
  const btnProximo = document.getElementById("btnProximo");

  // ===================== EVENTOS ===================== //
  btnProximo.addEventListener("click", async () => {
    if (!validarFormulario()) return;

    const dados = coletarDados();
    console.log("📝 Enviando dados iniciais:", dados);

    try {
      const resp = await fetch(`${BASE_URL}/api/salvar_robo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });

      const resultado = await resp.json();
      if (resultado.status === "sucesso") {
        alert(`Registro criado com id ${resultado.id}. Vá para Autônomo.`);
        localStorage.setItem("robo_id_atual", resultado.id);
        window.location.href = "autonomo.html";
      } else {
        alert("❌ Erro ao salvar: " + resultado.message);
      }
    } catch (error) {
      console.error("❌ Falha ao enviar dados:", error);
      alert("Erro de conexão com o servidor.");
    }
  });

  // ===================== FUNÇÕES ===================== //
  function validarFormulario() {
    const campos = [
      "numPartida",
      "tipoPartida",
      "numEquipe",
      "corAlianca",
      "posicao",
      "nomeScout",
    ];
    for (const id of campos) {
      const el = document.getElementById(id);
      if (!el.value.trim()) {
        alert(`Por favor, preencha o campo: ${id}`);
        el.focus();
        return false;
      }
    }
    return true;
  }

  function coletarDados() {
    return {
      numPartida: document.getElementById("numPartida").value,
      tipoPartida: document.getElementById("tipoPartida").value,
      numEquipe: document.getElementById("numEquipe").value,
      corAlianca: document.getElementById("corAlianca").value,
      posicao: document.getElementById("posicao").value,
      nomeScout: document.getElementById("nomeScout").value,
      timestamp: new Date().toISOString(),
    };
  }
});
