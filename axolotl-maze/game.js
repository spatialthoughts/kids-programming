// ===================================================
// AXOLOTL CAVE MAZE - game.js
// This file controls everything the game DOES.
// Read the comments to understand how it all works!
// ===================================================


// ---------------------
// GAME SETTINGS
// You can change these numbers to make the game different!
// ---------------------

var GRID_SIZE = 10;    // How many cells wide and tall the maze is (10x10)
var CELL_SIZE = 54;    // How big each cell is when drawing the axolotl (in pixels)


// ---------------------
// AXOLOTL DESIGNS
// Each axolotl has a different color scheme.
// Try changing the color values to make new designs!
// ---------------------
var AXOLOTLS = [
    {
        name:   'Pinky',
        body:   '#FF9ECA',   // The main body color
        gills:  '#E0579A',   // The feathery gills on top
        belly:  '#FFD6EC',   // The lighter belly
        spot:   '#F07AB8',   // Spot/marking color
        eyes:   '#3a1a2a'    // Eye color
    },
    {
        name:   'Bluebell',
        body:   '#6CBFE0',
        gills:  '#3A9EC2',
        belly:  '#BDE8F8',
        spot:   '#4AAED4',
        eyes:   '#0a2a3a'
    },
    {
        name:   'Goldie',
        body:   '#F5C96A',
        gills:  '#D4983A',
        belly:  '#FDE9B8',
        spot:   '#E8AF4A',
        eyes:   '#3a2a0a'
    }
];


// ---------------------
// GAME STATE VARIABLES
// These keep track of what is happening right now in the game
// ---------------------

var maze            = [];    // The 10x10 grid (array of arrays)
var playerRow       = 1;     // Which row the player is on (0 = top)
var playerCol       = 1;     // Which column the player is on (0 = left)
var selectedAxolotl = 0;     // Index of the chosen axolotl (0, 1, or 2)
var hasWon          = false;  // Becomes true when the player reaches the exit


// ===================================================
// SECTION 1: MAZE GENERATION
// This creates a brand new random maze every time
// ===================================================

function generateMaze() {

    // --- Step 1: Fill the whole grid with walls ---
    maze = [];
    for (var row = 0; row < GRID_SIZE; row++) {
        maze[row] = [];
        for (var col = 0; col < GRID_SIZE; col++) {
            maze[row][col] = 'wall';
        }
    }

    // --- Step 2: Use depth-first search to carve open paths ---
    //
    // The maze uses "rooms" at odd-numbered grid positions:
    //   row 1, 3, 5, 7, 9  and  col 1, 3, 5, 7, 9
    // That gives us a 5x5 grid of rooms connected by passages.
    //
    // We carve paths by moving 2 steps at a time and
    // opening up the wall cell in between.

    var visited = {};  // Keeps track of rooms we have already visited

    function carve(row, col) {
        // Mark this room cell as open path
        maze[row][col] = 'path';
        visited[row + ',' + col] = true;

        // The four possible directions to move (2 steps each)
        var directions = [
            [-2,  0],   // Up
            [ 2,  0],   // Down
            [ 0, -2],   // Left
            [ 0,  2]    // Right
        ];

        // Shuffle directions randomly so every maze is different
        // This is called a "Fisher-Yates shuffle"
        for (var i = directions.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp    = directions[i];
            directions[i] = directions[j];
            directions[j] = temp;
        }

        // Try each direction
        for (var d = 0; d < directions.length; d++) {
            var dr = directions[d][0];
            var dc = directions[d][1];

            var nextRow = row + dr;
            var nextCol = col + dc;

            // Check the neighbor is inside the grid boundaries
            var inBounds = (nextRow >= 1 && nextRow <= 9 &&
                            nextCol >= 1 && nextCol <= 9);

            // Only visit rooms we have not been to yet
            if (inBounds && !visited[nextRow + ',' + nextCol]) {

                // Open the wall cell that sits between current and next room
                var wallRow = row + (dr / 2);
                var wallCol = col + (dc / 2);
                maze[wallRow][wallCol] = 'path';

                // Recurse: visit the next room
                carve(nextRow, nextCol);
            }
        }
    }

    // Start carving from the top-left room at (1, 1)
    carve(1, 1);

    // --- Step 3: Mark the start and end cells ---
    maze[1][1] = 'start';
    maze[9][9] = 'end';
}


// ===================================================
// SECTION 2: DRAWING THE AXOLOTL
// This draws a cute pixel-art style axolotl on a canvas
// ===================================================

function drawAxolotl(canvas, axolotlIndex, size) {

    var ctx = canvas.getContext('2d');
    var a   = AXOLOTLS[axolotlIndex];  // The color data for this axolotl

    // Clear the canvas first
    ctx.clearRect(0, 0, size, size);

    // Scale factor: all measurements are based on a 60px size
    // so we multiply by s to fit any canvas size
    var s = size / 60;

    // ---- Draw the three feathery gills on top ----
    // Gills are tall oval shapes sticking up from the head

    ctx.fillStyle = a.gills;

    // Left gill (tilted slightly left)
    ctx.save();
    ctx.translate(14 * s, 17 * s);
    ctx.rotate(-0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Middle gill (straight up, tallest)
    ctx.save();
    ctx.translate(22 * s, 12 * s);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Right gill (tilted slightly right)
    ctx.save();
    ctx.translate(30 * s, 17 * s);
    ctx.rotate(0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- Draw the body ----
    // The body is a wide oval in the middle-lower area

    ctx.fillStyle = a.body;
    ctx.beginPath();
    ctx.ellipse(22 * s, 37 * s, 15 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Draw the head ----
    // The head is a rounder oval sitting on top of the body

    ctx.fillStyle = a.body;
    ctx.beginPath();
    ctx.ellipse(22 * s, 26 * s, 12 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Draw the belly (lighter color) ----

    ctx.fillStyle = a.belly;
    ctx.beginPath();
    ctx.ellipse(22 * s, 28 * s, 7 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Draw the tail ----
    // A slightly flattened oval pointing to the right

    ctx.fillStyle = a.body;
    ctx.save();
    ctx.translate(35 * s, 40 * s);
    ctx.rotate(0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- Draw the four stubby legs ----

    ctx.fillStyle = a.body;

    // Front-left leg
    ctx.save();
    ctx.translate(11 * s, 37 * s);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Front-right leg
    ctx.save();
    ctx.translate(33 * s, 37 * s);
    ctx.rotate(0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Back-left leg
    ctx.save();
    ctx.translate(13 * s, 45 * s);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Back-right leg
    ctx.save();
    ctx.translate(31 * s, 45 * s);
    ctx.rotate(0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- Draw the eyes ----

    // White of the eye
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(16.5 * s, 22.5 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(27.5 * s, 22.5 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Dark pupil
    ctx.fillStyle = a.eyes;
    ctx.beginPath();
    ctx.arc(17 * s, 23 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28 * s, 23 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Bright shine dot (makes eyes look alive)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(17.8 * s, 22 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28.8 * s, 22 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // ---- Draw the smile ----

    ctx.strokeStyle = a.eyes;
    ctx.lineWidth   = 1.5 * s;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.arc(22 * s, 29 * s, 4 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // ---- Draw a cute spot on the body ----

    ctx.fillStyle = a.spot;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(27 * s, 32 * s, 3 * s, 2.5 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;  // Reset transparency
}


// ===================================================
// SECTION 3: RENDERING THE MAZE
// This builds the visual grid on the screen
// ===================================================

function renderMaze() {

    var grid = document.getElementById('maze-grid');
    grid.innerHTML = '';  // Clear out any old cells

    // Loop through every row and column of the maze
    for (var row = 0; row < GRID_SIZE; row++) {
        for (var col = 0; col < GRID_SIZE; col++) {

            // Create a div element for this cell
            var cell = document.createElement('div');
            cell.className = 'cell';

            // --- Is the player standing on this cell? ---
            if (row === playerRow && col === playerCol) {

                // Draw the player cell with the axolotl inside
                cell.className += ' player-cell';

                var canvas = document.createElement('canvas');
                canvas.width  = CELL_SIZE;
                canvas.height = CELL_SIZE;
                drawAxolotl(canvas, selectedAxolotl, CELL_SIZE);
                cell.appendChild(canvas);

            } else {

                // Otherwise just show the tile type
                cell.className += ' ' + maze[row][col];

                // Add an "EXIT" label to the end cell
                if (maze[row][col] === 'end') {
                    var label = document.createElement('span');
                    label.className   = 'exit-text';
                    label.textContent = 'EXIT';
                    cell.appendChild(label);
                }
            }

            grid.appendChild(cell);
        }
    }
}


// ===================================================
// SECTION 4: PLAYER MOVEMENT
// This moves the axolotl when keys are pressed
// ===================================================

// This function is also called by the on-screen arrow buttons in index.html
function movePlayer(rowChange, colChange) {

    if (hasWon) return;  // Do nothing if the game is already won

    var newRow = playerRow + rowChange;
    var newCol = playerCol + colChange;

    // Check the new position is inside the 10x10 grid
    var inBounds = (newRow >= 0 && newRow < GRID_SIZE &&
                    newCol >= 0 && newCol < GRID_SIZE);

    // Only move if the destination is not a wall
    if (inBounds && maze[newRow][newCol] !== 'wall') {

        playerRow = newRow;
        playerCol = newCol;

        // Did the player reach the exit?
        if (maze[playerRow][playerCol] === 'end') {
            hasWon = true;
            renderMaze();

            // Show the win message after a short pause
            setTimeout(function() {
                document.getElementById('win-message').style.display = 'block';
            }, 150);
            return;
        }

        renderMaze();
    }
}

// Listen for arrow key presses on the keyboard
document.addEventListener('keydown', function(event) {

    // Map each arrow key to a row and column change
    if (event.key === 'ArrowUp')    { movePlayer(-1,  0); event.preventDefault(); }
    if (event.key === 'ArrowDown')  { movePlayer( 1,  0); event.preventDefault(); }
    if (event.key === 'ArrowLeft')  { movePlayer( 0, -1); event.preventDefault(); }
    if (event.key === 'ArrowRight') { movePlayer( 0,  1); event.preventDefault(); }
});


// ===================================================
// SECTION 5: GAME FLOW FUNCTIONS
// These control starting, restarting, and switching screens
// ===================================================

// Start a fresh new game (new maze, player back at start)
function startNewGame() {
    hasWon     = false;
    playerRow  = 1;
    playerCol  = 1;

    // Hide the win message
    document.getElementById('win-message').style.display = 'none';

    // Build a brand new random maze
    generateMaze();

    // Draw it on screen
    renderMaze();
}

// Go back to the axolotl selection screen
function goToSelection() {
    document.getElementById('game-screen').style.display      = 'none';
    document.getElementById('selection-screen').style.display = 'block';
}

// Called when the player clicks an axolotl on the selection screen
function selectAxolotl(index) {
    selectedAxolotl = index;

    // Switch from selection screen to game screen
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('game-screen').style.display      = 'block';

    // Start the game!
    startNewGame();
}

// Draw all three axolotl previews on the selection screen
function showSelectionPreviews() {
    for (var i = 0; i < AXOLOTLS.length; i++) {
        var canvas = document.getElementById('axolotl-preview-' + i);
        drawAxolotl(canvas, i, 110);
    }
}


// ===================================================
// START HERE
// This runs automatically when the page loads.
// It draws the axolotl choices on the selection screen.
// ===================================================
showSelectionPreviews();
