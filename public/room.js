

function goBackToMenu() {
    socket.emit('leaveLobby', lobbyId, playerId)
    window.location.href = '/index.html';
}