// ===================================================
// AXOLOTL CAVE MAZE - game.js
// This file controls everything the game DOES.
// Read the comments to understand how it all works!
// ===================================================


// ---------------------
// GAME SETTINGS
// You can change these to make the game different!
// ---------------------
var GRID_SIZE = 10;    // How many cells wide and tall the maze is (10x10)
var CELL_SIZE = 54;    // How big each cell is when drawing the axolotl (pixels)


// ---------------------
// AXOLOTL DESIGNS
// Each axolotl has a different color scheme.
// Try changing the color values to make new designs!
// ---------------------
var AXOLOTLS = [
    {
        name:   'Pinky',
        body:   '#FF9ECA',   // Main body color
        gills:  '#E0579A',   // Feathery gills
        belly:  '#FFD6EC',   // Lighter belly
        spot:   '#F07AB8',   // Spot marking
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
// These keep track of what is happening right now
// ---------------------
var maze            = [];     // The 10x10 grid
var playerRow       = 1;      // Player's current row
var playerCol       = 1;      // Player's current column
var selectedAxolotl = 0;      // Which axolotl was chosen (0, 1, or 2)
var hasWon          = false;   // True when player reaches the exit
var playerMoveCount = 0;       // Total number of moves the player made
var shortestPath    = [];      // The optimal path computed after winning


// ===================================================
// SECTION 1: MAZE GENERATION
// Creates a new random maze using depth-first search
// ===================================================

function generateMaze() {

    // Step 1: Fill the whole grid with walls
    maze = [];
    for (var row = 0; row < GRID_SIZE; row++) {
        maze[row] = [];
        for (var col = 0; col < GRID_SIZE; col++) {
            maze[row][col] = 'wall';
        }
    }

    // Step 2: Carve open paths using recursive DFS
    //
    // "Rooms" are at odd positions (1, 3, 5, 7, 9) in both row and column.
    // We carve 2 cells at a time, opening the wall between two rooms.
    var visited = {};

    function carve(row, col) {
        maze[row][col] = 'path';
        visited[row + ',' + col] = true;

        // Four possible directions (2 steps each)
        var directions = [[-2, 0], [2, 0], [0, -2], [0, 2]];

        // Shuffle for randomness (Fisher-Yates shuffle)
        for (var i = directions.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var temp      = directions[i];
            directions[i] = directions[j];
            directions[j] = temp;
        }

        for (var d = 0; d < directions.length; d++) {
            var dr      = directions[d][0];
            var dc      = directions[d][1];
            var nextRow = row + dr;
            var nextCol = col + dc;

            var inBounds = (nextRow >= 1 && nextRow <= 9 &&
                            nextCol >= 1 && nextCol <= 9);

            if (inBounds && !visited[nextRow + ',' + nextCol]) {
                // Open the wall between current room and next room
                maze[row + dr / 2][col + dc / 2] = 'path';
                carve(nextRow, nextCol);
            }
        }
    }

    carve(1, 1);

    // Step 3: Add extra openings to create multiple possible routes.
    //
    // The DFS above makes a "perfect maze" with exactly one path between
    // any two cells — like a tree, no loops. That means there is only ever
    // ONE solution. To make the maze richer, we knock down some of the
    // remaining walls that sit between two already-open cells. This creates
    // shortcuts and dead-end bypasses, so there are many ways to reach the exit.
    addExtraPassages(0.35);   // 0.35 = remove about 35% of eligible walls
                              // Try increasing this (e.g. 0.6) for a very open maze,
                              // or decreasing it (e.g. 0.15) for fewer alternatives.

    // Step 4: Mark start and exit
    maze[1][1] = 'start';
    maze[9][9] = 'end';
}


// ---------------------
// addExtraPassages
// Called after the DFS carve to open up extra connections.
//
// It finds every wall cell that has open cells on BOTH sides
// (either left+right, or up+down). These are walls that, if
// removed, would join two separate corridors and create a loop.
// We shuffle those candidates randomly and remove a percentage of them.
// ---------------------
function addExtraPassages(percentage) {
    var candidates = [];

    // Scan every interior cell (skip the outer border which must stay solid)
    for (var row = 1; row < GRID_SIZE - 1; row++) {
        for (var col = 1; col < GRID_SIZE - 1; col++) {

            // Only look at wall cells
            if (maze[row][col] !== 'wall') continue;

            var openLeft  = maze[row][col - 1] !== 'wall';
            var openRight = maze[row][col + 1] !== 'wall';
            var openUp    = maze[row - 1][col] !== 'wall';
            var openDown  = maze[row + 1][col] !== 'wall';

            // A wall that has open cells on BOTH horizontal sides
            // or BOTH vertical sides connects two corridors if removed.
            if ((openLeft && openRight) || (openUp && openDown)) {
                candidates.push({ row: row, col: col });
            }
        }
    }

    // Shuffle the candidates so we pick randomly (Fisher-Yates shuffle)
    for (var i = candidates.length - 1; i > 0; i--) {
        var j    = Math.floor(Math.random() * (i + 1));
        var temp = candidates[i];
        candidates[i] = candidates[j];
        candidates[j] = temp;
    }

    // Remove the first (percentage * total) candidates
    var numToRemove = Math.floor(candidates.length * percentage);
    for (var k = 0; k < numToRemove; k++) {
        maze[candidates[k].row][candidates[k].col] = 'path';
    }
}


// ===================================================
// SECTION 2: DRAWING THE AXOLOTL
// Draws a cute pixel-art style axolotl on a canvas
// ===================================================

function drawAxolotl(canvas, axolotlIndex, size) {
    var ctx = canvas.getContext('2d');
    var a   = AXOLOTLS[axolotlIndex];

    ctx.clearRect(0, 0, size, size);

    // Scale factor: measurements are based on a 60px canvas
    var s = size / 60;

    // ---- Feathery gills (3 tall oval shapes on top) ----
    ctx.fillStyle = a.gills;

    ctx.save();
    ctx.translate(14 * s, 17 * s);
    ctx.rotate(-0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(22 * s, 12 * s);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(30 * s, 17 * s);
    ctx.rotate(0.25);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- Body ----
    ctx.fillStyle = a.body;
    ctx.beginPath();
    ctx.ellipse(22 * s, 37 * s, 15 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Head ----
    ctx.fillStyle = a.body;
    ctx.beginPath();
    ctx.ellipse(22 * s, 26 * s, 12 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Belly ----
    ctx.fillStyle = a.belly;
    ctx.beginPath();
    ctx.ellipse(22 * s, 28 * s, 7 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Tail ----
    ctx.fillStyle = a.body;
    ctx.save();
    ctx.translate(35 * s, 40 * s);
    ctx.rotate(0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, 9 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- Legs (four stubby ovals) ----
    ctx.fillStyle = a.body;

    ctx.save();
    ctx.translate(11 * s, 37 * s);
    ctx.rotate(-0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(33 * s, 37 * s);
    ctx.rotate(0.3);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3.5 * s, 5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(13 * s, 45 * s);
    ctx.rotate(-0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(31 * s, 45 * s);
    ctx.rotate(0.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, 3 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // ---- Eyes ----
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(16.5 * s, 22.5 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(27.5 * s, 22.5 * s, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = a.eyes;
    ctx.beginPath();
    ctx.arc(17 * s, 23 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28 * s, 23 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(17.8 * s, 22 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28.8 * s, 22 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // ---- Smile ----
    ctx.strokeStyle = a.eyes;
    ctx.lineWidth   = 1.5 * s;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.arc(22 * s, 29 * s, 4 * s, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // ---- Body spot ----
    ctx.fillStyle   = a.spot;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(27 * s, 32 * s, 3 * s, 2.5 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
}


// ===================================================
// SECTION 3: RENDERING THE MAZE
// Builds the visual grid in the browser
// ===================================================

// renderMaze draws the maze into #maze-grid.
//
// overlayMap (optional): an object where keys are "row,col" strings
// and values are CSS data-overlay values ('optimal') or
// data-viz values ('frontier', 'visited', 'current', 'path').
// useVizOverlay (optional): if true, the overlay values are put into
// data-viz; otherwise data-overlay is used.
//
function renderMaze(overlayMap, useVizOverlay, showPlayer) {
    overlayMap   = overlayMap   || {};
    useVizOverlay = !!useVizOverlay;
    showPlayer   = (showPlayer === undefined) ? true : showPlayer;

    var grid = document.getElementById('maze-grid');
    grid.innerHTML = '';

    for (var row = 0; row < GRID_SIZE; row++) {
        for (var col = 0; col < GRID_SIZE; col++) {
            var cell = document.createElement('div');
            var key  = row + ',' + col;

            cell.className = 'cell';

            // Is the player standing here? (only during active play)
            if (showPlayer && row === playerRow && col === playerCol) {
                cell.className += ' player-cell';
                var canvas    = document.createElement('canvas');
                canvas.width  = CELL_SIZE;
                canvas.height = CELL_SIZE;
                drawAxolotl(canvas, selectedAxolotl, CELL_SIZE);
                cell.appendChild(canvas);

            } else {
                // Show the tile type
                cell.className += ' ' + maze[row][col];

                // Apply any overlay for win-screen path or viz highlighting
                if (overlayMap[key]) {
                    if (useVizOverlay) {
                        cell.dataset.viz = overlayMap[key];
                    } else {
                        cell.dataset.overlay = overlayMap[key];
                    }
                }

                // EXIT label on the end cell
                if (maze[row][col] === 'end') {
                    var label       = document.createElement('span');
                    label.className = 'exit-text';
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
// Moves the axolotl when arrow keys or buttons are pressed
// ===================================================

// Called by keyboard listener AND on-screen arrow buttons
function movePlayer(rowChange, colChange) {
    if (hasWon) return;

    var newRow = playerRow + rowChange;
    var newCol = playerCol + colChange;

    var inBounds = (newRow >= 0 && newRow < GRID_SIZE &&
                    newCol >= 0 && newCol < GRID_SIZE);

    if (inBounds && maze[newRow][newCol] !== 'wall') {
        playerRow = newRow;
        playerCol = newCol;
        playerMoveCount++;

        // Update the move counter display
        document.getElementById('move-counter').textContent =
            'Moves: ' + playerMoveCount;

        // Did the player reach the exit?
        if (maze[playerRow][playerCol] === 'end') {
            hasWon = true;
            renderMaze({}, false, true);
            // Wait a moment then show the win screen
            setTimeout(onPlayerWin, 400);
            return;
        }

        renderMaze({}, false, true);
    }
}

// Keyboard listener
document.addEventListener('keydown', function(event) {
    if (event.key === 'ArrowUp')    { movePlayer(-1,  0); event.preventDefault(); }
    if (event.key === 'ArrowDown')  { movePlayer( 1,  0); event.preventDefault(); }
    if (event.key === 'ArrowLeft')  { movePlayer( 0, -1); event.preventDefault(); }
    if (event.key === 'ArrowRight') { movePlayer( 0,  1); event.preventDefault(); }
});


// ===================================================
// SECTION 5: WIN HANDLING AND PATH COMPARISON
// After winning, computes the optimal path and shows
// the comparison on screen.
// ===================================================

// Compute the shortest path from (1,1) to (9,9) using BFS.
// Returns an array of {row, col} objects, or [] if no path found.
function computeShortestPath() {

    // BFS: explore cells level by level from the start
    var queue   = [{ row: 1, col: 1, path: [{ row: 1, col: 1 }] }];
    var visited = {};
    visited['1,1'] = true;

    while (queue.length > 0) {
        var current = queue.shift();  // Take from the front of the queue

        // Is this the exit?
        if (current.row === 9 && current.col === 9) {
            return current.path;
        }

        // Try all four neighbors
        var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (var d = 0; d < dirs.length; d++) {
            var nr  = current.row + dirs[d][0];
            var nc  = current.col + dirs[d][1];
            var key = nr + ',' + nc;

            var inBounds = (nr >= 0 && nr < GRID_SIZE &&
                            nc >= 0 && nc < GRID_SIZE);

            if (inBounds && maze[nr][nc] !== 'wall' && !visited[key]) {
                visited[key] = true;
                queue.push({
                    row:  nr,
                    col:  nc,
                    path: current.path.concat([{ row: nr, col: nc }])
                });
            }
        }
    }

    return [];  // No path found (shouldn't happen in our maze)
}

// Called when the player reaches the exit.
// Computes the optimal path, shows it on the maze, and displays the win panel.
function onPlayerWin() {

    // Compute the shortest possible path
    shortestPath = computeShortestPath();
    var optimalSteps = shortestPath.length - 1;

    // Build an overlay map: every cell on the optimal path gets the 'optimal' class
    var overlayMap = {};
    for (var i = 0; i < shortestPath.length; i++) {
        var key       = shortestPath[i].row + ',' + shortestPath[i].col;
        overlayMap[key] = 'optimal';
    }

    // Re-render the maze WITHOUT the player, but WITH the gold path
    renderMaze(overlayMap, false, false);

    // Fill in the stats
    document.getElementById('stat-player-moves').textContent = playerMoveCount;
    document.getElementById('stat-optimal-moves').textContent = optimalSteps;

    // Calculate efficiency and write a rating message
    var extra  = playerMoveCount - optimalSteps;
    var rating = '';
    if (extra === 0) {
        rating = 'Perfect! You took the exact shortest route — just like a computer!';
    } else if (extra <= 3) {
        rating = 'Almost perfect! Only ' + extra + ' extra step' + (extra > 1 ? 's' : '') +
                 ' more than the shortest route. Great exploring!';
    } else if (extra <= 10) {
        rating = 'Nice work! You took ' + extra + ' extra steps. ' +
                 'The gold path shows the shortest route.';
    } else {
        rating = 'You made it! You took ' + extra + ' extra steps. ' +
                 'Study the gold path — can you find it faster next time?';
    }
    document.getElementById('win-rating').textContent = rating;

    // Switch to the win panel
    showPanel('win-panel');
}


// ===================================================
// SECTION 6: PANEL AND SCREEN MANAGEMENT
// Controls which panel / screen is currently visible
// ===================================================

// Show one panel and hide the others inside the game screen
function showPanel(panelId) {
    var panels = ['game-panel', 'win-panel', 'viz-panel'];
    for (var i = 0; i < panels.length; i++) {
        document.getElementById(panels[i]).style.display =
            (panels[i] === panelId) ? 'block' : 'none';
    }
}

// Show the algorithm viz panel and re-render a clean maze
function showVizPanel() {
    showPanel('viz-panel');
    // Show a clean maze (no overlay, no player) ready for the viz
    renderMaze({}, false, false);
    // Reset viz state (defined in visualizer.js)
    resetViz();
}

// Go back from viz panel to the win panel, restoring the gold path overlay
function backToWinPanel() {
    // Stop any running animation
    vizPause();
    showPanel('win-panel');

    // Rebuild the gold path overlay map and re-render
    var overlayMap = {};
    for (var i = 0; i < shortestPath.length; i++) {
        var key       = shortestPath[i].row + ',' + shortestPath[i].col;
        overlayMap[key] = 'optimal';
    }
    renderMaze(overlayMap, false, false);
}

// Go back to the axolotl selection screen
function goToSelection() {
    vizPause();
    document.getElementById('game-screen').style.display      = 'none';
    document.getElementById('selection-screen').style.display = 'block';
}


// ===================================================
// SECTION 7: GAME FLOW
// Starting, restarting, and selecting an axolotl
// ===================================================

// Start a fresh game with a new maze
function startNewGame() {
    vizPause();
    hasWon          = false;
    playerRow       = 1;
    playerCol       = 1;
    playerMoveCount = 0;
    shortestPath    = [];

    document.getElementById('move-counter').textContent = 'Moves: 0';

    generateMaze();
    renderMaze({}, false, true);
    showPanel('game-panel');
}

// Called when the player clicks an axolotl on the selection screen
function selectAxolotl(index) {
    selectedAxolotl = index;
    document.getElementById('selection-screen').style.display = 'none';
    document.getElementById('game-screen').style.display      = 'block';
    startNewGame();
}

// Draw the three axolotl preview canvases on the selection screen
function showSelectionPreviews() {
    for (var i = 0; i < AXOLOTLS.length; i++) {
        var canvas = document.getElementById('axolotl-preview-' + i);
        drawAxolotl(canvas, i, 110);
    }
}

// Stub so game.js can call vizPause() even before visualizer.js loads
// (visualizer.js will overwrite this with the real version)
function vizPause() {}


// ===================================================
// START HERE
// Runs automatically when the page first loads.
// ===================================================
showSelectionPreviews();
