const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
let currentGuess = [];
let guesses = [];
let gameOver = false;
let currentMode = 'daily';

const gameBoard = document.getElementById('game-board');
const keyboard = document.getElementById('keyboard');
const messageElement = document.getElementById('message');
const shareButton = document.getElementById('share-button');
const newPracticeGameButton = document.getElementById('new-practice-game');
const colorblindToggle = document.getElementById('colorblind-toggle');
const dailyModeButton = document.getElementById('daily-mode');
const practiceModeButton = document.getElementById('practice-mode');

function createGameBoard() {
    console.log('Creating game board');
    gameBoard.innerHTML = ''; // Clear existing content
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
    console.log('Game board created');
}

function updateGameBoard() {
    console.log('Updating game board');
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
    console.log('Game board updated');
}

function toggleColorblindMode() {
    console.log('Toggling colorblind mode');
    document.body.classList.toggle('colorblind-mode');
    localStorage.setItem('colorblind-mode', document.body.classList.contains('colorblind-mode'));
    console.log('Colorblind mode toggled');
}

function toggleMode(mode) {
    currentMode = mode;
    if (mode === 'daily') {
        dailyModeButton.classList.add('active');
        practiceModeButton.classList.remove('active');
        newPracticeGameButton.style.display = 'none';
    } else {
        dailyModeButton.classList.remove('active');
        practiceModeButton.classList.add('active');
        newPracticeGameButton.style.display = 'block';
    }
    resetGame();
}

function resetGame() {
    currentGuess = [];
    guesses = [];
    gameOver = false;
    createGameBoard();
    updateGameBoard();
    showMessage('');
    shareButton.style.display = 'none';
}

function createKeyboard() {
    const keys = [
        ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
        ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
        ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Backspace', 'Enter']
    ];

    keys.forEach((row, i) => {
        const keyboardRow = document.createElement('div');
        keyboardRow.className = 'keyboard-row';
        row.forEach(key => {
            const buttonElement = document.createElement('button');
            if (key === 'Backspace') {
                buttonElement.innerHTML = '&#x232b;'; // Unicode backspace symbol
            } else if (key === 'Enter') {
                buttonElement.innerHTML = '&#x23ce;'; // Unicode return symbol
            } else {
                buttonElement.textContent = key;
            }
            buttonElement.className = 'key';
            if (key === 'Enter' || key === 'Backspace') {
                buttonElement.classList.add('wide-key');
            }
            buttonElement.addEventListener('click', () => handleKeyPress(key));
            keyboardRow.appendChild(buttonElement);
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
    } else if (currentGuess.length < WORD_LENGTH) {
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
        body: JSON.stringify({ guess: guess, mode: currentMode, guesses: guesses }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showMessage(data.error, true);
        } else {
            guesses.push(currentGuess.map((letter, index) => ({
                letter: letter,
                result: data.result[index]
            })));
            currentGuess = [];
            updateGameBoard();
            updateKeyboard(data.result);

            if (data.correct) {
                showMessage('Congratulations! You guessed the word!');
                gameOver = true;
                shareButton.style.display = 'block';
            } else if (guesses.length === MAX_GUESSES) {
                showMessage(`Game over. The word was: ${data.word}`);
                gameOver = true;
                shareButton.style.display = 'block';
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showMessage('An error occurred. Please try again.', true);
    });
}

function updateKeyboard(result) {
    const keys = keyboard.getElementsByClassName('key');
    for (let i = 0; i < currentGuess.length; i++) {
        const keyElement = Array.from(keys).find(key => key.textContent === currentGuess[i]);
        if (keyElement) {
            keyElement.classList.add(result[i]);
        }
    }
}

function showMessage(message, isError = false) {
    messageElement.textContent = message;
    messageElement.className = isError ? 'error-message' : '';
}

// Event listeners
document.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace') {
        handleKeyPress('Backspace');
    } else if (e.key === 'Enter') {
        handleKeyPress('Enter');
    } else if (e.key.match(/^[a-zA-Z]$/)) {
        handleKeyPress(e.key.toUpperCase());
    }
});

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

colorblindToggle.addEventListener('click', toggleColorblindMode);
dailyModeButton.addEventListener('click', () => toggleMode('daily'));
practiceModeButton.addEventListener('click', () => toggleMode('practice'));

newPracticeGameButton.addEventListener('click', () => {
    if (currentMode === 'practice') {
        resetGame();
    }
});

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    createGameBoard();
    createKeyboard();
    updateGameBoard();

    // Load colorblind mode setting from localStorage
    if (localStorage.getItem('colorblind-mode') === 'true') {
        console.log('Applying colorblind mode from localStorage');
        document.body.classList.add('colorblind-mode');
    }

    // Set initial mode
    toggleMode('daily');

    console.log('Game initialization complete');
});
