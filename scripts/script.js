document.addEventListener("DOMContentLoaded", () => {
  const playerId =
    localStorage.getItem("playerId") ||
    `browser_${Math.random().toString(36).substring(2, 9)}`;
  localStorage.setItem("playerId", playerId);

  const elements = {
    teamNameInput: document.getElementById("teamNameInput"),
    setTeamNameButton: document.getElementById("setTeamNameButton"),
    pedraButton: document.getElementById("pedraButton"),
    papelButton: document.getElementById("papelButton"),
    tesouraButton: document.getElementById("tesouraButton"),
    messageDisplay: document.getElementById("message"),
    playerTeamNameDisplay: document.getElementById("player-team-name"),
    playerMoveDisplay: document.getElementById("player-move"),
    opponentTeamNameDisplay: document.getElementById("opponent-team-name"),
    opponentMoveDisplay: document.getElementById("opponent-move"),
    gameStatusDisplay: document.getElementById("game-status"),
    winnerTeamNameDisplay: document.getElementById("winner-team-name"),
    roundCounterDisplay: document.getElementById("round-counter"),
  };

  const SERVER_URL = "http://52.5.245.24:8080/jokenpo/play";
  let currentTeamName = localStorage.getItem("teamName") || "";
  let playerMadeMove = false;

  // Variável para controlar o intervalo de polling
  let pollingInterval = null;

  init();

  function init() {
    if (currentTeamName) {
      elements.teamNameInput.value = currentTeamName;
      elements.playerTeamNameDisplay.textContent = currentTeamName;
      enableGameInteraction();
      elements.gameStatusDisplay.textContent =
        "Codinome carregado. Pronto para jogar Jokenpo!";
      sendJokenpoMove(null);
    } else {
      elements.gameStatusDisplay.textContent =
        "Por favor, insira o codinome da sua equipe.";
      disableGameInteraction();
    }

    if (localStorage.getItem("teamName")) {
      if (elements.setTeamNameButton) {
        elements.setTeamNameButton.style.display = "none";
      }
    } else {
      if (elements.setTeamNameButton) {
        elements.setTeamNameButton.style.display = "";
      }
    }

    elements.setTeamNameButton.addEventListener("click", handleTeamNameSet);

    document.querySelectorAll("#jokenpo-buttons button").forEach((button) => {
      button.addEventListener("click", function () {
        console.log("Botão clicado:", this.dataset.move);
        handleMove(this.dataset.move);
      });
    });

    // Inicializa tratamento de conexão
    handleConnectionIssues();
  }

  function handleTeamNameSet() {
    const teamName = elements.teamNameInput.value.trim();
    if (!teamName) {
      showAlert("Por favor, insira o codinome da sua equipe!");
      elements.teamNameInput.focus();
      return;
    }
    currentTeamName = teamName;
    localStorage.setItem("teamName", currentTeamName);
    elements.playerTeamNameDisplay.textContent = currentTeamName;
    enableGameInteraction();
    resetGameUI();
    elements.gameStatusDisplay.textContent =
      "Equipe registrada. Faça sua jogada!";
    if (elements.setTeamNameButton) {
      elements.setTeamNameButton.style.display = "none";
    }
    sendJokenpoMove(null);
  }

  function handleMove(playerMove) {
    console.log("Processando jogada:", playerMove);
    if (!playerMadeMove) {
      const confirmar = confirm(
        `Confirmar jogada: ${playerMove.toUpperCase()}?`
      );

      if (confirmar) {
        elements.playerMoveDisplay.textContent = playerMove || "?";
        sendJokenpoMove(playerMove);
        playerMadeMove = true;
        disableGameInteraction();
        console.log("Jogada confirmada e enviada:", playerMove);
      } else {
        console.log("Jogada cancelada pelo usuário");
      }
    } else {
      console.log("Jogador já fez uma jogada nesta rodada");
    }
  }

  async function sendJokenpoMove(playerMove) {
    if (!currentTeamName) {
      showAlert("Por favor, confirme o codinome da sua equipe primeiro.");
      return;
    }

    console.log(
      "Enviando jogada para o servidor:",
      playerMove,
      "da equipe:",
      currentTeamName
    );

    try {
      const payload = {
        playerId,
        teamName: currentTeamName,
        playerMove,
      };

      console.log("Payload da requisição:", JSON.stringify(payload));

      const response = await fetch(SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Status da resposta:", response.status);

      if (!response.ok)
        throw new Error(`Erro HTTP! Status: ${response.status}`);

      const data = await response.json();
      console.log("Dados recebidos do servidor:", data);

      updateUI(data);

      if (data.status === "waiting_opponent" && playerMove !== null) {
        console.log("Configurando verificação periódica para jogada do oponente");
        startPollingForOpponentMove();
      } else if (data.status === "game_over") {
        stopPollingForOpponentMove();
        setTimeout(() => {
          resetRound();
          elements.messageDisplay.textContent = "Nova rodada! Faça sua jogada.";
        }, 2000);
      }
    } catch (error) {
      console.error("Erro ao enviar jogada Jokenpo:", error);
      elements.messageDisplay.textContent =
        "Erro ao conectar ao servidor. Tente novamente.";
      resetRound();
    }
  }

  function startPollingForOpponentMove() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    pollingInterval = setInterval(async () => {
      try {
        console.log("Verificando status da jogada...");

        const response = await fetch(SERVER_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            teamName: currentTeamName,
            playerMove: null,
          }),
        });

        if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);

        const data = await response.json();
        console.log("Dados da verificação:", data);

        updateUI(data);

        if (data.status === "game_over") {
          stopPollingForOpponentMove();
          setTimeout(() => {
            resetRound();
            elements.messageDisplay.textContent = "Nova rodada! Faça sua jogada.";
          }, 2000);
        }
      } catch (error) {
      }
    }, 3000);
  }

  function stopPollingForOpponentMove() {
    if (pollingInterval) {
      console.log("Parando verificação periódica");
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  function updateUI(data) {
    elements.playerTeamNameDisplay.textContent =
      data.playerTeamName || currentTeamName;
    elements.playerMoveDisplay.textContent = data.playerMove || "?";
    elements.opponentTeamNameDisplay.textContent =
      data.opponentTeamName || "Aguardando...";
    elements.opponentMoveDisplay.textContent = data.opponentMove || "?";
    elements.roundCounterDisplay.textContent = data.round || "0";
    switch (data.status) {
      case "waiting_opponent":
        elements.messageDisplay.textContent = data.message;
        elements.gameStatusDisplay.textContent =
          "Aguardando a jogada do oponente...";
        elements.winnerTeamNameDisplay.textContent = "";
        break;
      case "game_over":
        elements.messageDisplay.textContent = data.message;
        elements.gameStatusDisplay.textContent = `Rodada ${data.round} Finalizada!`;
        elements.winnerTeamNameDisplay.textContent = data.winnerTeam
          ? `Vencedor: ${data.winnerTeam}!`
          : "Empate!";
        break;
      default:
        elements.messageDisplay.textContent =
          data.message || "Estado Desconhecido";
        elements.gameStatusDisplay.textContent = "Jogo em andamento...";
    }
  }

  function enableGameInteraction() {
    elements.teamNameInput.disabled = true;
    if (elements.setTeamNameButton) {
      elements.setTeamNameButton.style.display = "none";
    }
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
    elements.playerMoveDisplay.textContent = "?";
    elements.opponentMoveDisplay.textContent = "?";
    elements.winnerTeamNameDisplay.textContent = "";
    stopPollingForOpponentMove();
  }

  function resetGameUI() {
    resetRound();
    elements.messageDisplay.textContent = "";
  }

  function handleConnectionIssues() {
    window.addEventListener('online', () => {
      console.log('Conexão restabelecida, verificando status do jogo...');
      elements.messageDisplay.textContent = 'Conexão restabelecida. Verificando status do jogo...';
      sendJokenpoMove(null);
    });

    window.addEventListener('offline', () => {
      console.log('Conexão perdida');
      elements.messageDisplay.textContent = 'Conexão perdida. Aguardando reconexão...';
      stopPollingForOpponentMove();
    });
  }

  function showAlert(msg) {
    window.alert(msg);
  }
});
