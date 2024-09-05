const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

let currentGuess = [];
let guesses = [];
let gameOver = false;
let DEBUG_MODE = false;

const gameBoard = document.getElementById('game-board');
const keyboard = document.getElementById('keyboard');
const messageElement = document.getElementById('message');
const shareButton = document.getElementById('share-button');
const statsElement = document.getElementById('stats');
const nextGameTimerElement = document.getElementById('next-game-timer');

function createGameBoard() {
    for (let i = 0; i < MAX_GUESSES; i++) {
        const row = document.createElement('div');
        row.className = 'word-row';
        for (let j = 0; j < WORD_LENGTH; j++) {
            const letterBox = document.createElement('div');
            letterBox.className = 'letter-box';
            row.appendChild(letterBox);
        }
        gameBoard.appendChild(row);
    }
}

function updateGameBoard() {
    const rows = gameBoard.getElementsByClassName('word-row');
    for (let i = 0; i < MAX_GUESSES; i++) {
        const row = rows[i];
        const letterBoxes = row.getElementsByClassName('letter-box');
        for (let j = 0; j < WORD_LENGTH; j++) {
            const letterBox = letterBoxes[j];
            if (i < guesses.length) {
                letterBox.textContent = guesses[i][j].letter;
                letterBox.className = `letter-box ${guesses[i][j].result}`;
            } else if (i === guesses.length && j < currentGuess.length) {
                letterBox.textContent = currentGuess[j];
                letterBox.className = 'letter-box';
            } else {
                letterBox.textContent = '';
                letterBox.className = 'letter-box';
            }
        }
    }
}

function createKeyboard() {
    const keys = [
        'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P',
        'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L',
        'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace', 'Clear', 'Enter'
    ];

    const keyboardLayout = [
        keys.slice(0, 10),
        keys.slice(10, 19),
        keys.slice(19)
    ];

    keyboardLayout.forEach(row => {
        const keyboardRow = document.createElement('div');
        keyboardRow.className = 'keyboard-row';
        row.forEach(key => {
            const keyButton = document.createElement('button');
            keyButton.textContent = key;
            keyButton.className = 'key';
            keyButton.dataset.key = key;
            keyButton.addEventListener('click', () => handleKeyPress(key));
            keyboardRow.appendChild(keyButton);
        });
        keyboard.appendChild(keyboardRow);
    });
}

function handleKeyPress(key) {
    if (gameOver) return;

    if (key === 'Backspace') {
        currentGuess.pop();
    } else if (key === 'Enter') {
        if (currentGuess.length === WORD_LENGTH) {
            submitGuess();
        }
    } else if (key === 'Clear') {
        currentGuess = [];
        showMessage('');
    } else if (currentGuess.length < WORD_LENGTH && key.match(/^[A-Z]$/)) {
        currentGuess.push(key);
    }

    updateGameBoard();
}

function submitGuess() {
    const guess = currentGuess.join('');

    fetch('/api/check_word', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guess }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMessage(data.error, true);
            return;
        }

        guesses.push(currentGuess.map((letter, index) => ({ letter, result: data.result[index] })));
        applyResult(data.result);
        currentGuess = [];

        if (data.correct || guesses.length === MAX_GUESSES) {
            endGame(data.correct);
        }
        
        updateGameBoard();
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('An error occurred. Please try again.', true);
    });
}

function applyResult(result) {
    const row = gameBoard.getElementsByClassName('word-row')[guesses.length - 1];
    const letterBoxes = row.getElementsByClassName('letter-box');

    for (let i = 0; i < WORD_LENGTH; i++) {
        letterBoxes[i].classList.add(result[i]);
        updateKeyboardColor(guesses[guesses.length - 1][i].letter, result[i]);
    }
}

function updateKeyboardColor(letter, result) {
    const key = document.querySelector(`.key:not(.correct):not(.present):not(.absent):not(.incorrect)[data-key="${letter}"]`);
    if (key) {
        if (result === 'absent') {
            key.classList.add('incorrect');
        } else {
            key.classList.add(result);
        }
    }
}

function endGame(won) {
    gameOver = true;
    updateStats(won);
    showMessage(won ? 'Congratulations! You won!' : 'Game over. Try again tomorrow!');
    shareButton.style.display = 'block';
    startNextGameTimer();
}

function showMessage(message, isError = false) {
    messageElement.textContent = message;
    messageElement.className = isError ? 'error-message' : '';
}

function updateStats(won) {
    let stats = JSON.parse(localStorage.getItem('wordleStats')) || { played: 0, won: 0, streak: 0, maxStreak: 0 };
    stats.played++;
    if (won) {
        stats.won++;
        stats.streak++;
        stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    } else {
        stats.streak = 0;
    }
    localStorage.setItem('wordleStats', JSON.stringify(stats));
    displayStats();
}

function displayStats() {
    const stats = JSON.parse(localStorage.getItem('wordleStats')) || { played: 0, won: 0, streak: 0, maxStreak: 0 };
    statsElement.textContent = `Games played: ${stats.played} | Win rate: ${Math.round((stats.won / stats.played) * 100) || 0}% | Current streak: ${stats.streak} | Max streak: ${stats.maxStreak}`;
}

function startNextGameTimer() {
    fetch('/api/get_next_game_time')
        .then(response => response.json())
        .then(data => {
            const updateTimer = () => {
                const hours = Math.floor(data.seconds / 3600);
                const minutes = Math.floor((data.seconds % 3600) / 60);
                const seconds = data.seconds % 60;
                nextGameTimerElement.textContent = `Next Wordle in: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                if (data.seconds > 0) {
                    data.seconds--;
                    setTimeout(updateTimer, 1000);
                } else {
                    nextGameTimerElement.textContent = 'New Wordle available now!';
                }
            };
            updateTimer();
        })
        .catch(error => {
            console.error('Error fetching next game time:', error);
        });
}

function resetGame() {
    currentGuess = [];
    guesses = [];
    gameOver = false;
    const rows = gameBoard.getElementsByClassName('word-row');
    for (let row of rows) {
        const letterBoxes = row.getElementsByClassName('letter-box');
        for (let box of letterBoxes) {
            box.textContent = '';
            box.className = 'letter-box';
        }
    }
    const keys = document.getElementsByClassName('key');
    for (let key of keys) {
        key.className = 'key';
    }
    updateGameBoard();
    shareButton.style.display = 'none';
    nextGameTimerElement.textContent = '';
}

function startNewGameDebug() {
    if (!DEBUG_MODE) return;
    
    fetch('/api/debug/new_game', {
        method: 'POST',
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMessage(data.error, true);
        } else {
            showMessage(`New game started. Debug word: ${data.debug_word}`);
            resetGame();
            // Remove the window.location.reload() line
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('An error occurred. Please try again.', true);
    });
}

// Initialize the game
createGameBoard();
createKeyboard();
displayStats();
updateGameBoard();

// Add event listener for physical keyboard
document.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        handleKeyPress('Backspace');
    } else if (e.key === 'Enter') {
        handleKeyPress('Enter');
    } else if (e.key.match(/^[a-zA-Z]$/)) {
        handleKeyPress(e.key.toUpperCase());
    }
});

// Add debug controls
const debugControls = document.getElementById('debug-controls');
const debugToggle = document.getElementById('debug-toggle');
const newGameDebug = document.getElementById('new-game-debug');

debugToggle.addEventListener('click', () => {
    DEBUG_MODE = !DEBUG_MODE;
    showMessage(DEBUG_MODE ? 'Debug mode enabled' : 'Debug mode disabled');
});

newGameDebug.addEventListener('click', startNewGameDebug);

// Show debug controls
debugControls.style.display = 'block';

shareButton.addEventListener('click', () => {
    const shareText = guesses.map(guess => 
        guess.map(({result}) => 
            result === 'correct' ? '🟩' : result === 'present' ? '🟨' : '⬛'
        ).join('')
    ).join('\n');

    navigator.clipboard.writeText(`Wordle Clone ${guesses.length}/${MAX_GUESSES}\n\n${shareText}`).then(() => {
        showMessage('Results copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy results: ', err);
        showMessage('Failed to copy results. Please try again.', true);
    });
});
