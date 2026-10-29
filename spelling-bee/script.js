// ============================================================
// SPELLING BEE PRACTICE - script.js
//
// This file makes the spelling cards work. It does six jobs:
//   1. Say the word out loud (from an audio file, or the browser's voice).
//   2. Show one blank box for every letter of the word.
//   3. Check the spelling you typed.
//   4. Give hints by filling in one letter at a time.
//   5. Show the answer (by button, or after too many tries).
//   6. Move between words, switch sets, shuffle and track progress.
//
// The word lists live in words-data.js (loaded before this file).
// ============================================================


// ------------------------------------------------------------
// SETTINGS YOU CAN CHANGE
// ------------------------------------------------------------
// After this many wrong tries, the answer is shown automatically.
const MAX_TRIES = 3;

// How fast the voice speaks. 1 is normal, smaller is slower.
const SPEECH_RATE = 0.8;


// ------------------------------------------------------------
// GRAB THE HTML ELEMENTS WE NEED TO UPDATE
// ------------------------------------------------------------
const flashcard = document.getElementById('flashcard');
const speakBtn = document.getElementById('speak-btn');
const blanks = document.getElementById('blanks');
const letterCount = document.getElementById('letter-count');
const answerInput = document.getElementById('answer-input');
const message = document.getElementById('message');

const checkBtn = document.getElementById('check-btn');
const hintBtn = document.getElementById('hint-btn');
const answerBtn = document.getElementById('answer-btn');

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const deckCounter = document.getElementById('deck-counter');

const progressCount = document.getElementById('progress-count');
const progressTotal = document.getElementById('progress-total');
const progressFill = document.getElementById('progress-fill');

const modeAllBtn = document.getElementById('mode-all-btn');
const modeSet1Btn = document.getElementById('mode-set1-btn');
const modeSet2Btn = document.getElementById('mode-set2-btn');
const shuffleBtn = document.getElementById('shuffle-btn');
const modeButtons = [modeAllBtn, modeSet1Btn, modeSet2Btn];


// ------------------------------------------------------------
// GAME STATE
// ------------------------------------------------------------
// The words we are practicing right now. ".concat()" and ".slice()"
// make a new list, so shuffling never changes SET_1 or SET_2.
let activeDeck = SET_1.concat(SET_2);

// Which word (index into activeDeck) is showing right now.
let currentIndex = 0;

// How many wrong tries on the current word.
let tries = 0;

// How many letters the hints have filled in so far.
let hintLetters = 0;

// Where we are with the current word:
//   'trying'   = still guessing
//   'correct'  = spelled it right
//   'revealed' = the answer was shown
let status = 'trying';

// The words you have spelled correctly. A Set ignores duplicates,
// so spelling the same word twice only counts once.
const spelledWords = new Set();


// ------------------------------------------------------------
// SAY THE WORD OUT LOUD
// First we try to play the word's audio file from the audio
// folder (made by make-audio.sh). "Carbon dioxide" is in
// audio/carbon-dioxide.m4a. One audio player is reused for
// every word, so phones only need to allow sound once.
//
// If there is no audio file (for example, a new word you just
// added), we use the voice built into the web browser instead.
// ------------------------------------------------------------
const wordAudio = new Audio();

function speakWord() {
  const word = activeDeck[currentIndex];
  const fileName = word.toLowerCase().replaceAll(' ', '-');
  wordAudio.onerror = () => speakWithBrowser(word);
  wordAudio.src = `audio/${fileName}.m4a`;
  wordAudio.play().catch(() => {});
}


// ------------------------------------------------------------
// THE BACKUP VOICE: speechSynthesis, built into the web browser.
//
// Phones are picky about speech, so we:
//   - pick an English voice ourselves (British if the phone has
//     one), because some phones go silent if we only ask for a
//     language they don't have.
//   - only cancel when something is still being spoken. On some
//     phones, cancel() right before speak() makes the new word
//     get skipped.
// ------------------------------------------------------------
function pickVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => v.lang.replace('_', '-') === 'en-GB')
    || voices.find((v) => v.lang.startsWith('en'))
    || null;
}

function speakWithBrowser(word) {
  const speech = new SpeechSynthesisUtterance(word);
  const voice = pickVoice();
  if (voice) {
    speech.voice = voice;
    speech.lang = voice.lang;
  }
  speech.rate = SPEECH_RATE;
  if (speechSynthesis.speaking || speechSynthesis.pending) {
    speechSynthesis.cancel();
  }
  speechSynthesis.speak(speech);
}


// ------------------------------------------------------------
// SHOW A WORD
// Resets everything for activeDeck[index] and says it out loud.
// ------------------------------------------------------------
function showCard(index) {
  currentIndex = index;
  tries = 0;
  hintLetters = 0;
  status = 'trying';

  answerInput.value = '';
  answerInput.disabled = false;
  message.textContent = '';
  message.className = '';

  drawBlanks();
  updateButtons();
  deckCounter.textContent = `${currentIndex + 1} / ${activeDeck.length}`;

  const word = activeDeck[currentIndex];
  const numLetters = word.replaceAll(' ', '').length;
  letterCount.textContent = word.includes(' ')
    ? `${numLetters} letters, ${word.split(' ').length} words`
    : `${numLetters} letters`;

  answerInput.focus();
  speakWord();
}


// ------------------------------------------------------------
// DRAW THE LETTER BOXES
// Makes one box per letter. A box shows its letter when:
//   - the word is solved or the answer was shown, or
//   - a hint has reached that letter.
// Spaces become a small gap instead of a box.
// ------------------------------------------------------------
function drawBlanks() {
  const word = activeDeck[currentIndex];
  blanks.innerHTML = '';
  flashcard.classList.toggle('is-correct', status === 'correct');
  flashcard.classList.toggle('is-revealed', status === 'revealed');

  let letterNumber = 0;
  for (const char of word) {
    const box = document.createElement('span');

    if (char === ' ') {
      box.className = 'letter-gap';
    } else {
      box.className = 'letter-box';
      if (status !== 'trying') {
        box.textContent = char;
      } else if (letterNumber < hintLetters) {
        box.textContent = char;
        box.classList.add('from-hint');
      }
      letterNumber++;
    }

    blanks.appendChild(box);
  }
}


// ------------------------------------------------------------
// TURN BUTTONS ON OR OFF
// Check, Hint and Show Answer only work while still guessing.
// ------------------------------------------------------------
function updateButtons() {
  const done = status !== 'trying';
  checkBtn.disabled = done;
  hintBtn.disabled = done;
  answerBtn.disabled = done;
  answerInput.disabled = done;
}


// ------------------------------------------------------------
// CLEAN UP A SPELLING SO WE CAN COMPARE IT
// Ignores capital letters and extra spaces, so "carbon  Dioxide "
// matches "Carbon dioxide".
// ------------------------------------------------------------
function cleanUp(text) {
  return text.trim().toLowerCase().split(/\s+/).join(' ');
}


// ------------------------------------------------------------
// CHECK THE SPELLING
// ------------------------------------------------------------
function checkAnswer() {
  if (status !== 'trying') return;

  const typed = cleanUp(answerInput.value);
  if (typed === '') return;

  const word = activeDeck[currentIndex];

  if (typed === cleanUp(word)) {
    status = 'correct';
    message.textContent = 'Correct! Great job!';
    message.className = 'good';
    spelledWords.add(word);
    updateProgress();
  } else {
    tries++;
    if (tries >= MAX_TRIES) {
      showAnswer();
      return;
    }
    const triesLeft = MAX_TRIES - tries;
    message.textContent = `Not quite. Try again! (${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left)`;
    message.className = 'bad';
    answerInput.select();
    shakeCard();
  }

  drawBlanks();
  updateButtons();
}


// ------------------------------------------------------------
// WIGGLE THE CARD WHEN THE SPELLING IS WRONG
// We remove the class, force the browser to notice (reading
// offsetWidth), then add it back so the animation plays again.
// ------------------------------------------------------------
function shakeCard() {
  flashcard.classList.remove('shake');
  void flashcard.offsetWidth;
  flashcard.classList.add('shake');
}


// ------------------------------------------------------------
// HINT: fill in the next letter
// ------------------------------------------------------------
function giveHint() {
  if (status !== 'trying') return;

  const word = activeDeck[currentIndex];
  const numLetters = word.replaceAll(' ', '').length;

  hintLetters++;
  if (hintLetters >= numLetters) {
    showAnswer();
    return;
  }

  drawBlanks();
  answerInput.focus();
}


// ------------------------------------------------------------
// SHOW THE ANSWER
// ------------------------------------------------------------
function showAnswer() {
  status = 'revealed';
  message.textContent = `The answer is: ${activeDeck[currentIndex]}`;
  message.className = 'bad';
  drawBlanks();
  updateButtons();
  speakWord();
}


// ------------------------------------------------------------
// UPDATE THE PROGRESS BAR
// Only counts words from the set you are practicing now.
// ------------------------------------------------------------
function updateProgress() {
  const count = activeDeck.filter((word) => spelledWords.has(word)).length;
  progressCount.textContent = count;
  progressTotal.textContent = activeDeck.length;
  progressFill.style.width = `${(count / activeDeck.length) * 100}%`;
}


// ------------------------------------------------------------
// MOVE THROUGH THE WORDS
// The "%" trick wraps around from the last word to the first.
// ------------------------------------------------------------
function nextCard() {
  showCard((currentIndex + 1) % activeDeck.length);
}

function prevCard() {
  showCard((currentIndex - 1 + activeDeck.length) % activeDeck.length);
}


// ------------------------------------------------------------
// SHUFFLE THE CURRENT SET
// Fisher-Yates shuffle: walk backwards through the list, and
// swap each spot with a random word from before it.
// ------------------------------------------------------------
function shuffleDeck() {
  for (let i = activeDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [activeDeck[i], activeDeck[j]] = [activeDeck[j], activeDeck[i]];
  }
  showCard(0);
}


// ------------------------------------------------------------
// SWITCH SETS (All, Set 1, Set 2)
// The new set starts shuffled, in random order.
// ------------------------------------------------------------
function setDeck(words, clickedBtn) {
  activeDeck = words.slice();
  for (const btn of modeButtons) {
    btn.classList.toggle('active', btn === clickedBtn);
  }
  updateProgress();
  shuffleDeck();
}


// ------------------------------------------------------------
// EVENT LISTENERS
// ------------------------------------------------------------
speakBtn.addEventListener('click', speakWord);
checkBtn.addEventListener('click', checkAnswer);
hintBtn.addEventListener('click', giveHint);
answerBtn.addEventListener('click', showAnswer);
prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);

modeAllBtn.addEventListener('click', () => setDeck(SET_1.concat(SET_2), modeAllBtn));
modeSet1Btn.addEventListener('click', () => setDeck(SET_1, modeSet1Btn));
modeSet2Btn.addEventListener('click', () => setDeck(SET_2, modeSet2Btn));
shuffleBtn.addEventListener('click', shuffleDeck);

// Press Enter to check. Once the word is done, Enter goes to the next word.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  if (event.target.tagName === 'BUTTON') return;
  if (status === 'trying') {
    checkAnswer();
  } else {
    nextCard();
  }
});


// ------------------------------------------------------------
// START THE GAME (shuffled, so the order is different each time)
// Note: some browsers won't speak until you click something on
// the page first. If you hear nothing, press "Hear the Word".
// ------------------------------------------------------------
updateProgress();
shuffleDeck();
