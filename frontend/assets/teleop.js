// frontend/assets/teleop.js
document.addEventListener('DOMContentLoaded', () => {
  const REG_KEY = 'robo_dados';

  // elementos
  const form = document.getElementById('form-teleop');
  const teleopMedievalEl = document.getElementById('teleopMedieval');
  const teleopPreHistoricoEl = document.getElementById('teleopPreHistorico');
  const btnVoltar = document.getElementById('btnVoltar');
  const btnProximo = document.getElementById('btnProximo');

  function carregarRegistro() {
    try {
      return JSON.parse(localStorage.getItem(REG_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function salvarRegistro(reg) {
    localStorage.setItem(REG_KEY, JSON.stringify(reg));
  }

  function validar() {
    // campos numéricos já têm min/default; não forçamos obrigatoriedade
    return { ok: true };
  }

  // preenche se houver
  (function preenche() {
    const reg = carregarRegistro();
    if (!reg) return;
    const tele = (reg.dados && reg.dados.teleop) || {};
    if (typeof tele.teleopMedieval !== 'undefined') teleopMedievalEl.value = tele.teleopMedieval;
    if (typeof tele.teleopPreHistorico !== 'undefined') teleopPreHistoricoEl.value = tele.teleopPreHistorico;
  })();

  btnVoltar && btnVoltar.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'autonomo.html';
  });

  btnProximo && btnProximo.addEventListener('click', (e) => {
    e.preventDefault();
    const v = validar();
    if (!v.ok) {
      alert(v.msg);
      return;
    }

    let reg = carregarRegistro();
    if (!reg) {
      alert('Nenhum registro ativo. Volte para a página inicial e preencha os dados da partida.');
      return;
    }

    reg.dados = reg.dados || {};
    reg.dados.teleop = {
      teleopMedieval: Number(teleopMedievalEl.value) || 0,
      teleopPreHistorico: Number(teleopPreHistoricoEl.value) || 0,
      savedAt: new Date().toISOString()
    };

    salvarRegistro(reg);

    // navega para endgame
    window.location.href = 'endgame.html';
  });

  // expor util
  window._teleop = {
    carregarRegistro,
    salvarRegistro
  };
});
