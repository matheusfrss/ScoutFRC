// === autonomo.js ===
// garante que o script principal (script.js) já carregou
if (!window.API_BASE) {
    console.error("Erro: script.js não carregado antes de autonomo.js");
}

// Espera o DOM estar pronto
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("form-autonomo");
    const btnProximo = document.getElementById("btnProximo");
    const btnVoltar = document.getElementById("btnVoltar");

    // Carrega dados do localStorage (caso existam)
    const roboAtual = JSON.parse(localStorage.getItem("robo_dados") || "{}");

    if (roboAtual?.dados?.autonomo) {
        const auto = roboAtual.dados.autonomo;
        document.getElementById("linha").value = auto.linha || "";
        document.getElementById("artefatosMedievais").value = auto.artefatosMedievais || 0;
        document.getElementById("artefatosPreHistoricos").value = auto.artefatosPreHistoricos || 0;
    }

    // === Botão "Próximo" ===
    btnProximo.addEventListener("click", async () => {
        const dadosAutonomo = {
            linha: document.getElementById("linha").value,
            artefatosMedievais: Number(document.getElementById("artefatosMedievais").value || 0),
            artefatosPreHistoricos: Number(document.getElementById("artefatosPreHistoricos").value || 0)
        };

        // Atualiza localStorage com a etapa atual
        const dadosExistentes = JSON.parse(localStorage.getItem("robo_dados") || "{}");
        dadosExistentes.dados = dadosExistentes.dados || {};
        dadosExistentes.dados.autonomo = dadosAutonomo;
        localStorage.setItem("robo_dados", JSON.stringify(dadosExistentes));

        console.log("✅ Dados salvos (Autônomo):", dadosAutonomo);

        // Avança para a próxima etapa
        window.location.href = "teleop.html";
    });

    // === Botão "Voltar" ===
    btnVoltar.addEventListener("click", () => {
        window.location.href = "index.html";
    });
});
