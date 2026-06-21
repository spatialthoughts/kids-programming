// ============================================================
// INDIA STATES AND CAPITALS - script.js
//
// This file makes the flashcards interactive. It does six jobs:
//   1. Show the right shape, name and capital for the current card.
//   2. Flip the card over when you click it (in two small steps).
//   3. Move to the next/previous card and keep track of progress.
//   4. Switch between the full deck and the "Seven Sisters" deck.
//   5. Show a fun fact when you press the Hint button.
//   6. Shuffle the order of the current deck's cards.
//
// The actual list of states/capitals/shapes lives in states-data.js
// (loaded before this file), inside an array called STATES_DATA.
// ============================================================


// ------------------------------------------------------------
// GRAB THE HTML ELEMENTS WE NEED TO UPDATE
// ------------------------------------------------------------
const flashcardBtn = document.getElementById('flashcard');
const flashcardInner = document.getElementById('flashcard-inner');
const shapeSvg = document.getElementById('shape-svg');
const shapePath = document.getElementById('shape-path');
const cardType = document.getElementById('card-type');
const cardName = document.getElementById('card-name');
const cardCapital = document.getElementById('card-capital');
const backHint = document.getElementById('back-hint');

const hintBtn = document.getElementById('hint-btn');
const cricketHintBtn = document.getElementById('cricket-hint-btn');
const hintBox = document.getElementById('hint-box');
const hintFact = document.getElementById('hint-fact');

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const deckCounter = document.getElementById('deck-counter');

const progressCount = document.getElementById('progress-count');
const progressTotal = document.getElementById('progress-total');
const progressFill = document.getElementById('progress-fill');

const modeAllBtn = document.getElementById('mode-all-btn');
const modeSevenBtn = document.getElementById('mode-seven-btn');
const shuffleBtn = document.getElementById('shuffle-btn');


// ------------------------------------------------------------
// DECKS
// The full deck is every card in STATES_DATA. The "Seven
// Sisters" deck is a small practice set with just the seven
// northeastern states, pulled out by name.
// ------------------------------------------------------------
const ALL_DECK = STATES_DATA;

const SEVEN_SISTERS_NAMES = [
  'Arunachal Pradesh',
  'Assam',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Tripura',
];
const SEVEN_SISTERS_DECK = STATES_DATA.filter((entry) =>
  SEVEN_SISTERS_NAMES.includes(entry.name)
);


// ------------------------------------------------------------
// GAME STATE
// ------------------------------------------------------------
// Which deck (array of cards) we are currently practicing. This
// starts as a COPY of ALL_DECK (".slice()" makes a new array)
// so the Shuffle button can reorder it without ever messing up
// the original ALL_DECK / SEVEN_SISTERS_DECK / STATES_DATA lists.
let activeDeck = ALL_DECK.slice();

// Which card (index into activeDeck) is showing right now.
let currentIndex = 0;

// How far the current card has been revealed:
//   0 = just the shape (front face)
//   1 = back face is showing, but the capital is still hidden
//   2 = back face is showing, capital revealed too
// Clicking the card moves 0 -> 1 -> 2 -> back to 0, and so on.
let revealStage = 0;

// A Set that remembers which card NAMES have been fully revealed
// (capital and all) at least once. We track by name rather than
// by index so that shuffling the deck (which moves cards to new
// index positions) never loses or confuses your progress. Sets
// automatically ignore duplicates, which is perfect for "have I
// already learned this one?".
const seenNames = new Set();


// ------------------------------------------------------------
// SHOW A CARD
// Fills in the shape + answer for activeDeck[index] and resets
// the card back to its front (shape-only) face.
// ------------------------------------------------------------
function showCard(index) {
  currentIndex = index;
  revealStage = 0;
  const data = activeDeck[currentIndex];

  // If the card was still flipped (showing the back face) from
  // before, snap it back to the front INSTANTLY instead of letting
  // it animate. Without this, the back face stays visible for the
  // first half of that animated flip -- and we're about to swap in
  // the new card's name below, so you'd catch a glimpse of the next
  // answer before its shape has even appeared. The "no-flip-transition"
  // class briefly turns off the flip animation, we make the change,
  // then a forced reflow (reading offsetHeight) makes the browser
  // apply it before we turn the animation back on -- so future flips
  // (when you click the new card yourself) still animate normally.
  flashcardBtn.classList.add('no-flip-transition');
  flashcardBtn.classList.remove('is-flipped');
  void flashcardInner.offsetHeight;
  flashcardBtn.classList.remove('no-flip-transition');

  // Draw the state/UT shape. Each shape has its own little
  // viewBox size so it always fills the card nicely, whether
  // it's a huge state like Rajasthan or a tiny one like Goa.
  shapeSvg.setAttribute('viewBox', `0 0 ${data.width} ${data.height}`);
  shapePath.setAttribute('d', data.path);

  // Fill in the name (it's hidden until the card flips), but
  // not the capital yet -- that waits for renderReveal().
  cardType.textContent = data.type === 'state' ? 'State' : 'Union Territory';
  cardName.textContent = data.name;

  renderReveal();

  // A new card means any old hint should disappear too.
  hintBox.classList.add('hidden');

  // Update the "3 / 36" style counter.
  deckCounter.textContent = `${currentIndex + 1} / ${activeDeck.length}`;
}


// ------------------------------------------------------------
// SHOW THE RIGHT AMOUNT OF INFORMATION FOR THE CURRENT STAGE
// Stage 0: front face (just the shape).
// Stage 1: back face, name visible, capital hidden -- a chance
//          to guess the capital before checking it.
// Stage 2: back face, capital revealed. This is when the card
//          counts as "seen" for the progress bar.
// ------------------------------------------------------------
function renderReveal() {
  const data = activeDeck[currentIndex];

  if (revealStage === 0) {
    flashcardBtn.classList.remove('is-flipped');
    return;
  }

  flashcardBtn.classList.add('is-flipped');

  if (revealStage === 1) {
    cardCapital.textContent = 'click again';
    cardCapital.classList.add('capital-hidden');
    backHint.textContent = 'Click again for the capital';
  } else {
    cardCapital.textContent = data.capital;
    cardCapital.classList.remove('capital-hidden');
    backHint.textContent = 'Click to flip back';
    seenNames.add(data.name);
    updateProgress();
  }
}


// ------------------------------------------------------------
// HANDLE A CLICK ON THE FLASHCARD
// Moves to the next reveal stage (0 -> 1 -> 2 -> 0 -> ...).
// ------------------------------------------------------------
function handleCardClick() {
  revealStage = (revealStage + 1) % 3;
  renderReveal();
}


// ------------------------------------------------------------
// SHOW OR HIDE THE HINT FACT
// The Hint button and the hint box both live inside #flashcard, so
// a click on either of them would normally "bubble up" and also
// trigger handleCardClick (flipping the card) -- stopPropagation()
// on each handler stops that from happening.
// ------------------------------------------------------------
function toggleHint(event) {
  event.stopPropagation();
  const data = activeDeck[currentIndex];

  if (hintBox.classList.contains('hidden')) {
    hintFact.textContent = data.fact;
    hintBox.classList.remove('hidden');
  } else {
    hideHint(event);
  }
}

function toggleCricketHint(event) {
  event.stopPropagation();
  const data = activeDeck[currentIndex];

  if (hintBox.classList.contains('hidden')) {
    hintFact.textContent = data.cricketFact;
    hintBox.classList.remove('hidden');
  } else {
    hideHint(event);
  }
}

function hideHint(event) {
  event.stopPropagation();
  hintBox.classList.add('hidden');
}


// ------------------------------------------------------------
// UPDATE THE PROGRESS BAR
// ------------------------------------------------------------
function updateProgress() {
  progressCount.textContent = seenNames.size;
  const percent = (seenNames.size / activeDeck.length) * 100;
  progressFill.style.width = `${percent}%`;
}


// ------------------------------------------------------------
// MOVE THROUGH THE DECK
// The "% activeDeck.length" trick makes the deck wrap around:
// after the last card it loops back to the first one (and back
// from the first to the last when going backwards).
// ------------------------------------------------------------
function nextCard() {
  showCard((currentIndex + 1) % activeDeck.length);
}

function prevCard() {
  showCard((currentIndex - 1 + activeDeck.length) % activeDeck.length);
}


// ------------------------------------------------------------
// SWITCH DECKS (All States <-> Seven Sisters)
// Switching decks starts you over at card 1 with a fresh
// progress bar, since it's really a different practice set.
// We take a ".slice()" copy of the source deck so this deck's
// own order can be shuffled later without changing the original.
// ------------------------------------------------------------
function setDeck(sourceDeck, activeBtn, otherBtn) {
  activeDeck = sourceDeck.slice();
  seenNames.clear();
  progressTotal.textContent = activeDeck.length;
  activeBtn.classList.add('active');
  otherBtn.classList.remove('active');
  updateProgress();
  showCard(0);
}


// ------------------------------------------------------------
// SHUFFLE THE CURRENT DECK
// Mixes up the order of the cards you're currently practicing
// (Fisher-Yates shuffle: walk backwards through the deck, and
// for each spot, swap in a random card from everything before
// it). Progress is NOT reset, since shuffling just changes the
// order you see cards in -- it doesn't undo what you've learned.
// ------------------------------------------------------------
function shuffleDeck() {
  for (let i = activeDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeDeck[i], activeDeck[j]] = [activeDeck[j], activeDeck[i]];
  }
  showCard(0);
}


// ------------------------------------------------------------
// EVENT LISTENERS
// ------------------------------------------------------------
flashcardBtn.addEventListener('click', handleCardClick);
hintBtn.addEventListener('click', toggleHint);
cricketHintBtn.addEventListener('click', toggleCricketHint);
hintBox.addEventListener('click', hideHint);
prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);

modeAllBtn.addEventListener('click', () => setDeck(ALL_DECK, modeAllBtn, modeSevenBtn));
modeSevenBtn.addEventListener('click', () => setDeck(SEVEN_SISTERS_DECK, modeSevenBtn, modeAllBtn));
shuffleBtn.addEventListener('click', shuffleDeck);

// Let keyboard arrow keys move through the deck too. If a real
// <button> (Hint, Previous, Next, the mode buttons) already has
// the keyboard focus, let it handle Space/Enter itself instead of
// also flipping the card.
document.addEventListener('keydown', (event) => {
  if (event.target.tagName === 'BUTTON') return;
  if (event.key === 'ArrowRight') nextCard();
  if (event.key === 'ArrowLeft') prevCard();
  if (event.key === ' ' || event.key === 'Enter') handleCardClick();
});


// ------------------------------------------------------------
// START THE GAME (shuffle first so the order is different each time)
// ------------------------------------------------------------
progressTotal.textContent = activeDeck.length;
updateProgress();
shuffleDeck();
