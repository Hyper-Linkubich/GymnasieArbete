
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
    //framsidan
    const cardFront = document.createElement("div");
    cardFront.className = "card-inner";
    const imgFront = document.createElement("img");
    imgFront.src = `/assets/${rank}_of_${suit}.png`;
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

// Litet test: rita 2 kort när sidan laddas
setTimeout(() => {
    drawCardToHand('10', 'spades');
    drawCardToHand('5', 'diamonds');
}, 1000);


function goBackToMenu() {
    socket.emit('leaveLobby', lobbyId)
    window.location.href = '/index.html';
}
