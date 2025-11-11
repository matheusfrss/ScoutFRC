// frontend/assets/endgame.js
document.addEventListener("DOMContentLoaded", () => {
  const API = window.API_BASE || "http://127.0.0.1:5000";
  const btnVoltar = document.getElementById("btnVoltar");
  const finalizarBtn = document.getElementById("finalizarBtn");

  if (btnVoltar) btnVoltar.addEventListener("click", ()=> window.location.href = "teleop.html");

  if (!finalizarBtn) return;

  finalizarBtn.addEventListener("click", async () => {
    const id = localStorage.getItem("robo_id_atual");
    if (!id){ alert("Nenhum registro ativo."); return; }

    const estacionouCompleto = document.getElementById("estacionouCompleto")?.value || "";
    const estacionouParcial = document.getElementById("estacionouParcial")?.value || "";
    const roboParou = document.getElementById("roboParou")?.value || "";
    const penalidades = document.getElementById("penalidades")?.value || "";
    const estrategia = document.getElementById("estrategia")?.value || "";
    const observacoes = document.getElementById("observacoes")?.value || "";
    const numEquipeInput = document.getElementById("numEquipeInput")?.value || null;

    const payload = {
      dados: {
        endgame: {
          estacionouCompleto, estacionouParcial, roboParou, penalidades
        }
      },
      estrategia,
      observacoes,
      timestamp: new Date().toISOString()
    };
    if (numEquipeInput) payload.num_equipe = Number(numEquipeInput);

    try {
      const res = await fetch(`${API}/api/atualizar_robo/${id}`, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Registro finalizado! Obrigado.");
        // opcional: limpar id atual
        localStorage.removeItem("robo_id_atual");
        window.location.href = "index.html";
        return;
      }
      ScoutOutbox.push({ method:"PUT", path:`/api/atualizar_robo/${id}`, body: payload, ts: new Date().toISOString() });
      alert("Enfileirado localmente. Registro concluído localmente.");
      localStorage.removeItem("robo_id_atual");
      window.location.href = "index.html";
    } catch(e){
      ScoutOutbox.push({ method:"PUT", path:`/api/atualizar_robo/${id}`, body: payload, ts: new Date().toISOString() });
      alert("Offline — finalizado localmente.");
      localStorage.removeItem("robo_id_atual");
      window.location.href = "index.html";
    }
  });
});
