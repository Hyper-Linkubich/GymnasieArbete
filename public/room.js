
let scores = {
    yourBoard: 0,
    opponentBoard: 0
}

function createCardElement(rank, suit, onClickCallback = null) {
    const cardDiv = document.createElement("div")
    cardDiv.className = "card";

    if (onClickCallback) {
        cardDiv.addEventListener("click", () => onClickCallback(cardDiv, rank, suit));
    }

    const cardInner = document.createElement("div");
    cardInner.className = "card-inner";

    let imageRank = rank;
    if (rank === "1") imageRank = "ace"
    else if (rank === "11") imageRank = "jack"
    else if (rank === "12") imageRank = "queen"
    else if (rank === "13") imageRank = "king"

    //framsidan
    const cardFront = document.createElement("div");
    cardFront.className = "card-inner";
    const imgFront = document.createElement("img");
    imgFront.src = `/assets/${imageRank}_of_${suit}.png`;
    imgFront.className = "card-img";
    cardFront.appendChild(imgFront);

    //Baksidan
    const cardBack = document.createElement("div");
    cardBack.className = "card-back";
    const imgBack = document.createElement("img");
    imgBack.src = "/assets/card back blue.png";
    imgBack.className = "card-img";
    cardBack.appendChild(imgBack);

    cardInner.appendChild(cardFront);
    cardInner.appendChild(cardBack);
    cardDiv.appendChild(cardInner)

    return cardDiv;
}

function getCardValue(rank) {
    return parseInt(rank);
}

function playCard(boardId, cardData) {
    const board = document.getElementById(boardId);
    const emptySlot = board.querySelector(".card-slot:empty");

    if (emptySlot) {
        const cardElement = createCardElement(cardData.rank, cardData.suit);

        cardElement.classList.add("card-played-anim");

        emptySlot.appendChild(cardElement);

        const points = getCardValue(cardData.rank);
        scores[boardId] += points //points

        const scoreElementId = boardId === "yourBoard" ? "yourScore" : "opponentScore";
        document.getElementById(scoreElementId).innerText = `Poäng ${scores[boardId]}`

        return true;
    } else {
        console.log("Spelplanen är full");
        return false;
    }
}

function playFromHand(cardElement, rank, suit) {
    cardElement.classList.add("card-leave-anim");

    setTimeout(() => {
        const cardData = { rank: rank, suit: suit };
        const wasPlayed = playCard("yourBoard", cardData);

        if (wasPlayed) {
            cardElement.remove();

            socket.emit("playCard", lobbyId, cardData);
        } else {
            cardElement.classList.remove("card-leave-anim")
        }
    }, 150);
}

function drawCardToHand(rank, suit) {
    const hand = document.getElementById("yourHand");

    // Vi skickar med playFromHand som callback, så kortet blir klickbart
    const newCard = createCardElement(rank, suit, playFromHand);

    hand.appendChild(newCard);
}

function resetBoard() {
    scores.yourBoard = 0;
    scores.opponentBoard = 0;
    document.getElementById("yourScore").innerText = "Poäng 0";
    document.getElementById("opponentScore").innerText = "Poäng 0";

    const slots = document.querySelectorAll(".card-slot");
    slots.forEach(slot => {
        slot.innerHTML = "";
    })
}

function showEndGame(message) {
    const overlay = document.getElementById("endGameOverlay");
    const messageElement = document.getElementById("endGameMessage");

    messageElement.innerText = message;
    overlay.classList.remove("hidden");
}

function hideEndGame() {
    const overlay = document.getElementById("endGameOverlay");
    overlay.classList.add("hidden");
}

function goBackToMenu() {
    socket.emit('leaveLobby', lobbyId)
    window.location.href = '/index.html';
}
