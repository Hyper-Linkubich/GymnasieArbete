

function goBackToMenu() {
    socket.emit('leaveLobby', lobbyId)
    window.location.href = '/index.html';
}