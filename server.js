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

            io.to(lobbyId).emit("lobbyReady", [lobby.players.player1.id, lobby.players.player2.id]);
        }
    })

    socket.on("gameUpdateRequest", (lobbyId, gameState) => {
        io.to(lobbyId).emit("gameUpdate", gameState);
    })
    // io.to(lobbyId).emit('gameUpdate', /*game state or action */)

    //Lobby Leave segment
    socket.on('leaveLobby', (lobbyId, player) => {
        const lobby = lobbies[lobbyId];
        if (!lobby) return;


        lobby.players = lobby.players.filter(id => id !== playerId);
        socket.leave(lobbyId);

        console.log(`${playerId} lämnade lobbyn ${lobbyId}`)

        if (lobby.players.length === 1) {
            io.to(lobbyId).emit("opponentLeft", { message: "Motståndaren har lämnat lobbyn" })
        }

        if (lobby.players.length === 0) {
            delete lobbies[lobbyId];
            console.log(`Lobbyn: ${lobbyId} raderades`)
        }


    })




    // if (players.get(playerId) === lobbies.currentPlayerId) {
    //     //vid godkänt move ta bort kort och applya effekter
    //     // sen byt currentplayer
    //     lobbies[lobbyId].currentPlayerId = lobbies.otherPlayerId;
    //     io.to(lobbyId).emit('turnChanged', lobbies.currentPlayerId);
    // } else {
    //     //ignorera eller skicka tillbaka
    // }
    // const playerInLobby = lobbies.players; //array av två socket id
    // let currentTurnIndex = 0;

    function initDeck(player) {
        const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

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




