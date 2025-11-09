// script.js - Página Inicial
document.addEventListener("DOMContentLoaded", function() {
    // Menu de navegação
    document.getElementById("menu-nav").innerHTML = `
        <a href="index.html" class="active">Início</a>
        <a href="autonomo.html">Autônomo</a>
        <a href="teleop.html">Teleoperado</a>
        <a href="endgame.html">End Game</a>
        <a href="graficos.html">Gráficos</a>
    `;

    // Elementos do formulário
    const form = document.getElementById('form-inicio');
    const btnProximo = document.getElementById('btnProximo');
    
    // Dados que serão usados nas próximas páginas
    let dadosPartida = {};

    // Configurar evento do botão
    btnProximo.addEventListener('click', function() {
        if (validarFormulario()) {
            salvarDados();
            window.location.href = 'autonomo.html';
        }
    });

    // Validação do formulário
    function validarFormulario() {
        const campos = [
            { id: 'numPartida', nome: 'Número da partida' },
            { id: 'tipoPartida', nome: 'Tipo de partida' },
            { id: 'numEquipe', nome: 'Número da equipe' },
            { id: 'corAlianca', nome: 'Cor da aliança' },
            { id: 'posicao', nome: 'Posição na arena' },
            { id: 'nomeScout', nome: 'Nome do scout' }
        ];

        for (let campo of campos) {
            const elemento = document.getElementById(campo.id);
            if (!elemento.value.trim()) {
                alert(`Por favor, preencha o campo: ${campo.nome}`);
                elemento.focus();
                return false;
            }
        }

        // Validação específica para número da equipe
        const numEquipe = parseInt(document.getElementById('numEquipe').value);
        if (numEquipe <= 0) {
            alert('Número da equipe deve ser maior que 0');
            document.getElementById('numEquipe').focus();
            return false;
        }

        return true;
    }

    // Salvar dados no localStorage para usar nas próximas páginas
    function salvarDados() {
        dadosPartida = {
            numPartida: document.getElementById('numPartida').value,
            tipoPartida: document.getElementById('tipoPartida').value,
            numEquipe: document.getElementById('numEquipe').value,
            corAlianca: document.getElementById('corAlianca').value,
            posicao: document.getElementById('posicao').value,
            nomeScout: document.getElementById('nomeScout').value,
            timestamp: new Date().toISOString()
        };

        // Salvar no localStorage
        localStorage.setItem('dadosPartida', JSON.stringify(dadosPartida));
        console.log('📝 Dados salvos:', dadosPartida);
    }

    // Carregar dados salvos se existirem (para edição)
    function carregarDadosSalvos() {
        const dadosSalvos = localStorage.getItem('dadosPartida');
        if (dadosSalvos) {
            dadosPartida = JSON.parse(dadosSalvos);
            
            // Preencher formulário com dados salvos
            document.getElementById('numPartida').value = dadosPartida.numPartida || '';
            document.getElementById('tipoPartida').value = dadosPartida.tipoPartida || '';
            document.getElementById('numEquipe').value = dadosPartida.numEquipe || '';
            document.getElementById('corAlianca').value = dadosPartida.corAlianca || '';
            document.getElementById('posicao').value = dadosPartida.posicao || '';
            document.getElementById('nomeScout').value = dadosPartida.nomeScout || '';
            
            console.log('📝 Dados carregados:', dadosPartida);
        }
    }

    // Permitir Enter para navegar
    form.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            btnProximo.click();
        }
    });

    // Inicializar
    carregarDadosSalvos();
});

// Função global para obter dados da partida (usada em outras páginas)
function obterDadosPartida() {
    const dados = localStorage.getItem('dadosPartida');
    return dados ? JSON.parse(dados) : null;
}

// Função global para limpar dados (para testes)
function limparDadosPartida() {
    localStorage.removeItem('dadosPartida');
    localStorage.removeItem('dadosAutonomo');
    localStorage.removeItem('dadosTeleop');
    localStorage.removeItem('dadosEndgame');
    console.log('🧹 Dados limpos');
    alert('Dados limpos com sucesso!');
}