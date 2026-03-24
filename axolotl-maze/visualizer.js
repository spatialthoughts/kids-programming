// ===================================================
// AXOLOTL CAVE MAZE - visualizer.js
// This file runs the algorithm demonstration.
//
// It shows BFS, DFS, and A* solving the maze one
// step at a time, with explanations at each step.
//
// HOW IT WORKS:
// 1. When you pick an algorithm, we run it on the
//    current maze and record every step as a "frame".
// 2. We then play through the frames one by one,
//    painting the maze to match each frame.
// 3. Each frame remembers:
//    - which cell is being checked RIGHT NOW
//    - which cells are in the queue/stack (frontier)
//    - which cells have already been checked (visited)
//    - a message explaining what is happening
// ===================================================


// ---------------------
// ALGORITHM DESCRIPTIONS
// Shown in the info box when each tab is clicked
// ---------------------
var ALGO_INFO = {
    bfs: {
        name: 'Breadth-First Search (BFS)',
        desc: 'BFS explores cells in rings spreading outward from the start — ' +
              'like ripples on water. It checks ALL neighbors at distance 1, ' +
              'then ALL at distance 2, and so on. ' +
              'This guarantees it always finds the SHORTEST path!'
    },
    dfs: {
        name: 'Depth-First Search (DFS)',
        desc: 'DFS picks one direction and dives in as DEEP as possible before ' +
              'turning back. It is like following one path all the way to a dead end, ' +
              'then backtracking. It is simple to code but may NOT find the shortest path!'
    },
    astar: {
        name: 'A* (A-Star) Search',
        desc: 'A* is like BFS but SMARTER — it uses the straight-line distance ' +
              'to the exit as a hint (called a heuristic). It always explores the ' +
              'cell that looks most promising first. This finds the shortest path ' +
              'while checking FEWER cells than BFS!'
    }
};


// ---------------------
// VISUALIZER STATE
// These variables keep track of the animation
// ---------------------
var vizFrames        = [];      // Array of all pre-computed frames
var vizCurrentFrame  = 0;       // Which frame we are currently showing
var vizTimer         = null;    // Holds the timer for auto-play
var vizIsPlaying     = false;   // Is the animation currently running?
var vizAlgorithm     = '';      // 'bfs', 'dfs', or 'astar'


// ===================================================
// SECTION 1: FRAME GENERATION
// Each function runs an algorithm and records
// every step as a frame object.
//
// A frame contains:
//   current  - the cell being processed {row, col}
//   visited  - array of cells fully explored [{row,col}]
//   frontier - array of cells in queue/stack [{row,col}]
//   message  - explanation text for this step (string)
//   isDone   - true on the last frame
//   finalPath - [{row,col}] of path found (only when isDone)
// ===================================================


// ---------------------
// BFS Frame Generator
// Uses a QUEUE: cells are added to the back and
// removed from the front (first in, first out).
// This guarantees every cell at distance N is
// checked before any cell at distance N+1.
// ---------------------
function generateBFSFrames(mazeGrid) {
    var frames = [];

    // The queue holds items with: position + full path taken to get here
    var queue = [{
        row:  1,
        col:  1,
        path: [{ row: 1, col: 1 }]
    }];

    // Track which cells we have already added to the queue
    var inQueue = {};
    inQueue['1,1'] = true;

    // Track which cells we have fully processed
    var visited = {};

    // First frame: show the starting cell in the frontier
    frames.push({
        current:   { row: 1, col: 1 },
        visited:   [],
        frontier:  [{ row: 1, col: 1 }],
        isDone:    false,
        finalPath: null,
        message:   'Starting at the entrance!\n' +
                   'BFS puts it in the queue. The queue works like a line at a shop:\n' +
                   'the first one in is the first one checked (FIFO).'
    });

    while (queue.length > 0) {

        // Remove from the FRONT of the queue (this is what makes it BFS)
        var current = queue.shift();
        var key     = current.row + ',' + current.col;

        visited[key] = true;

        // Build current snapshot lists
        var visitedList  = keysToList(visited);
        var frontierList = queue.map(function(q) { return { row: q.row, col: q.col }; });

        // Did we reach the exit?
        if (current.row === 9 && current.col === 9) {
            frames.push({
                current:   { row: 9, col: 9 },
                visited:   visitedList,
                frontier:  frontierList,
                isDone:    true,
                finalPath: current.path,
                message:   'Found the exit!\n' +
                           'BFS explored ' + visitedList.length + ' cells in total.\n' +
                           'The shortest path is ' + (current.path.length - 1) + ' steps long.\n' +
                           'Because BFS checks level by level, this is GUARANTEED to be the shortest path!'
            });
            return frames;
        }

        // Find unvisited, accessible neighbors
        var dirs         = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        var newNeighbors = [];

        for (var d = 0; d < dirs.length; d++) {
            var nr   = current.row + dirs[d][0];
            var nc   = current.col + dirs[d][1];
            var nkey = nr + ',' + nc;

            if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 &&
                mazeGrid[nr][nc] !== 'wall' &&
                !inQueue[nkey] && !visited[nkey]) {

                inQueue[nkey] = true;
                newNeighbors.push({ row: nr, col: nc });

                // Add to the BACK of the queue with the path taken so far
                queue.push({
                    row:  nr,
                    col:  nc,
                    path: current.path.concat([{ row: nr, col: nc }])
                });
            }
        }

        // Build the message for this step
        var msg = 'Dequeuing cell at (' + current.row + ', ' + current.col + '). Not the exit yet.\n';
        if (newNeighbors.length === 0) {
            msg += 'No new neighbors to add (already in queue or walls).\n';
        } else {
            msg += 'Adding ' + newNeighbors.length +
                   ' new neighbor' + (newNeighbors.length > 1 ? 's' : '') +
                   ' to the BACK of the queue.\n';
        }
        msg += 'Queue now has ' + queue.length +
               ' cell' + (queue.length !== 1 ? 's' : '') + ' waiting.';

        frames.push({
            current:   { row: current.row, col: current.col },
            visited:   keysToList(visited),
            frontier:  queue.map(function(q) { return { row: q.row, col: q.col }; }),
            isDone:    false,
            finalPath: null,
            message:   msg
        });
    }

    // Fallback: no path found (should not happen in our generated maze)
    frames.push({
        current:   null,
        visited:   keysToList(visited),
        frontier:  [],
        isDone:    true,
        finalPath: [],
        message:   'No path found. The maze has no solution!'
    });
    return frames;
}


// ---------------------
// DFS Frame Generator
// Uses a STACK: cells are added to and removed
// from the top (last in, first out).
// This makes it dive deep along one path before
// backtracking — like following one tunnel to its end.
// ---------------------
function generateDFSFrames(mazeGrid) {
    var frames = [];

    // The stack holds items with: position + path taken to get here
    var stack = [{
        row:  1,
        col:  1,
        path: [{ row: 1, col: 1 }]
    }];

    var visited = {};

    frames.push({
        current:   { row: 1, col: 1 },
        visited:   [],
        frontier:  [{ row: 1, col: 1 }],
        isDone:    false,
        finalPath: null,
        message:   'Starting at the entrance!\n' +
                   'DFS pushes it onto the stack. The stack works like a pile of plates:\n' +
                   'the last one added is the first one checked (LIFO).'
    });

    while (stack.length > 0) {

        // Remove from the TOP of the stack (this is what makes it DFS)
        var current = stack.pop();
        var key     = current.row + ',' + current.col;

        // Skip cells we have already visited (DFS can add duplicates to the stack)
        if (visited[key]) continue;
        visited[key] = true;

        var visitedList  = keysToList(visited);

        // Only show unvisited items as the visible frontier
        var frontierList = stack.filter(function(s) {
            return !visited[s.row + ',' + s.col];
        }).map(function(s) {
            return { row: s.row, col: s.col };
        });

        // Did we reach the exit?
        if (current.row === 9 && current.col === 9) {
            frames.push({
                current:   { row: 9, col: 9 },
                visited:   visitedList,
                frontier:  frontierList,
                isDone:    true,
                finalPath: current.path,
                message:   'Found the exit!\n' +
                           'DFS explored ' + visitedList.length + ' cells in total.\n' +
                           'This path is ' + (current.path.length - 1) + ' steps.\n' +
                           'Notice: DFS does NOT guarantee the shortest path — it just finds A path!'
            });
            return frames;
        }

        // Push unvisited neighbors onto the TOP of the stack
        // (we push in reverse direction order so the "natural" order goes first)
        var dirs         = [[1, 0], [0, 1], [0, -1], [-1, 0]];
        var newNeighbors = [];

        for (var d = 0; d < dirs.length; d++) {
            var nr   = current.row + dirs[d][0];
            var nc   = current.col + dirs[d][1];
            var nkey = nr + ',' + nc;

            if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 &&
                mazeGrid[nr][nc] !== 'wall' && !visited[nkey]) {

                newNeighbors.push({ row: nr, col: nc });
                stack.push({
                    row:  nr,
                    col:  nc,
                    path: current.path.concat([{ row: nr, col: nc }])
                });
            }
        }

        var msg = 'Popping cell (' + current.row + ', ' + current.col + ') from the top of the stack.\n';
        if (newNeighbors.length === 0) {
            msg += 'Dead end! No unvisited neighbors.\n' +
                   'Backtracking — popping the next cell from the stack.';
        } else {
            msg += 'Pushing ' + newNeighbors.length +
                   ' neighbor' + (newNeighbors.length > 1 ? 's' : '') +
                   ' onto the TOP of the stack.\n' +
                   'Diving deeper into the cave!';
        }

        // Recompute frontier after pushing
        var frontierAfter = stack.filter(function(s) {
            return !visited[s.row + ',' + s.col];
        }).map(function(s) {
            return { row: s.row, col: s.col };
        });

        frames.push({
            current:   { row: current.row, col: current.col },
            visited:   keysToList(visited),
            frontier:  frontierAfter,
            isDone:    false,
            finalPath: null,
            message:   msg
        });
    }

    frames.push({
        current:   null,
        visited:   keysToList(visited),
        frontier:  [],
        isDone:    true,
        finalPath: [],
        message:   'No path found!'
    });
    return frames;
}


// ---------------------
// A* Frame Generator
// Uses a PRIORITY QUEUE ordered by f = g + h.
//   g = actual steps taken from the start
//   h = estimated steps remaining (Manhattan distance to exit)
//   f = g + h = total estimated cost
// A* always picks the cell with the LOWEST f score next.
// Because it uses the heuristic (h), it avoids exploring
// cells that are far from the goal — much smarter than BFS!
// ---------------------
function generateAStarFrames(mazeGrid) {
    var frames = [];

    // Manhattan distance: straight-line steps to the exit at (9,9)
    function h(row, col) {
        return Math.abs(row - 9) + Math.abs(col - 9);
    }

    // The open set: all cells discovered but not yet fully processed
    var openSet = [{
        row:  1,
        col:  1,
        g:    0,
        h:    h(1, 1),
        f:    h(1, 1),
        path: [{ row: 1, col: 1 }]
    }];

    var visited = {};

    frames.push({
        current:   { row: 1, col: 1 },
        visited:   [],
        frontier:  [{ row: 1, col: 1 }],
        isDone:    false,
        finalPath: null,
        message:   'Starting at the entrance!\n' +
                   'h (Manhattan distance to exit) = ' + h(1, 1) + ' steps.\n' +
                   'A* always picks the cell with the lowest f = g + h score.'
    });

    while (openSet.length > 0) {

        // Sort by f score (ascending) and pick the cell with the LOWEST score
        openSet.sort(function(a, b) { return a.f - b.f; });
        var current = openSet.shift();
        var key     = current.row + ',' + current.col;

        // Skip if already processed (duplicates can exist in openSet)
        if (visited[key]) continue;
        visited[key] = true;

        var visitedList  = keysToList(visited);
        var frontierList = openSet.filter(function(s) {
            return !visited[s.row + ',' + s.col];
        }).map(function(s) {
            return { row: s.row, col: s.col };
        });

        // Did we reach the exit?
        if (current.row === 9 && current.col === 9) {
            frames.push({
                current:   { row: 9, col: 9 },
                visited:   visitedList,
                frontier:  frontierList,
                isDone:    true,
                finalPath: current.path,
                message:   'Found the exit!\n' +
                           'A* explored only ' + visitedList.length + ' cells — ' +
                           'compare this to BFS!\n' +
                           'The shortest path is ' + (current.path.length - 1) + ' steps.\n' +
                           'The heuristic guided A* away from dead-ends, saving time.'
            });
            return frames;
        }

        // Expand neighbors
        var dirs         = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        var newNeighbors = [];

        for (var d = 0; d < dirs.length; d++) {
            var nr   = current.row + dirs[d][0];
            var nc   = current.col + dirs[d][1];
            var nkey = nr + ',' + nc;

            if (nr >= 0 && nr < 10 && nc >= 0 && nc < 10 &&
                mazeGrid[nr][nc] !== 'wall' && !visited[nkey]) {

                var ng = current.g + 1;
                var nh = h(nr, nc);
                var nf = ng + nh;

                newNeighbors.push({ row: nr, col: nc, g: ng, h: nh, f: nf });
                openSet.push({
                    row:  nr,
                    col:  nc,
                    g:    ng,
                    h:    nh,
                    f:    nf,
                    path: current.path.concat([{ row: nr, col: nc }])
                });
            }
        }

        var msg = 'Checking cell (' + current.row + ', ' + current.col + ') — it had the lowest f score.\n' +
                  '  Steps from start  (g) = ' + current.g + '\n' +
                  '  Estimated to exit (h) = ' + current.h + '\n' +
                  '  Total score   (f=g+h) = ' + current.f + '\n';
        if (newNeighbors.length > 0) {
            msg += 'Adding ' + newNeighbors.length +
                   ' neighbor' + (newNeighbors.length > 1 ? 's' : '') +
                   ' to the open set with their own f scores.';
        } else {
            msg += 'No accessible new neighbors.';
        }

        frames.push({
            current:   { row: current.row, col: current.col },
            visited:   keysToList(visited),
            frontier:  openSet.filter(function(s) {
                           return !visited[s.row + ',' + s.col];
                       }).map(function(s) {
                           return { row: s.row, col: s.col };
                       }),
            isDone:    false,
            finalPath: null,
            message:   msg
        });
    }

    frames.push({
        current:   null,
        visited:   keysToList(visited),
        frontier:  [],
        isDone:    true,
        finalPath: [],
        message:   'No path found!'
    });
    return frames;
}


// ---------------------
// Helper: convert a visited object (keys = "row,col") to
// an array of {row, col} objects — used in every frame generator
// ---------------------
function keysToList(obj) {
    return Object.keys(obj).map(function(k) {
        var parts = k.split(',');
        return { row: parseInt(parts[0]), col: parseInt(parts[1]) };
    });
}


// ===================================================
// SECTION 2: RENDERING A VIZ FRAME
// Paints the maze according to one frame's data
// ===================================================

function renderVizFrame(frameIndex) {
    if (vizFrames.length === 0) return;

    var frame = vizFrames[frameIndex];

    // Build lookup maps for fast cell classification
    var visitedMap  = {};
    var frontierMap = {};
    var pathMap     = {};

    for (var i = 0; i < frame.visited.length; i++) {
        visitedMap[frame.visited[i].row + ',' + frame.visited[i].col] = true;
    }
    for (var i = 0; i < frame.frontier.length; i++) {
        frontierMap[frame.frontier[i].row + ',' + frame.frontier[i].col] = true;
    }
    if (frame.isDone && frame.finalPath) {
        for (var i = 0; i < frame.finalPath.length; i++) {
            pathMap[frame.finalPath[i].row + ',' + frame.finalPath[i].col] = true;
        }
    }

    // Build overlay map for renderMaze
    var overlayMap = {};
    for (var row = 0; row < GRID_SIZE; row++) {
        for (var col = 0; col < GRID_SIZE; col++) {
            var key = row + ',' + col;

            if (maze[row][col] === 'wall') continue;

            if (frame.isDone && pathMap[key]) {
                overlayMap[key] = 'path';
            } else if (frame.current &&
                       frame.current.row === row &&
                       frame.current.col === col) {
                overlayMap[key] = 'current';
            } else if (frontierMap[key]) {
                overlayMap[key] = 'frontier';
            } else if (visitedMap[key]) {
                overlayMap[key] = 'visited';
            }
        }
    }

    // Render the maze with viz overlays (no player sprite)
    renderMaze(overlayMap, true, false);

    // Update UI counters and message
    document.getElementById('viz-step-count').textContent =
        'Step ' + (frameIndex + 1) + ' of ' + vizFrames.length;
    document.getElementById('viz-explored-count').textContent =
        frame.visited.length + ' cells explored';
    document.getElementById('viz-message').textContent = frame.message;

    // Update button disabled states
    document.getElementById('viz-prev-btn').disabled = (frameIndex === 0);
    document.getElementById('viz-next-btn').disabled = (frameIndex === vizFrames.length - 1);

    // Update play/pause button label
    document.getElementById('viz-play-btn').textContent = vizIsPlaying ? 'Pause' : 'Play';
}


// ===================================================
// SECTION 3: PLAYBACK CONTROLS
// Play, pause, step forward, step back
// ===================================================

// Start visualizing the chosen algorithm from the beginning
function startViz(algorithmName) {
    vizPause();

    vizAlgorithm    = algorithmName;
    vizCurrentFrame = 0;

    // Highlight the active tab
    var tabNames = ['bfs', 'dfs', 'astar'];
    for (var i = 0; i < tabNames.length; i++) {
        var tab = document.getElementById('tab-' + tabNames[i]);
        tab.className = (tabNames[i] === algorithmName) ? 'algo-tab active' : 'algo-tab';
    }

    // Show algorithm name and description
    var info = ALGO_INFO[algorithmName];
    document.getElementById('algo-name').textContent        = info.name;
    document.getElementById('algo-description').textContent = info.desc;

    // Generate all frames for this algorithm
    if (algorithmName === 'bfs')   vizFrames = generateBFSFrames(maze);
    if (algorithmName === 'dfs')   vizFrames = generateDFSFrames(maze);
    if (algorithmName === 'astar') vizFrames = generateAStarFrames(maze);

    // Enable controls
    document.getElementById('viz-play-btn').disabled    = false;
    document.getElementById('viz-restart-btn').disabled = false;

    // Show the first frame
    renderVizFrame(0);
}

// Reset to a blank state (called when entering the viz panel)
function resetViz() {
    vizPause();
    vizFrames       = [];
    vizCurrentFrame = 0;
    vizAlgorithm    = '';

    // Clear tab highlights
    var tabNames = ['bfs', 'dfs', 'astar'];
    for (var i = 0; i < tabNames.length; i++) {
        document.getElementById('tab-' + tabNames[i]).className = 'algo-tab';
    }

    document.getElementById('algo-name').textContent        = 'Choose an algorithm above to begin!';
    document.getElementById('algo-description').textContent = 'Each algorithm searches the maze in a different way.';
    document.getElementById('viz-step-count').textContent   = 'Step: --';
    document.getElementById('viz-explored-count').textContent = 'Explored: 0 cells';
    document.getElementById('viz-message').textContent      = 'Click a tab above to pick an algorithm and start the demo.';
    document.getElementById('viz-prev-btn').disabled        = true;
    document.getElementById('viz-play-btn').disabled        = true;
    document.getElementById('viz-play-btn').textContent     = 'Play';
    document.getElementById('viz-next-btn').disabled        = true;
    document.getElementById('viz-restart-btn').disabled     = true;
}

// Move one step forward through the frames
function vizStepForward() {
    if (vizCurrentFrame < vizFrames.length - 1) {
        vizCurrentFrame++;
        renderVizFrame(vizCurrentFrame);
    }
}

// Move one step backward through the frames
function vizStepBack() {
    if (vizCurrentFrame > 0) {
        vizCurrentFrame--;
        renderVizFrame(vizCurrentFrame);
    }
}

// Toggle between playing and pausing
function vizTogglePlay() {
    if (vizIsPlaying) {
        vizPause();
    } else {
        vizPlay();
    }
}

// Start auto-play
function vizPlay() {
    if (vizFrames.length === 0) return;
    vizIsPlaying = true;
    document.getElementById('viz-play-btn').textContent = 'Pause';
    scheduleNextFrame();
}

// Stop auto-play (also called by game.js on screen transitions)
function vizPause() {
    vizIsPlaying = false;
    if (vizTimer) {
        clearTimeout(vizTimer);
        vizTimer = null;
    }
    var btn = document.getElementById('viz-play-btn');
    if (btn) btn.textContent = 'Play';
}

// Schedule the next animation step based on the speed slider
function scheduleNextFrame() {
    if (!vizIsPlaying) return;

    // If we are at the last frame, stop playing
    if (vizCurrentFrame >= vizFrames.length - 1) {
        vizIsPlaying = false;
        document.getElementById('viz-play-btn').textContent = 'Play';
        return;
    }

    // Speed slider: 1 = slowest (1500ms), 10 = fastest (80ms)
    var speedSlider = document.getElementById('viz-speed');
    var speed       = speedSlider ? parseInt(speedSlider.value) : 5;
    var delay       = Math.round(1580 - (speed * 150));  // 1580ms down to 80ms

    vizTimer = setTimeout(function() {
        vizCurrentFrame++;
        renderVizFrame(vizCurrentFrame);
        scheduleNextFrame();
    }, delay);
}
