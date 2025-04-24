// Game canvas and context
let canvas, ctx;

// Game state
let gameState = 'menu'; // menu, countdown, playing, gameover
let gameMode = 'versus'; // versus, endless, practice
let currentGameMode = null; // Will hold the active game mode
let difficulty = 'normal'; // easy, normal, hard
let score = { player1: 0, player2: 0 };
let endlessScore = 0;
let highScore = 0;
let roundTime = 120; // 2 minutes per round
let countdown = 3;
let frameCount = 0;
let obstacles = []; // Obstacles for endless mode
let difficultyTimer = 0; // Timer for difficulty increase in endless mode
let gameStartTime = 0; // When the game started

// Timing helpers
let lastFrameTime = Date.now();
let gameLoopRunning = false;

// Settings
let soundEnabled = true;
let musicEnabled = true;
let weatherEnabled = true;

// Game objects
let player1Kite = null;
let player2Kite = null;
let particles = [];
let powerUps = [];
let winds = [];
let windPatterns = [];
let weather = null;
let enemies = []; // For endless mode

// Constants
const GRAVITY = 0.03;
const AIR_RESISTANCE = 0.98;
const DIFFICULTY_SETTINGS = {
    easy: { enemySpeed: 0.5, spawnRate: 180, powerUpRate: 240 },
    normal: { enemySpeed: 0.8, spawnRate: 120, powerUpRate: 300 },
    hard: { enemySpeed: 1.2, spawnRate: 60, powerUpRate: 360 }
};

// Key states
let keys = {};

// Initialize the game
window.onload = function() {
    initializeGame();
};

// Initialize game
function initializeGame() {
    // Set up canvas
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Set canvas dimensions
    resizeCanvas();

    // Load high score
    loadHighScore();

    // Initialize game state
    gameState = 'menu';
    showScreen('menuScreen');

    // Add event listeners
    setupEventListeners();

    // Initialize game loop
    gameLoopRunning = true;
    lastFrameTime = Date.now();
    requestAnimationFrame(gameLoop);
}

// Setup event listeners
function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => {
        resizeCanvas();
        if (gameState === 'playing' || gameState === 'countdown') {
            // Adjust game objects positions based on new canvas size
            adjustGameObjectsPositions();
        }
    });
    
    // Keyboard events
    document.addEventListener('keydown', function(e) {
        keys[e.key.toLowerCase()] = true;
        keys[e.code.toLowerCase()] = true; // Also store by code for Arrow keys
        
        console.log('Key pressed:', e.key.toLowerCase(), e.code.toLowerCase());
        
        // Check for ESC key to access menu
        if (e.key === 'Escape' && (gameState === 'playing' || gameState === 'countdown')) {
            pauseGame();
        }
        
        // Check for R key to restart game
        if (e.key === 'r' && (gameState === 'playing' || gameState === 'gameover')) {
            restartGame();
        }
        
        e.preventDefault(); // Prevent default browser actions
    });
    
    document.addEventListener('keyup', function(e) {
        keys[e.key.toLowerCase()] = false;
        keys[e.code.toLowerCase()] = false; // Also store by code for Arrow keys
    });
    
    // Prevent context menu on right click
    canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });
    
    // Setup input fields to prevent click propagation
    setupInputFields();
    
    // Touch events for mobile
    setupTouchControls();
}

// Setup input fields to prevent click propagation to parent elements
function setupInputFields() {
    // Get all player name input fields
    const inputFields = [
        document.getElementById('player1Name'),
        document.getElementById('player2Name'),
        document.getElementById('endlessPlayerName'),
        document.getElementById('practicePlayerName')
    ];
    
    // Add click event listeners to each input field
    inputFields.forEach(input => {
        if (input) {
            // Stop propagation for various events
            ['click', 'focus', 'mousedown', 'touchstart', 'keydown'].forEach(eventType => {
                input.addEventListener(eventType, function(e) {
                    e.stopPropagation();
                    console.log(`Input field ${input.id} received ${eventType} event`);
                });
            });
            
            // Make sure we can click in the input field
            input.onclick = function(e) {
                e.stopPropagation();
                this.focus();
                return false;
            };
            
            // Ensure form submission doesn't happen
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    this.blur(); // Remove focus when Enter is pressed
                }
            });
        }
    });
    
    // Make sure clicking a button doesn't try to edit the input
    const buttons = document.querySelectorAll('.button');
    buttons.forEach(button => {
        if (button) {
            button.addEventListener('mousedown', function(e) {
                e.stopPropagation();
            });
        }
    });
    
    console.log('Input field event listeners set up');
}

// Setup touch controls
function setupTouchControls() {
    let touchStartX = 0;
    let touchStartY = 0;
    
    canvas.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        e.preventDefault();
    });
    
    canvas.addEventListener('touchmove', function(e) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        
        // Update kite movement based on touch
        if (player1Kite) {
            player1Kite.velocityX += deltaX * 0.01;
            player1Kite.velocityY += deltaY * 0.01;
        }
        
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        e.preventDefault();
    });
}

// Adjust game objects positions when canvas is resized
function adjustGameObjectsPositions() {
    const widthRatio = canvas.width / window.innerWidth;
    const heightRatio = canvas.height / window.innerHeight;
    
    if (player1Kite) {
        player1Kite.x *= widthRatio;
        player1Kite.y *= heightRatio;
    }
    
    if (player2Kite) {
        player2Kite.x *= widthRatio;
        player2Kite.y *= heightRatio;
    }
    
    powerUps.forEach(powerUp => {
        powerUp.x *= widthRatio;
        powerUp.y *= heightRatio;
    });
    
    winds.forEach(wind => {
        wind.x *= widthRatio;
        wind.y *= heightRatio;
    });
}

// Load high score from localStorage
function loadHighScore() {
    const saved = localStorage.getItem('kiteGameHighScore');
    if (saved) {
        highScore = parseInt(saved);
    }
}

// Save high score to localStorage
function saveHighScore() {
    localStorage.setItem('kiteGameHighScore', highScore.toString());
}

// Show specific screen with transition effect
function showScreen(screenId) {
    console.log('Showing screen:', screenId);
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.style.display = 'none';
    });
    
    // Show the requested screen
    const screenElement = document.getElementById(screenId);
    if (screenElement) {
        screenElement.style.display = 'flex';
        console.log(`Screen ${screenId} displayed`);
    } else {
        console.error(`Screen ${screenId} not found`);
    }
    
    // Special case for scoreBoard visibility
    updateScoreBoard(screenId === 'gameScreen');
    
    // Update specific screens with data if needed
    if (screenId === 'leaderboardScreen') {
        updateLeaderboard();
    } else if (screenId === 'settingsScreen') {
        updateSettingsDisplay();
    }
}

// Update leaderboard display
function updateLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    const scores = getLeaderboardScores();
    
    let html = '';
    scores.forEach((score, index) => {
        html += `
            <div class="leaderboard-entry">
                <span>#${index + 1} ${score.name}</span>
                <span>${score.score}</span>
            </div>
        `;
    });
    
    leaderboard.innerHTML = html;
}

// Get leaderboard scores from localStorage
function getLeaderboardScores() {
    const savedScores = localStorage.getItem('kiteGameLeaderboard');
    if (savedScores) {
        return JSON.parse(savedScores);
    }
    return [];
}

// Save score to leaderboard
function saveToLeaderboard(name, score) {
    let scores = getLeaderboardScores();
    scores.push({ name, score });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 10); // Keep only top 10
    localStorage.setItem('kiteGameLeaderboard', JSON.stringify(scores));
}

// Update settings display
function updateSettingsDisplay() {
    document.querySelector('button[onclick="toggleSound()"]').textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
    document.querySelector('button[onclick="toggleMusic()"]').textContent = `Music: ${musicEnabled ? 'ON' : 'OFF'}`;
    document.querySelector('button[onclick="toggleWeather()"]').textContent = `Weather Effects: ${weatherEnabled ? 'ON' : 'OFF'}`;
}

// Handle menu button clicks
function handleMenuClick(action) {
    console.log('Menu click:', action); // Debug log
    
    try {
        switch(action) {
            case 'versus':
            case 'endless':
            case 'practice':
                console.log('Preparing to start game mode:', action);
                prepareGameStart(action);
                break;
            case 'menu':
                console.log('Showing menu screen');
                showScreen('menuScreen');
                break;
            case 'leaderboard':
                console.log('Showing leaderboard screen');
                showScreen('leaderboardScreen');
                break;
            case 'settings':
                console.log('Showing settings screen');
                showScreen('settingsScreen');
                break;
            default:
                console.warn('Unknown menu action:', action);
        }
    } catch (error) {
        console.error('Error in handleMenuClick:', error);
    }
}

// Prepare game start with confirmation dialog
function prepareGameStart(mode) {
    // Get player names from input fields
    let player1Name = "";
    let player2Name = "";
    
    if (mode === 'versus') {
        const p1Input = document.getElementById('player1Name');
        const p2Input = document.getElementById('player2Name');
        player1Name = p1Input ? p1Input.value.trim() || "Player 1" : "Player 1";
        player2Name = p2Input ? p2Input.value.trim() || "Player 2" : "Player 2";
    } else if (mode === 'endless') {
        const pInput = document.getElementById('endlessPlayerName');
        player1Name = pInput ? pInput.value.trim() || "Player" : "Player";
    } else if (mode === 'practice') {
        const pInput = document.getElementById('practicePlayerName');
        player1Name = pInput ? pInput.value.trim() || "Player" : "Player";
    }
    
    // Start the game with the names
    startGame(mode, player1Name, player2Name);
}

// Reset game state when returning to menu
function returnToMenu() {
    // Reset game objects
    player1Kite = null;
    player2Kite = null;
    particles = [];
    powerUps = [];
    winds = [];
    enemies = [];
    
    // Reset game state
    gameState = 'menu';
    score = { player1: 0, player2: 0 };
    endlessScore = 0;
    countdown = 3;
    roundTime = 120;
    
    // Show menu screen
    showScreen('menuScreen');
}

// Initialize canvas and context
function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    console.log('Canvas initialized:', canvas.width, 'x', canvas.height);
}

// Start game with selected mode
function startGame(mode, player1Name, player2Name) {
    console.log(`Starting game in ${mode} mode`);
    
    gameState = 'countdown';
    currentGameMode = mode;
    gameMode = mode; // Also update the gameMode variable
    
    // Show game screen
    showScreen('gameScreen');
    
    // Reset game objects
    particles = [];
    powerUps = [];
    windPatterns = [];
    
    // Initialize canvas if needed
    if (!ctx) {
        initCanvas();
    }
    
    // Create players based on game mode
    if (mode === 'versus') {
        player1Kite = new Kite(canvas.width * 0.25, canvas.height * 0.5, 1, player1Name);
        player2Kite = new Kite(canvas.width * 0.75, canvas.height * 0.5, 2, player2Name);
        console.log(`Created players: ${player1Kite.name} and ${player2Kite.name}`);
    } else if (mode === 'endless') {
        player1Kite = new Kite(canvas.width * 0.5, canvas.height * 0.5, 1, player1Name);
        enemies = [];
        score = 0;
        difficultyLevel = 1;
        nextEnemySpawn = Date.now() + 3000; // First enemy after 3 seconds
        console.log(`Created player: ${player1Kite.name} for endless mode`);
    } else if (mode === 'practice') {
        player1Kite = new Kite(canvas.width * 0.5, canvas.height * 0.5, 1, player1Name);
        console.log(`Created player: ${player1Kite.name} for practice mode`);
    }
    
    // Set game start time for difficulty scaling
    gameStartTime = Date.now();
    
    // Start countdown
    countdown = 3;
    countdownStart = Date.now();
    lastCountdownTime = Date.now(); // Initialize the lastCountdownTime variable
    
    // Start game loop if not already running
    if (!gameLoopRunning) {
        gameLoopRunning = true;
        lastFrameTime = Date.now();
        requestAnimationFrame(gameLoop);
    }
    
    console.log(`Game initialized: Mode=${mode}, Players=${player1Kite ? player1Kite.name : 'none'}${player2Kite ? ', ' + player2Kite.name : ''}, Canvas=${canvas.width}x${canvas.height}, State=${gameState}`);
}

// Set difficulty
function setDifficulty(level) {
    difficulty = level;
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.difficulty-btn[onclick*="${level}"]`).classList.add('active');
}

// Toggle settings
function toggleSound() {
    soundEnabled = !soundEnabled;
    const btn = document.querySelector('button[onclick="toggleSound()"]');
    btn.textContent = `Sound: ${soundEnabled ? 'ON' : 'OFF'}`;
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    const btn = document.querySelector('button[onclick="toggleMusic()"]');
    btn.textContent = `Music: ${musicEnabled ? 'ON' : 'OFF'}`;
}

function toggleWeather() {
    weatherEnabled = !weatherEnabled;
    const btn = document.querySelector('button[onclick="toggleWeather()"]');
    btn.textContent = `Weather Effects: ${weatherEnabled ? 'ON' : 'OFF'}`;
}

// Update score board visibility
function updateScoreBoard(show) {
    const scoreBoard = document.querySelector('.score-board');
    if (show) {
        scoreBoard.style.display = 'block';
        updateScoreText();
    } else {
        scoreBoard.style.display = 'none';
    }
}

// Update score text
function updateScoreText() {
    const scoreText = document.getElementById('scoreText');
    if (gameMode === 'endless') {
        scoreText.textContent = `Score: ${endlessScore} - High Score: ${highScore}`;
    } else {
        scoreText.textContent = `Player 1: ${score.player1} - Player 2: ${score.player2}`;
    }
}

// Resize canvas to fit window
function resizeCanvas() {
    const gameWrapper = document.getElementById('gameWrapper');
    canvas.width = gameWrapper.clientWidth;
    canvas.height = gameWrapper.clientHeight - 60; // Subtract navbar height
}

// Game loop
function gameLoop() {
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = currentTime;
    
    // Increment frame counter
    frameCount++;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();

    // Handle different game states
    switch (gameState) {
        case 'menu':
            drawMenu();
            break;
            
        case 'countdown':
            if (currentTime - lastCountdownTime >= 1000) {
                countdown--;
                lastCountdownTime = currentTime;
                if (countdown <= 0) {
                    gameState = 'playing';
                }
            }
            // Draw game objects
            drawGame();
            // Draw countdown
            ctx.font = '48px Arial';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(countdown.toString(), canvas.width / 2, canvas.height / 2);
            break;

        case 'playing':
            // Update game objects
            updateGame(deltaTime);
            // Draw game objects
            drawGame();
            break;
            
        case 'paused':
            // Just draw game objects without updating
            drawGame();
            break;

        case 'gameover':
            // Draw game over screen
            drawGameOver();
            break;
    }

    // Continue game loop
    if (gameLoopRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function updateGame(deltaTime) {
    // Update wind patterns
    windPatterns.forEach((wind, index) => {
        wind.update(deltaTime);
        if (wind.lifetime <= 0) {
            windPatterns.splice(index, 1);
        }
    });

    // Spawn new wind patterns randomly
    if (Math.random() < 0.02) {
        createWindPatterns();
    }

    // Update power-ups
    powerUps.forEach((powerUp, index) => {
        powerUp.update(deltaTime);
        if (powerUp.collected) {
            powerUps.splice(index, 1);
        }
    });

    // Spawn new power-ups randomly
    if (Math.random() < 0.01 && powerUps.length < 3) {
        spawnPowerUp();
    }

    // Update particles
    particles.forEach((particle, index) => {
        particle.update(deltaTime);
        if (particle.lifetime <= 0) {
            particles.splice(index, 1);
        }
    });

    // Update players
    if (player1Kite) {
        player1Kite.update(keys);
        
        // In endless mode, increase score as kite goes higher
        if (gameMode === 'endless' && gameState === 'playing') {
            // Higher altitude = more points
            const heightBonus = Math.floor((canvas.height - player1Kite.y) / 10);
            if (heightBonus > 0 && frameCount % 10 === 0) {
                endlessScore += heightBonus;
            }
            
            // Scale difficulty with time
            difficultyTimer += deltaTime;
            if (difficultyTimer >= 10) { // Every 10 seconds
                difficultyTimer = 0;
                scaleDifficulty();
            }
            
            // Spawn obstacles periodically
            if (frameCount % 120 === 0) {
                spawnObstacle();
            }
            
            // Update obstacles
            updateObstacles(deltaTime);
            
            // Check for collisions with obstacles
            checkObstacleCollisions();
        }
    }
    
    if (player2Kite) {
        player2Kite.update(keys);
    }

    // Check for collisions in versus mode
    if (gameMode === 'versus' && player1Kite && player2Kite) {
        // Check kite-to-kite collisions
        const collided = player1Kite.checkCollision(player2Kite);
        
        // Force damage if no collision after a while (for testing)
        if (!collided && frameCount % 180 === 0) {
            if (Math.random() < 0.3) {
                console.log("Forced damage for testing");
                const randomDamage = 10 + Math.floor(Math.random() * 10);
                if (Math.random() < 0.5) {
                    player1Kite.takeDamage(randomDamage);
                } else {
                    player2Kite.takeDamage(randomDamage);
                }
            }
        }
    }

    // Check for game over conditions
    checkGameOver();
    
    // Update score text
    updateScoreText();
    
    // Update round timer
    if (gameMode === 'versus' && gameState === 'playing') {
        if (frameCount % 60 === 0) {
            roundTime--;
            if (roundTime <= 0) {
                // End round by time if needed
                if (player1Kite.health > player2Kite.health) {
                    score.player1++;
                } else if (player2Kite.health > player1Kite.health) {
                    score.player2++;
                }
                
                if (score.player1 >= 3 || score.player2 >= 3) {
                    endGame();
                } else {
                    resetRound();
                }
            }
        }
    }
}

function drawGame() {
    // Draw wind patterns
    windPatterns.forEach(wind => wind.draw(ctx));

    // Draw obstacles
    obstacles.forEach(obstacle => obstacle.draw(ctx));

    // Draw power-ups
    powerUps.forEach(powerUp => powerUp.draw(ctx));

    // Draw particles
    particles.forEach(particle => particle.draw(ctx));

    // Draw players
    if (player1Kite) {
        player1Kite.draw(ctx);
    }
    if (player2Kite) {
        player2Kite.draw(ctx);
    }

    // Draw UI elements
    drawUI();
    
    // Draw menu button in endless mode
    if (gameMode === 'endless' && gameState === 'playing') {
        drawMenuButton();
    }
}

// Draw background
function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    
    if (weather && weather.type === 'rain') {
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
    } else if (weather && weather.type === 'snow') {
        gradient.addColorStop(0, '#b3cde0');
        gradient.addColorStop(1, '#6497b1');
    } else {
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F7FA');
    }
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw ground
    ctx.fillStyle = '#3a5f0b';
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    
    // Draw clouds if not raining
    if (!weather || weather.type === 'snow') {
        drawClouds();
    }
    
    // Draw wind zones
    winds.forEach(wind => wind.draw());
    
    // Draw weather effects
    if (weather) {
        weather.draw();
    }
}

// Draw clouds
function drawClouds() {
    const cloudPositions = [
        { x: canvas.width * 0.1, y: canvas.height * 0.1, size: 40 },
        { x: canvas.width * 0.3, y: canvas.height * 0.15, size: 50 },
        { x: canvas.width * 0.7, y: canvas.height * 0.2, size: 60 },
        { x: canvas.width * 0.9, y: canvas.height * 0.12, size: 35 }
    ];
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    
    cloudPositions.forEach(cloud => {
        for (let i = 0; i < 5; i++) {
            const offsetX = i * cloud.size / 3;
            const offsetY = (i % 2 === 0) ? 0 : cloud.size / 4;
            ctx.beginPath();
            ctx.arc(cloud.x + offsetX, cloud.y + offsetY, cloud.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// Draw UI elements
function drawUI() {
    // Draw score on canvas directly
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    
    if (gameMode === 'versus') {
        // Draw score in format "1:2"
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(`${score.player1}:${score.player2}`, canvas.width / 2, 120);
        ctx.fillText(`${score.player1}:${score.player2}`, canvas.width / 2, 120);
        
        // Draw player names above the score
        ctx.font = 'bold 20px Arial';
        const player1DisplayName = player1Kite ? player1Kite.name : 'Player 1';
        const player2DisplayName = player2Kite ? player2Kite.name : 'Player 2';
        
        // Draw player 1 name (left-aligned)
        ctx.textAlign = 'right';
        ctx.strokeText(player1DisplayName, canvas.width / 2 - 30, 160);
        ctx.fillText(player1DisplayName, canvas.width / 2 - 30, 160);
        
        // Draw vs text in the middle
        ctx.textAlign = 'center';
        ctx.strokeText('vs', canvas.width / 2, 160);
        ctx.fillText('vs', canvas.width / 2, 160);
        
        // Draw player 2 name (right-aligned)
        ctx.textAlign = 'left';
        ctx.strokeText(player2DisplayName, canvas.width / 2 + 30, 160);
        ctx.fillText(player2DisplayName, canvas.width / 2 + 30, 160);
        
        // Update HTML score display as well
        const scoreText = document.getElementById('scoreText');
        if (scoreText) scoreText.textContent = `${score.player1}:${score.player2} | ${player1DisplayName} vs ${player2DisplayName}`;
    } else if (gameMode === 'endless') {
        // Draw endless mode score at the top center with increased vertical position
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(`Score: ${endlessScore}`, canvas.width / 2, 120);
        ctx.fillText(`Score: ${endlessScore}`, canvas.width / 2, 120);
        
        // Draw high score
        ctx.font = 'bold 24px Arial';
        ctx.strokeText(`High Score: ${highScore}`, canvas.width / 2, 160);
        ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, 160);
        
        // Update HTML score display as well
        const scoreText = document.getElementById('scoreText');
        if (scoreText) scoreText.textContent = `Score: ${endlessScore} - High Score: ${highScore}`;
        
        // Draw additional endless mode UI
        drawEndlessModeUI();
    } else if (gameMode === 'practice') {
        // Draw practice mode label
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(`Practice Mode`, canvas.width / 2, 120);
        ctx.fillText(`Practice Mode`, canvas.width / 2, 120);
        
        // Draw player name
        ctx.font = 'bold 24px Arial';
        ctx.strokeText(`${player1Kite ? player1Kite.name : 'Player'}`, canvas.width / 2, 160);
        ctx.fillText(`${player1Kite ? player1Kite.name : 'Player'}`, canvas.width / 2, 160);
    }

    // Draw health bars
    if (player1Kite) {
        drawHealthBar(50, 200, player1Kite.health, '#FF5252', player1Kite.name);
    }
    if (player2Kite) {
        drawHealthBar(canvas.width - 250, 200, player2Kite.health, '#2196F3', player2Kite.name);
    }

    // Draw round timer if in versus mode
    if (gameMode === 'versus') {
        const minutes = Math.floor(roundTime / 60);
        const seconds = roundTime % 60;
        
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white'; 
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        
        ctx.strokeText(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`, canvas.width / 2, 200);
        ctx.fillText(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`, canvas.width / 2, 200);
    }
}

// Draw health bar
function drawHealthBar(x, y, health, color, label) {
    const width = 200;
    const height = 25;
    
    // Draw background with outline
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, y, width, height);
    
    // Draw health with gradient
    const healthWidth = Math.max(0, width * (health / 100));
    
    let healthColor;
    if (health > 60) {
        healthColor = '#4CAF50'; // Green
    } else if (health > 30) {
        healthColor = '#FFC107'; // Yellow/amber
    } else {
        healthColor = '#F44336'; // Red
    }
    
    // Create gradient
    const grd = ctx.createLinearGradient(x, y, x + healthWidth, y);
    grd.addColorStop(0, healthColor);
    grd.addColorStop(1, shadeColor(healthColor, 30)); // Slightly lighter shade at end
    
    ctx.fillStyle = grd;
    ctx.fillRect(x, y, healthWidth, height);
    
    // Draw health amount over the bar
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeText(`${Math.ceil(health)}%`, x + width / 2, y + height / 2 + 5);
    ctx.fillText(`${Math.ceil(health)}%`, x + width / 2, y + height / 2 + 5);
    
    // Draw label above health bar
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.strokeText(label, x, y - 5);
    ctx.fillText(label, x, y - 5);
    
    // Draw border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
}

// Helper function to lighten/darken a color
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = Math.min(255, Math.max(0, R + percent));
    G = Math.min(255, Math.max(0, G + percent));
    B = Math.min(255, Math.max(0, B + percent));

    const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
}

// Draw game over screen
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.font = 'bold 72px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 3);
    
    // Draw score 
    if (gameMode === 'versus') {
        // Draw final score in large format
        ctx.font = 'bold 120px Arial';
        ctx.fillText(`${score.player1}:${score.player2}`, canvas.width / 2, canvas.height / 2);
        
        // Draw winner
        const winner = score.player1 > score.player2 ? 
            (player1Kite ? player1Kite.name : 'Player 1') : 
            (player2Kite ? player2Kite.name : 'Player 2');
        
        ctx.font = '48px Arial';
        ctx.fillText(`${winner} Wins!`, canvas.width / 2, canvas.height / 2 + 80);
    } else if (gameMode === 'endless') {
        ctx.font = 'bold 72px Arial';
        ctx.fillText(`Score: ${endlessScore}`, canvas.width / 2, canvas.height / 2);
        
        if (endlessScore >= highScore) {
            ctx.font = '36px Arial';
            ctx.fillText('New High Score!', canvas.width / 2, canvas.height / 2 + 60);
        } else {
            ctx.font = '36px Arial';
            ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 60);
        }
    }
    
    // Draw restart button
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height * 2 / 3 + 40;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('PLAY AGAIN', canvas.width / 2, buttonY + buttonHeight / 2);
}

// Check game over conditions
function checkGameOver() {
    if (gameMode === 'endless') {
        if (player1Kite && player1Kite.health <= 0) {
            endGame();
        }
    } else if (gameMode === 'versus') {
        if (player1Kite && player2Kite) {
            if (player1Kite.health <= 0 || player2Kite.health <= 0) {
                console.log("Health check - Player 1: " + player1Kite.health + ", Player 2: " + player2Kite.health);
                
                if (player1Kite.health <= 0) {
                    score.player2++;
                    console.log("Player 2 wins round! Score: " + score.player1 + "-" + score.player2);
                } else {
                    score.player1++;
                    console.log("Player 1 wins round! Score: " + score.player1 + "-" + score.player2);
                }
                
                updateScoreText();
                
                if (score.player1 >= 3 || score.player2 >= 3) {
                    endGame();
                } else {
                    resetRound();
                }
            }
        }
    }
}

// End game
function endGame() {
    if (gameMode === 'endless') {
        if (endlessScore > highScore) {
            highScore = endlessScore;
            saveHighScore();
        }
    }
    
    const stats = document.getElementById('gameOverStats');
    if (gameMode === 'endless') {
        stats.innerHTML = `
            <p>Final Score: ${endlessScore}</p>
            <p>High Score: ${highScore}</p>
        `;
    } else {
        const winner = score.player1 > score.player2 ? 
            (player1Kite ? player1Kite.name : 'Player 1') : 
            (player2Kite ? player2Kite.name : 'Player 2');
        
        stats.innerHTML = `
            <p class="final-score">${score.player1}:${score.player2}</p>
            <p class="winner">${winner} Wins!</p>
        `;
    }
    
    gameState = 'gameover';
    showScreen('gameOverScreen');
}

// Restart game
function restartGame() {
    score = { player1: 0, player2: 0 };
    endlessScore = 0;
    startGame(gameMode);
}

// Reset round
function resetRound() {
    roundTime = 120;
    if (gameMode === 'versus') {
        player1Kite.health = 100;
        player2Kite.health = 100;
    }
}

// Draw menu
function drawMenu() {
    // Draw background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw title
    ctx.font = 'bold 72px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KITE BATTLE', canvas.width / 2, canvas.height / 3);
    
    // Draw instructions
    ctx.font = '24px Arial';
    ctx.fillText('Player 1: WASD keys', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Player 2: Arrow keys', canvas.width / 2, canvas.height / 2 + 40);
    
    // Draw start button
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonX = canvas.width / 2 - buttonWidth / 2;
    const buttonY = canvas.height * 2 / 3;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
    
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#FFF';
    ctx.fillText('START', canvas.width / 2, buttonY + buttonHeight / 2);
}

// Create wind patterns for game
function createWindPatterns() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const radius = 50 + Math.random() * 100;
    const force = 0.5 + Math.random() * 1.5;
    const lifetime = 5 + Math.random() * 10; // seconds
    
    windPatterns.push({
        x: x,
        y: y,
        radius: radius,
        force: force,
        lifetime: lifetime,
        update: function(deltaTime) {
            this.lifetime -= deltaTime;
        },
        draw: function(ctx) {
            // Draw wind pattern
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
            
            // Draw wind direction indicators
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const startX = this.x + Math.cos(angle) * (this.radius * 0.5);
                const startY = this.y + Math.sin(angle) * (this.radius * 0.5);
                const endX = startX + Math.cos(angle) * (this.force * 10);
                const endY = startY + Math.sin(angle) * (this.force * 10);
                
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }
    });
}

// Spawn power-up in the game
function spawnPowerUp() {
    const types = ['speed', 'shield', 'repair', 'windMaster'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = Math.random() * (canvas.width - 100) + 50;
    const y = Math.random() * (canvas.height - 100) + 50;
    
    powerUps.push({
        x: x,
        y: y,
        type: type,
        radius: 20,
        collected: false,
        animFrame: 0,
        update: function(deltaTime) {
            // Power-up floating animation
            this.y += Math.sin(Date.now() / 200) * 0.5;
            this.animFrame = (this.animFrame + 1) % 60;
            
            return !this.collected;
        },
        draw: function(ctx) {
            // Draw power-up glow
            const glowSize = 30 + Math.sin(this.animFrame / 10) * 5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
            
            // Set color based on power-up type
            let gradient;
            switch(this.type) {
                case 'speed':
                    gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
                    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.9)');
                    gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
                    break;
                case 'shield':
                    gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
                    gradient.addColorStop(0, 'rgba(0, 191, 255, 0.9)');
                    gradient.addColorStop(1, 'rgba(0, 191, 255, 0)');
                    break;
                case 'repair':
                    gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
                    gradient.addColorStop(0, 'rgba(50, 205, 50, 0.9)');
                    gradient.addColorStop(1, 'rgba(50, 205, 50, 0)');
                    break;
                case 'windMaster':
                    gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowSize);
                    gradient.addColorStop(0, 'rgba(153, 50, 204, 0.9)');
                    gradient.addColorStop(1, 'rgba(153, 50, 204, 0)');
                    break;
            }
            
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw power-up icon
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#FFF';
            ctx.fill();
            
            // Draw power-up icon
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = '#333';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let icon;
            switch(this.type) {
                case 'speed':
                    icon = 'S';
                    break;
                case 'shield':
                    icon = 'D';
                    break;
                case 'repair':
                    icon = 'H';
                    break;
                case 'windMaster':
                    icon = 'W';
                    break;
            }
            
            ctx.fillText(icon, this.x, this.y);
        }
    });
}

// Draw menu button for endless mode
function drawMenuButton() {
    const buttonSize = 40;
    const padding = 10;
    
    // Draw button background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(padding, padding, buttonSize, buttonSize);
    
    // Draw button border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, padding, buttonSize, buttonSize);
    
    // Draw menu icon
    ctx.fillStyle = '#FFFFFF';
    const iconPadding = 10;
    const lineHeight = 4;
    const lineSpacing = 8;
    
    for (let i = 0; i < 3; i++) {
        ctx.fillRect(
            padding + iconPadding, 
            padding + iconPadding + (i * lineSpacing), 
            buttonSize - (iconPadding * 2), 
            lineHeight
        );
    }
    
    // Add click handler for the menu button area
    canvas.onclick = function(e) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        if (mouseX >= padding && mouseX <= padding + buttonSize &&
            mouseY >= padding && mouseY <= padding + buttonSize) {
            pauseGame();
        }
    };
}

// Pause game and show menu
function pauseGame() {
    gameState = 'paused';
    showPauseMenu();
}

// Show pause menu
function showPauseMenu() {
    const pauseMenu = document.createElement('div');
    pauseMenu.id = 'pauseMenu';
    pauseMenu.className = 'screen';
    pauseMenu.innerHTML = `
        <div class="menu-container">
            <h2 class="title">Game Paused</h2>
            <button class="button" onclick="resumeGame()">Resume Game</button>
            <button class="button secondary" onclick="returnToMenu()">Back to Menu</button>
        </div>
    `;
    
    document.getElementById('gameWrapper').appendChild(pauseMenu);
}

// Resume game
function resumeGame() {
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) {
        pauseMenu.remove();
    }
    
    gameState = 'playing';
    lastFrameTime = Date.now(); // Reset frame time to prevent jumps
}

// Create an obstacle
function spawnObstacle() {
    // Determine spawn position (always from the sides)
    const fromLeft = Math.random() < 0.5;
    const x = fromLeft ? -50 : canvas.width + 50;
    const y = Math.random() * (canvas.height * 0.8);
    
    // Determine obstacle type
    const types = ['cloud', 'bird', 'balloon'];
    
    // As difficulty increases, favor more dangerous obstacles
    const difficultyLevel = Math.min(10, Math.floor((Date.now() - gameStartTime) / 60000) + 1);
    let typeIndex;
    
    if (difficultyLevel <= 3) {
        // Lower difficulties: mostly clouds, some birds, rare balloons
        const rand = Math.random();
        if (rand < 0.6) typeIndex = 0; // cloud
        else if (rand < 0.9) typeIndex = 1; // bird
        else typeIndex = 2; // balloon
    } else if (difficultyLevel <= 7) {
        // Medium difficulties: equal distribution
        typeIndex = Math.floor(Math.random() * 3);
    } else {
        // Higher difficulties: mostly birds and balloons
        const rand = Math.random();
        if (rand < 0.3) typeIndex = 0; // cloud
        else if (rand < 0.7) typeIndex = 1; // bird
        else typeIndex = 2; // balloon
    }
    
    const type = types[typeIndex];
    
    // Determine speed based on current difficulty
    const currentTime = Date.now();
    const gameTimeMinutes = (currentTime - gameStartTime) / 60000;
    const baseSpeed = 1 + Math.min(5, gameTimeMinutes / 2); // Speed increases with time
    
    // Birds move faster than other obstacles
    let speedMultiplier = 1.0;
    if (type === 'bird') speedMultiplier = 1.5;
    if (type === 'cloud') speedMultiplier = 0.8;
    
    // Apply difficulty multiplier
    speedMultiplier *= (1 + (difficultyLevel * 0.1)); // 10% speed increase per level
    
    const speed = baseSpeed * speedMultiplier * (fromLeft ? 1 : -1); // Direction based on spawn side
    
    // Determine size based on type and difficulty
    let width = 60;
    let height = 40;
    
    // Larger obstacles for higher difficulties
    const sizeMultiplier = 1 + (difficultyLevel * 0.05); // 5% size increase per level
    
    if (type === 'bird') {
        width = 50 * sizeMultiplier;
        height = 30 * sizeMultiplier;
    } else if (type === 'cloud') {
        width = 70 * sizeMultiplier;
        height = 45 * sizeMultiplier;
    } else { // balloon
        width = 60 * sizeMultiplier;
        height = 80 * sizeMultiplier;
    }
    
    // Define color variations based on difficulty
    let colors = {
        cloud: 'rgba(200, 200, 200, 0.8)',
        bird: '#333333',
        balloon: '#FF5252'
    };
    
    // Higher difficulty = more threatening colors
    if (difficultyLevel > 5) {
        colors.cloud = 'rgba(150, 150, 150, 0.9)';
        colors.bird = '#222222';
        colors.balloon = '#FF3333';
    }
    if (difficultyLevel > 8) {
        colors.cloud = 'rgba(100, 100, 100, 0.95)';
        colors.bird = '#111111';
        colors.balloon = '#FF0000';
    }
    
    obstacles.push({
        x: x,
        y: y,
        width: width,
        height: height,
        type: type,
        speed: speed,
        difficultyLevel: difficultyLevel, // Store the difficulty level when spawned
        color: colors[type],
        active: true,
        draw: function(ctx) {
            // Draw obstacle based on type
            switch(this.type) {
                case 'cloud':
                    // Draw cloud
                    ctx.fillStyle = this.color;
                    for (let i = 0; i < 3; i++) {
                        ctx.beginPath();
                        ctx.arc(this.x + i*20, this.y, this.width/3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    
                    // Add lightning for higher difficulty clouds
                    if (this.difficultyLevel > 6) {
                        ctx.strokeStyle = '#FFFF00';
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(this.x, this.y + this.height/2);
                        ctx.lineTo(this.x - 10, this.y + this.height);
                        ctx.lineTo(this.x + 5, this.y + this.height * 0.8);
                        ctx.lineTo(this.x - 15, this.y + this.height * 1.5);
                        ctx.stroke();
                    }
                    break;
                case 'bird':
                    // Draw bird
                    ctx.fillStyle = this.color;
                    // Bird body
                    ctx.beginPath();
                    ctx.ellipse(this.x, this.y, this.width/2.5, this.height/3, 0, 0, Math.PI * 2);
                    ctx.fill();
                    // Bird wings
                    ctx.beginPath();
                    ctx.moveTo(this.x - this.width/5, this.y);
                    ctx.lineTo(this.x - this.width/1.5, this.y - this.height/2);
                    ctx.lineTo(this.x - this.width/5, this.y + this.height/8);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.width/5, this.y);
                    ctx.lineTo(this.x + this.width/1.5, this.y - this.height/2);
                    ctx.lineTo(this.x + this.width/5, this.y + this.height/8);
                    ctx.fill();
                    
                    // Add red eyes for higher difficulty birds
                    if (this.difficultyLevel > 5) {
                        ctx.fillStyle = '#FF0000';
                        ctx.beginPath();
                        ctx.arc(this.x + this.width/3, this.y - this.height/10, this.width/10, 0, Math.PI * 2);
                        ctx.fill();
                    }
                    break;
                case 'balloon':
                    // Draw hot air balloon
                    // Balloon part
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y - this.height/3, this.width/2, 0, Math.PI * 2);
                    ctx.fill();
                    // Basket
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(this.x - this.width/6, this.y + this.height/3, this.width/3, this.height/4);
                    // Strings
                    ctx.strokeStyle = '#000';
                    ctx.beginPath();
                    ctx.moveTo(this.x - this.width/3, this.y);
                    ctx.lineTo(this.x - this.width/6, this.y + this.height/3);
                    ctx.moveTo(this.x + this.width/3, this.y);
                    ctx.lineTo(this.x + this.width/6, this.y + this.height/3);
                    ctx.stroke();
                    
                    // Add flames for higher difficulty balloons
                    if (this.difficultyLevel > 7) {
                        // Draw flames beneath balloon
                        const gradient = ctx.createLinearGradient(
                            this.x, this.y + this.height/3, 
                            this.x, this.y + this.height/1.5
                        );
                        gradient.addColorStop(0, '#FFFF00');
                        gradient.addColorStop(1, '#FF0000');
                        
                        ctx.fillStyle = gradient;
                        ctx.beginPath();
                        ctx.moveTo(this.x - this.width/8, this.y + this.height/3);
                        ctx.lineTo(this.x, this.y + this.height/1.5);
                        ctx.lineTo(this.x + this.width/8, this.y + this.height/3);
                        ctx.closePath();
                        ctx.fill();
                    }
                    break;
            }
            
            // Add danger indicator for high difficulty obstacles
            if (this.difficultyLevel >= 8) {
                // Pulsing danger aura
                const pulseSize = 5 + Math.sin(Date.now() / 200) * 3;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width/1.5 + pulseSize, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                // Danger text
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#FF0000';
                ctx.textAlign = 'center';
                ctx.fillText('!', this.x, this.y - this.height/1.5);
            }
        },
        update: function(deltaTime) {
            this.x += this.speed;
            
            // Remove if off screen
            return (this.x < -100 || this.x > canvas.width + 100);
        }
    });
}

// Update obstacles
function updateObstacles(deltaTime) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].update(deltaTime)) {
            obstacles.splice(i, 1);
        }
    }
}

// Check collisions with obstacles
function checkObstacleCollisions() {
    if (!player1Kite) return;
    
    obstacles.forEach(obstacle => {
        // Simple bounding box collision
        if (player1Kite.x + player1Kite.width/2 > obstacle.x - obstacle.width/2 &&
            player1Kite.x - player1Kite.width/2 < obstacle.x + obstacle.width/2 &&
            player1Kite.y + player1Kite.height/2 > obstacle.y - obstacle.height/2 &&
            player1Kite.y - player1Kite.height/2 < obstacle.y + obstacle.height/2) {
            
            // Apply damage based on obstacle type
            let damage = 15;
            if (obstacle.type === 'bird') damage = 25;
            if (obstacle.type === 'cloud') damage = 12;
            if (obstacle.type === 'balloon') damage = 20;
            
            // Increase damage based on difficulty level
            const difficultyLevel = Math.min(10, Math.floor((Date.now() - gameStartTime) / 60000) + 1);
            const difficultyMultiplier = 1 + (difficultyLevel * 0.1); // 10% increase per level
            damage = Math.ceil(damage * difficultyMultiplier);
            
            console.log(`Obstacle collision! Type: ${obstacle.type}, Damage: ${damage}, Difficulty: ${difficultyLevel}`);
            
            player1Kite.takeDamage(damage);
            
            // Create collision particles
            for (let i = 0; i < 20; i++) {
                const angle = Math.random() * Math.PI * 2;
                createParticle(
                    obstacle.x,
                    obstacle.y,
                    Math.cos(angle) * 3,
                    Math.sin(angle) * 3,
                    '#FFFFFF',
                    1
                );
            }
            
            // Remove obstacle after collision
            obstacle.active = false;
        }
    });
    
    // Remove inactive obstacles
    obstacles = obstacles.filter(obstacle => obstacle.active);
}

// Scale difficulty with time
function scaleDifficulty() {
    // Calculate time-based difficulty
    const currentTime = Date.now();
    const gameTimeMinutes = (currentTime - gameStartTime) / 60000;
    
    console.log(`Game time: ${gameTimeMinutes.toFixed(1)} minutes, adjusting difficulty`);
    
    // Increase spawn rate of obstacles
    if (obstacles.length < Math.min(10, Math.floor(gameTimeMinutes) + 2)) {
        spawnObstacle();
    }
    
    // Increase wind strength
    if (Math.random() < 0.5) {
        createWindPatterns();
    }
    
    // Spawn power-ups to help the player
    if (Math.random() < 0.3) {
        spawnPowerUp();
    }
}

// Draw endless mode UI
function drawEndlessModeUI() {
    const rightEdge = canvas.width - 20;
    const startY = 250; // Start Y position below health bars
    const lineHeight = 35; // Height between lines
    
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'right';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    
    // Draw altitude indicator
    if (player1Kite) {
        const altitude = Math.max(0, Math.floor((canvas.height - player1Kite.y) / 10));
        ctx.strokeText(`Altitude: ${altitude}m`, rightEdge, startY);
        ctx.fillText(`Altitude: ${altitude}m`, rightEdge, startY);
    }
    
    // Draw time played
    const gameTimeSeconds = Math.floor((Date.now() - gameStartTime) / 1000);
    const minutes = Math.floor(gameTimeSeconds / 60);
    const seconds = gameTimeSeconds % 60;
    ctx.strokeText(`Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`, rightEdge, startY + lineHeight);
    ctx.fillText(`Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`, rightEdge, startY + lineHeight);
    
    // Draw difficulty level
    const difficultyLevel = Math.min(10, Math.floor((Date.now() - gameStartTime) / 60000) + 1);
    ctx.strokeText(`Difficulty: ${difficultyLevel}/10`, rightEdge, startY + lineHeight * 2);
    ctx.fillText(`Difficulty: ${difficultyLevel}/10`, rightEdge, startY + lineHeight * 2);
    
    // Draw obstacles count
    ctx.strokeText(`Obstacles: ${obstacles.length}`, rightEdge, startY + lineHeight * 3);
    ctx.fillText(`Obstacles: ${obstacles.length}`, rightEdge, startY + lineHeight * 3);
}

// Create a temporary Kite class if objects.js isn't loaded yet
if (typeof Kite === 'undefined') {
    console.warn('Kite class not found, creating temporary placeholder');
    // Simple placeholder Kite class to prevent errors
    class Kite {
        constructor(x, y, playerNumber) {
            this.x = x;
            this.y = y;
            this.playerNumber = playerNumber;
            this.velocityX = 0;
            this.velocityY = 0;
            this.health = 100;
            this.width = 30;
            this.height = 30;
            this.activePowerUps = {
                speed: 0,
                shield: 0,
                windMaster: 0
            };
        }
        
        update() {
            // Simple placeholder update method
            this.x += this.velocityX;
            this.y += this.velocityY;
            
            // Keep within boundaries
            this.x = Math.max(0, Math.min(canvas.width, this.x));
            this.y = Math.max(0, Math.min(canvas.height, this.y));
        }
        
        draw(ctx) {
            // Simple placeholder kite drawing
            ctx.fillStyle = this.playerNumber === 1 ? '#FF5252' : '#2196F3';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y - this.height/2);
            ctx.lineTo(this.x + this.width/2, this.y);
            ctx.lineTo(this.x, this.y + this.height/2);
            ctx.lineTo(this.x - this.width/2, this.y);
            ctx.closePath();
            ctx.fill();
            
            // Draw shield if active
            if (this.activePowerUps.shield > 0) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.width, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 191, 255, 0.7)';
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }
    }
    
    // Make Kite available globally
    window.Kite = Kite;
}

// Add line intersection utility functions
function lineIntersection(line1, line2) {
    const denominator = ((line2.y2 - line2.y1) * (line1.x2 - line1.x1)) - ((line2.x2 - line2.x1) * (line1.y2 - line1.y1));
    
    if (denominator === 0) return false;
    
    const ua = (((line2.x2 - line2.x1) * (line1.y1 - line2.y1)) - ((line2.y2 - line2.y1) * (line1.x1 - line2.x1))) / denominator;
    const ub = (((line1.x2 - line1.x1) * (line1.y1 - line2.y1)) - ((line1.y2 - line1.y1) * (line1.x1 - line2.x1))) / denominator;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}

function getLineIntersection(line1, line2) {
    const denominator = ((line2.y2 - line2.y1) * (line1.x2 - line1.x1)) - ((line2.x2 - line2.x1) * (line1.y2 - line1.y1));
    
    if (denominator === 0) return null;
    
    const ua = (((line2.x2 - line2.x1) * (line1.y1 - line2.y1)) - ((line2.y2 - line2.y1) * (line1.x1 - line2.x1))) / denominator;
    const ub = (((line1.x2 - line1.x1) * (line1.y1 - line2.y1)) - ((line1.y2 - line1.y1) * (line1.x1 - line2.x1))) / denominator;
    
    if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
        const x = line1.x1 + (ua * (line1.x2 - line1.x1));
        const y = line1.y1 + (ua * (line1.y2 - line1.y1));
        return {x, y};
    }
    
    return null;
} 