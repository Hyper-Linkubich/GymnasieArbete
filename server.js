const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { randomUUID } = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 5500;

const lobbies = {};


app.use(express.static('public'));

server.listen(PORT, () => console.log(`lystnar på porten http://localhost:${PORT}`))

const players = new Map()

io.on('connection', socket => {
    const playerId = socket.handshake.query.playerId;
    if (!playerId) {
        console.log("Player rejected", playerId)
        return socket.disconnect()
    }
    players.set(playerId, socket.id)
    console.log("Player id:", playerId, players.get(playerId))

    //Lobby create segment
    socket.on('createLobby', (lobbyId) => {
        if (lobbyId == "") {
            lobbyId = randomUUID();
        }
        lobbies[lobbyId] = {
            players: {
                player1: {
                    deck: [],
                    hand: [],
                    playedCards: [],
                    score: 0,
                },
                player2: {
                    deck: [],
                    hand: [],
                    playedCards: [],
                    score: 0,
                }
            },
            currentTurnIndex: 0,
            discardPile: [],
            //mer lobby data / states
        }

        socket.join(lobbyId); //joina socket till en Socket.IO som heter Lobby id,
        console.log("Lobby Created: ", lobbyId, lobbies[lobbyId])
        socket.emit('lobbyCreated', lobbyId); //berätta Id för klienten
    })



    //Lobby join segment
    socket.on('joinLobby', lobbyId => {
        const lobby = lobbies[lobbyId];

        if (!lobby) {
            return socket.emit("errorMessage", "Lobbyn finns inte")
        }

        if (!lobby.players.player1.id) {
            lobby.players.player1.id = players.get(playerId);
        } else if (!lobby.players.player2.id) {
            lobby.players.player2.id = players.get(playerId);
        } else {
            return socket.emit("errorMessage", "Lobbyn är redan full")
        }

        socket.join(lobbyId);
        socket.emit("lobbyCreated", lobbyId);

        if (lobby.players.player1.id && lobby.players.player2.id) {
            initDeck(lobby.players.player1);
            initDeck(lobby.players.player2);

            lobby.players.player1.hand = lobby.players.player1.deck.splice(0, 5);
            lobby.players.player2.hand = lobby.players.player2.deck.splice(0, 5);

            io.to(lobbyId).emit("lobbyReady", [lobby.players.player1.id, lobby.players.player2.id]);

            io.to(lobby.players.player1.id).emit("dealHand", lobby.players.player1.hand);
            io.to(lobby.players.player2.id).emit("dealHand", lobby.players.player2.hand);
        }
    }) //Slut på lobby join

    socket.on('playCard', (lobbyId, cardData) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        // Skapa genvägar till spelarna direkt
        const p1 = lobby.players.player1;
        const p2 = lobby.players.player2;

        // Vilken spelare la kortet?
        let playerKey = null;
        if (p1.id === socket.id) playerKey = "player1";
        else if (p2.id === socket.id) playerKey = "player2";

        // Spara kortet och lägg till poäng
        if (playerKey) {
            lobby.players[playerKey].playedCards.push(cardData);
            lobby.players[playerKey].score += parseInt(cardData.rank);
        }

        // Skicka kortet till motståndaren
        socket.to(lobbyId).emit("opponentPlayedCard", cardData);

        // --- RÄTTAD KONTROLL: Kolla om BÅDA har lagt 5 kort ---
        if (p1.playedCards.length === 5 && p2.playedCards.length === 5) {

            // Kolla vem som vann BARA om rundan är slut
            if (p1.score > p2.score) {
                io.to(p1.id).emit("Victory");
                io.to(p2.id).emit("Defeat");
            } else if (p1.score < p2.score) {
                io.to(p1.id).emit("Defeat");
                io.to(p2.id).emit("Victory");
            } else {
                io.to(lobbyId).emit("Draw");
            }

            // Starta om spelet efter 5 sekunder
            setTimeout(() => {
                // Nollställ för nästa runda
                p1.playedCards = [];
                p2.playedCards = [];
                p1.score = 0;
                p2.score = 0;

                // Fyll på leken om den är liten
                if (p1.deck.length <= 5) initDeck(p1);
                if (p2.deck.length <= 5) initDeck(p2);

                // Dela ut nya kort
                p1.hand = p1.deck.splice(0, 5);
                p2.hand = p2.deck.splice(0, 5);

                io.to(lobbyId).emit("Rematch");
                io.to(p1.id).emit("dealHand", p1.hand);
                io.to(p2.id).emit("dealHand", p2.hand);
            }, 5000);
        }
    });

    socket.on("gameUpdateRequest", (lobbyId, gameState) => {
        io.to(lobbyId).emit("gameUpdate", gameState);
    })
    // io.to(lobbyId).emit('gameUpdate', /*game state or action */)

    //Lobby Leave segment
    socket.on('leaveLobby', (lobbyId) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;

        // Hitta vilken spelare som lämnar och nollställ ID:t
        if (lobby.players.player1.id === players.get(playerId)) {
            lobby.players.player1.id = null;
        } else if (lobby.players.player2.id === players.get(playerId)) {
            lobby.players.player2.id = null;
        }

        socket.leave(lobbyId);
        console.log(`${playerId} lämnade lobbyn ${lobbyId}`);

        // Kontrollera om lobbyn är helt tom
        const p1Exists = !!lobby.players.player1.id;
        const p2Exists = !!lobby.players.player2.id;

        if (!p1Exists && !p2Exists) {
            delete lobbies[lobbyId];
            console.log(`Lobbyn: ${lobbyId} raderades`);
        } else {
            // Om en spelare är kvar, meddela den
            io.to(lobbyId).emit("opponentLeft", { message: "Motståndaren har lämnat lobbyn" });
        }
    });

    function initDeck(player) {
        const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        const ranks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13'];

        for (let i = 0; i < 13; i++) { // 13 valörer
            for (let j = 0; j < 4; j++) { // 4 färger
                player.deck.push({
                    suit: suits[j],
                    rank: ranks[i]
                });
            }
        }
        player.deck.sort(() => Math.random() - 0.5)

        console.log("Kotrlek skapad och shufflad antal kort:", player.deck.length);
    }


    function nextTurn(lobbyId) {
        currentTurnIndex = (currentTurnIndex + 1) % playerInLobby.length;
        const nextPlayerId = playerInLobby[currentTurnIndex];
        io.to(lobbies[lobbyId]).emit('yourTurn', nextPlayerId);
        scheduleTimeout;
    }



})




