from flask import Flask, render_template, jsonify, request, session
from datetime import datetime, timedelta
import random
import json

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with a secure secret key in production

# Load words from JSON file
with open('static/words.json', 'r') as f:
    words = json.load(f)

DEBUG_MODE = True

def get_daily_word():
    if DEBUG_MODE and 'debug_word' in session:
        return session['debug_word']
    seed = int(datetime.now().strftime('%Y%m%d'))
    random.seed(seed)
    return random.choice(words).upper()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/check_word', methods=['POST'])
def check_word():
    guess = request.json['guess'].upper()
    target_word = get_daily_word()
    
    if len(guess) != 5 or guess.lower() not in words:
        return jsonify({'error': 'Invalid word'}), 400

    result = []
    for i, letter in enumerate(guess):
        if letter == target_word[i]:
            result.append('correct')
        elif letter in target_word:
            result.append('present')
        else:
            result.append('absent')

    return jsonify({
        'result': result,
        'correct': guess == target_word
    })

@app.route('/api/get_next_game_time')
def get_next_game_time():
    now = datetime.now()
    next_day = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    seconds_until_next_day = (next_day - now).total_seconds()
    return jsonify({'seconds': int(seconds_until_next_day)})

@app.route('/api/debug/new_game', methods=['POST'])
def debug_new_game():
    global DEBUG_MODE
    if DEBUG_MODE:
        new_word = random.choice(words).upper()
        session['debug_word'] = new_word
        return jsonify({'message': 'New game started', 'debug_word': new_word})
    else:
        return jsonify({'error': 'Debug mode is not enabled'}), 403

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
