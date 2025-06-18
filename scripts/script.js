document.addEventListener('DOMContentLoaded', () => {
    const playerId = localStorage.getItem('playerId') || `browser_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('playerId', playerId);

    // Elementos DOM
    const elements = {
        teamNameInput: document.getElementById('teamNameInput'),
        setTeamNameButton: document.getElementById('setTeamNameButton'),
        pedraButton: document.getElementById('pedraButton'),
        papelButton: document.getElementById('papelButton'),
        tesouraButton: document.getElementById('tesouraButton'),
        messageDisplay: document.getElementById('message'),
        playerTeamNameDisplay: document.getElementById('player-team-name'),
        playerMoveDisplay: document.getElementById('player-move'),
        opponentTeamNameDisplay: document.getElementById('opponent-team-name'),
        opponentMoveDisplay: document.getElementById('opponent-move'),
        gameStatusDisplay: document.getElementById('game-status'),
        winnerTeamNameDisplay: document.getElementById('winner-team-name'),
        roundCounterDisplay: document.getElementById('round-counter')
    };

    const SERVER_URL = 'http://52.5.245.24:8080/jokenpo/play';
    let currentTeamName = localStorage.getItem('teamName') || '';
    let playerMadeMove = false;

    // Inicialização
    init();

    function init() {
        if (currentTeamName) {
            elements.teamNameInput.value = currentTeamName;
            elements.playerTeamNameDisplay.textContent = currentTeamName;
            enableGameInteraction();
            elements.gameStatusDisplay.textContent = 'Codinome carregado. Pronto para jogar Jokenpo!';
            sendJokenpoMove(null);
        } else {
            elements.gameStatusDisplay.textContent = 'Por favor, insira o codinome da sua equipe.';
            disableGameInteraction();
        }

        // Event listeners
        elements.setTeamNameButton.addEventListener('click', handleTeamNameSet);
        document.querySelectorAll('.jokenpo-buttons button').forEach(button => {
            button.addEventListener('click', () => handleMove(button.dataset.move));
        });
    }

    function handleTeamNameSet() {
        const teamName = elements.teamNameInput.value.trim();
        if (!teamName) {
            showAlert('Por favor, insira o codinome da sua equipe!');
            elements.teamNameInput.focus();
            return;
        }
        currentTeamName = teamName;
        localStorage.setItem('teamName', currentTeamName);
        elements.playerTeamNameDisplay.textContent = currentTeamName;
        enableGameInteraction();
        resetGameUI();
        elements.gameStatusDisplay.textContent = 'Equipe registrada. Faça sua jogada!';
        sendJokenpoMove(null);
    }

    function handleMove(playerMove) {
        if (!playerMadeMove) {
            sendJokenpoMove(playerMove);
            playerMadeMove = true;
            disableGameInteraction();
        }
    }

    async function sendJokenpoMove(playerMove) {
        if (!currentTeamName) {
            showAlert('Por favor, confirme o codinome da sua equipe primeiro.');
            return;
        }
        try {
            const response = await fetch(SERVER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerId, teamName: currentTeamName, playerMove })
            });
            if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
            const data = await response.json();
            updateUI(data);
            if (data.status === 'game_over') {
                setTimeout(() => {
                    resetRound();
                    elements.messageDisplay.textContent = 'Nova rodada! Faça sua jogada.';
                }, 2000);
            }
        } catch (error) {
            console.error('Erro ao enviar jogada Jokenpo:', error);
            elements.messageDisplay.textContent = 'Erro ao conectar ao servidor. Tente novamente.';
            resetRound();
        }
    }

    function updateUI(data) {
        elements.playerTeamNameDisplay.textContent = data.playerTeamName || currentTeamName;
        elements.playerMoveDisplay.textContent = data.playerMove || '?';
        elements.opponentTeamNameDisplay.textContent = data.opponentTeamName || 'Aguardando...';
        elements.opponentMoveDisplay.textContent = data.opponentMove || '?';
        elements.roundCounterDisplay.textContent = data.round || '0';
        switch (data.status) {
            case 'waiting_opponent':
                elements.messageDisplay.textContent = data.message;
                elements.gameStatusDisplay.textContent = 'Aguardando a jogada do oponente...';
                elements.winnerTeamNameDisplay.textContent = '';
                break;
            case 'game_over':
                elements.messageDisplay.textContent = data.message;
                elements.gameStatusDisplay.textContent = `Rodada ${data.round} Finalizada!`;
                elements.winnerTeamNameDisplay.textContent = data.winnerTeam ? `Vencedor: ${data.winnerTeam}!` : 'Empate!';
                break;
            default:
                elements.messageDisplay.textContent = data.message || 'Estado Desconhecido';
                elements.gameStatusDisplay.textContent = 'Jogo em andamento...';
        }
    }

    function enableGameInteraction() {
        elements.teamNameInput.disabled = true;
        elements.setTeamNameButton.disabled = true;
        elements.pedraButton.disabled = false;
        elements.papelButton.disabled = false;
        elements.tesouraButton.disabled = false;
    }

    function disableGameInteraction() {
        elements.pedraButton.disabled = true;
        elements.papelButton.disabled = true;
        elements.tesouraButton.disabled = true;
    }

    function resetRound() {
        playerMadeMove = false;
        enableGameInteraction();
        elements.playerMoveDisplay.textContent = '?';
        elements.opponentMoveDisplay.textContent = '?';
        elements.winnerTeamNameDisplay.textContent = '';
    }

    function resetGameUI() {
        resetRound();
        elements.messageDisplay.textContent = '';
    }

    function showAlert(msg) {
        window.alert(msg);
    }
});