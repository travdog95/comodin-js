import constants from "../constants.js";
import UI from "./UI.js";
import utils from "./_utilities.js";

export default class Player {
  constructor(id, screenName, color, deck, settings) {
    this.id = id;
    this.screenName = screenName;
    this.color = color;
    this.deck = deck;
    this.hand = [];
    this.marbles = {};
    this.settings = settings;
    this.paddleElement = "";
    this.discardedCard = {};
    this.deckElement = "";
    this.deckContainer = "";
    this.playerIconElement = "";
    this.handElement = "";
    this.discardPileElement = "";
    this.drawPileElement = "";
    this.exitPosition = "";
    this.doorPosition = "";
  }

  get marbleElements() {
    return document.querySelectorAll(`[data-player="${this.id}"]`);
  }

  get playableCards() {}

  // drawPileHandler() {
  //   this.drawPileElement.addEventListener("click", async (e) => {
  //     if (this.hand.length < this.settings.maxCardsInHand) {
  //       await this.drawCard();
  //     } else {
  //       UI.displayMessage("Hand is full!");
  //     }
  //   });
  // }

  async dealHand(numCards) {
    const cards = await this.deck.drawCards(numCards);

    cards.forEach((card) => {
      UI.drawCard(card, this);
      this.hand.push(card);
    });
  }

  removeCardFromHand(card) {
    let newHand = [];
    this.hand.forEach((cardInHand) => {
      if (card.code === cardInHand.code) {
        UI.removeCardFromHand(card, this);
      } else {
        newHand.push(cardInHand);
      }
    });

    this.hand = newHand;
  }

  findMovableMarbles(card) {
    let movableMarbles = [];
    this.marbleElements.forEach((marbleElement) => {
      //Marbles in start
      if (marbleElement.dataset.start && this.exitPosition.dataset.player != this.id) {
        if (constants.CARDS.EXIT_START.includes(card.value)) {
          movableMarbles.push(marbleElement);
        }
      }

      //Marbles on the track
      if (marbleElement.dataset.track) {
        // if (constants.CARDS.MOVE_BACKWARD.includes(card.value)) {
        if (this.noMarblesInPath(marbleElement, card.value)) movableMarbles.push(marbleElement);
        // } else {
        //   if (this.noMarblesInPath(card.value)) movableMarbles.push(marbleElement);
        // }
      }
    });

    return movableMarbles;
  }

  moveMarble(card, marbleElement) {
    let fromElement = marbleElement;
    let toElement;

    const fromTrack = marbleElement.dataset.track;
    const fromPosition = marbleElement.dataset.position;
    const fromPositionValue = utils.getMarblePositionValue(fromPosition);
    let toPosition = "";
    let toPositionValue = 0;
    let toTrack = "";

    const marbleNum = marbleElement.dataset.marble;
    //Move marble
    //Move marble from start
    if (marbleElement.dataset.start) {
      if (constants.CARDS.EXIT_START.includes(card.value)) {
        //Update marbles property
        toPosition = `${this.id}-9`;
        this.marbles[marbleNum] = toPosition;
        //Update UI
        UI.moveMarble(
          fromElement,
          this.paddleElement.querySelector(`[data-position="${toPosition}"]`),
          this
        );

        //End turn
        this.endTurn();
        return;
      }
    }
    //If marble on track

    //Backwards card
    if (constants.CARDS.MOVE_BACKWARD.includes(card.value)) {
      toPositionValue = fromPositionValue - parseInt(constants.CARDS.VALUES[card.value]);
      toTrack = parseInt(fromTrack);

      if (toPositionValue < 1) {
        toPositionValue = toPositionValue + constants.NUM_POSITIONS_PER_TRACK;
        toTrack = toTrack === 1 ? this.settings.playerNames.length : toTrack - 1;
      }

      toPosition = `${toTrack}-${toPositionValue}`;

      toElement = document.querySelector(`[data-position="${toPosition}"]`);
      UI.moveMarble(fromElement, toElement, this);
      this.endTurn();
      return;
    } else {
      //Determine where to move marbles
      let toPositionValue = fromPositionValue + parseInt(constants.CARDS.VALUES[card.value]);
      toTrack = parseInt(fromTrack);

      if (toPositionValue > constants.NUM_POSITIONS_PER_TRACK) {
        toPositionValue = toPositionValue - constants.NUM_POSITIONS_PER_TRACK;
        toTrack = utils.getNextTrack(toTrack, this.settings.playerNames.length);
      }

      toPosition = `${toTrack}-${toPositionValue}`;

      toElement = document.querySelector(`[data-position="${toPosition}"]`);
      UI.moveMarble(fromElement, toElement, this);
      this.endTurn();
      return;
    }

    //If marble in home
  }

  cardEventHandlers(card, img) {
    img.addEventListener("click", (e) => {
      if (Object.keys(this.discardedCard).length === 0) {
        UI.discardCard(card, this);
        this.removeCardFromHand(card);
        this.discardedCard = card;

        //Make moveable marbles clickable
        this.marbleEventHandlers(this.findMovableMarbles(card));
      } else {
        UI.displayMessage("Finish your turn!");
      }
    });

    img.addEventListener("mouseover", (e) => {
      //highlight moveableMarbles
      UI.highlightMoveableMarbles(this.findMovableMarbles(card));
    });

    img.addEventListener("mouseout", (e) => {
      UI.unHighlightMoveableMarbles();
    });
  }

  boundMarbleHandler = this.marbleHandler.bind(this);

  marbleEventHandlers(moveableMarbles) {
    moveableMarbles.forEach((marbleElement) => {
      marbleElement.classList.add("clickable");
      marbleElement.addEventListener("click", this.boundMarbleHandler);
    });
  }

  marbleHandler(e) {
    const marbleElement = e.target;
    this.moveMarble(this.discardedCard, marbleElement);
  }

  updateTrackAttributes() {
    const trackElements = this.paddleElement.querySelectorAll("[data-track]");
    trackElements.forEach((trackElement) => {
      const position = `${this.id}-${trackElement.dataset.position}`;
      trackElement.dataset.track = this.id;
      trackElement.dataset.position = position;
    });

    this.exitPosition = this.paddleElement.querySelector("[data-exit]");
    this.doorPosition = this.paddleElement.querySelector("[data-door]");
  }

  removeMarbleClickability() {
    const clickableMarbles = document.querySelectorAll(".paddle-item.clickable");
    clickableMarbles.forEach((clickableMarble) => {
      clickableMarble.removeEventListener("click", this.boundMarbleHandler);
      clickableMarble.classList.remove("clickable");
    });
  }

  async endTurn() {
    //Remove clickability from marble
    this.removeMarbleClickability();

    //Draw card
    await this.drawCard();

    //Clear discarded card
    this.discardedCard = {};

    //Find next player
  }

  async drawCard() {
    const cards = await this.deck.drawCards(1);
    const card = cards[0];
    this.hand.push(card);
    UI.drawCard(card, this, `${this.screenName} drew a card.`);
  }

  noMarblesInPath(marble, cardValue) {
    const track = parseInt(marble.dataset.track);
    const position = marble.dataset.position;
    const positionValue = utils.getMarblePositionValue(position);
    const marbleId = marble.dataset.marble;

    let p = 1;
    let currentPosition = 0;
    let currentTrack = "";
    let currentPositionElement = "";

    //Check behind
    if (constants.CARDS.MOVE_BACKWARD.includes(cardValue)) {
      return true;
    } else {
      for (p; p <= parseInt(cardValue); p++) {
        if (positionValue + p > constants.NUM_POSITIONS_PER_TRACK) {
          currentPosition = positionValue + p - constants.NUM_POSITIONS_PER_TRACK;
          currentTrack = utils.getNextTrack(track);
        } else {
          currentPosition = positionValue + p;
          currentTrack = track;
        }
        currentPositionElement = document.querySelector(
          `[data-position="${currentTrack}-${currentPosition}"]`
        );
        // console.log("marbleId", marbleId);
        // console.log("marbleplayer", currentPositionElement.dataset.player);
        // console.log("currentTrack", currentTrack);
        // console.log("player", this.id);

        if (currentPositionElement.dataset.player == this.id) return false;
      }
      return true;
    }
  }
}
