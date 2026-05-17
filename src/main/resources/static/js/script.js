// State
let currentGameId = null;
let currentPlayerId = null;
let currentPlayerName = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let rankingSource = null;

const API_BASE = '';

function getCurrentGameId() {
    return currentGameId;
}

// --- Navigation ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showHome() {
    currentGameId = null;
    currentPlayerId = null;
    currentPlayerName = null;
    currentQuestions = [];
    currentQuestionIndex = 0;
    rankingSource = null;
    showScreen('screen-home');
}

function showCreateGame() {
    document.getElementById('create-form').reset();
    showScreen('screen-create');
}

function showJoinGame() {
    document.getElementById('join-form').reset();
    showScreen('screen-join');
}

async function showRanking(gameId, source) {
    rankingSource = source;
    const tbody = document.getElementById('ranking-body');
    const empty = document.getElementById('ranking-empty');
    tbody.innerHTML = '';
    empty.classList.add('hidden');
    showScreen('screen-ranking');

    try {
        const res = await fetch(API_BASE + '/api/games/' + gameId + '/ranking');
        if (!res.ok) throw new Error('Error al obtener ranking');
        const ranking = await res.json();

        if (ranking.length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        ranking.forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + (index + 1) + '</td>' +
                '<td>' + escapeHtml(entry.playerName) + '</td>' +
                '<td>' + entry.score + '</td>';
            tbody.appendChild(tr);
        });
    } catch (err) {
        empty.textContent = 'Error al cargar la clasificacion';
        empty.classList.remove('hidden');
    }
}

// --- Create Game ---
document.getElementById('create-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('game-name').value.trim();
    if (!name) return;

    try {
        const res = await fetch(API_BASE + '/api/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });

        if (!res.ok) throw new Error('Error al crear el juego');
        const game = await res.json();

        currentGameId = game.id;
        document.getElementById('display-join-code').textContent = game.joinCode;
        document.getElementById('display-game-id').textContent = 'ID: ' + game.id;
        document.getElementById('questions-list').innerHTML = '<p class="empty-state">No hay preguntas aun. Agrega la primera.</p>';
        document.getElementById('question-form').reset();
        showScreen('screen-admin');
    } catch (err) {
        alert('Error al crear el juego: ' + err.message);
    }
});

// --- Add Question ---
document.getElementById('question-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const gameId = currentGameId;
    if (!gameId) return;

    const text = document.getElementById('question-text').value.trim();
    if (!text) return;

    const optionInputs = document.querySelectorAll('.option-input');
    const options = [];
    let valid = true;
    optionInputs.forEach(function (input) {
        const val = input.value.trim();
        if (!val) valid = false;
        options.push(val);
    });

    if (!valid) {
        alert('Todas las opciones deben tener texto');
        return;
    }

    const correctOptionIndex = parseInt(document.getElementById('correct-option').value);

    try {
        const res = await fetch(API_BASE + '/api/games/' + gameId + '/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                options: options,
                correctOptionIndex: correctOptionIndex
            })
        });

        if (!res.ok) throw new Error('Error al agregar pregunta');
        const game = await res.json();

        renderQuestions(game.questions);
        document.getElementById('question-form').reset();
    } catch (err) {
        alert('Error al agregar pregunta: ' + err.message);
    }
});

function renderQuestions(questions) {
    const container = document.getElementById('questions-list');
    if (!questions || questions.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay preguntas aun. Agrega la primera.</p>';
        return;
    }

    let html = '';
    questions.forEach(function (q, idx) {
        html += '<div class="question-item">' +
            '<span class="q-text">' + (idx + 1) + '. ' + escapeHtml(q.text) + '</span>' +
            '<div class="q-actions">' +
            '<button onclick="deleteQuestion(\'' + q.id + '\')">Eliminar</button>' +
            '</div>' +
            '</div>';
    });
    container.innerHTML = html;
}

async function deleteQuestion(questionId) {
    const gameId = currentGameId;
    if (!gameId) return;

    try {
        const res = await fetch(API_BASE + '/api/games/' + gameId + '/questions/' + questionId, {
            method: 'DELETE'
        });

        if (!res.ok) throw new Error('Error al eliminar pregunta');
        const game = await res.json();
        renderQuestions(game.questions);
    } catch (err) {
        alert('Error al eliminar pregunta: ' + err.message);
    }
}

// --- Join Game ---
document.getElementById('join-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const joinCode = document.getElementById('join-code').value.trim().toUpperCase();
    const playerName = document.getElementById('player-name').value.trim();

    if (!joinCode || !playerName) return;

    try {
        const res = await fetch(API_BASE + '/api/games/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joinCode: joinCode, name: playerName })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Error al unirse al juego');
        }

        const player = await res.json();
        currentPlayerId = player.id;
        currentPlayerName = player.name;
        currentGameId = player.gameId;

        // Fetch game to get questions
        const gameRes = await fetch(API_BASE + '/api/games/' + player.gameId);
        if (!gameRes.ok) throw new Error('Error al obtener el juego');

        const game = await gameRes.json();

        if (!game.questions || game.questions.length === 0) {
            alert('El juego aun no tiene preguntas. Espera a que el creador las agregue.');
            showHome();
            return;
        }

        currentQuestions = game.questions;
        currentQuestionIndex = 0;
        startPlaying();
    } catch (err) {
        alert(err.message);
    }
});

// --- Play ---
function startPlaying() {
    showScreen('screen-play');
    showQuestion();
}

function showQuestion() {
    if (currentQuestionIndex >= currentQuestions.length) {
        showRanking(currentGameId, 'player');
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    const total = currentQuestions.length;

    document.getElementById('question-counter').textContent = 'Pregunta ' + (currentQuestionIndex + 1) + ' / ' + total;
    document.getElementById('current-question').textContent = q.text;

    const progress = ((currentQuestionIndex) / total) * 100;
    document.getElementById('progress-bar').style.width = progress + '%';

    const container = document.getElementById('options-container');
    container.innerHTML = '';

    q.options.forEach(function (opt, idx) {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.dataset.index = idx;
        btn.addEventListener('click', function () {
            submitAnswer(q.id, idx);
        });
        container.appendChild(btn);
    });

    const feedback = document.getElementById('answer-feedback');
    feedback.classList.add('hidden');
    feedback.className = 'feedback hidden';
}

async function submitAnswer(questionId, selectedIndex) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(function (b) { b.disabled = true; });

    try {
        const res = await fetch(API_BASE + '/api/games/' + currentGameId + '/answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                playerId: currentPlayerId,
                questionId: questionId,
                selectedOptionIndex: selectedIndex
            })
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'Error al enviar respuesta');
        }

        const answer = await res.json();
        const q = currentQuestions[currentQuestionIndex];
        const correctIdx = q.correctOptionIndex;

        // Show correct/incorrect styling
        btns.forEach(function (b, idx) {
            if (idx === correctIdx) {
                b.classList.add('reveal');
            }
            if (idx === selectedIndex && idx !== correctIdx) {
                b.classList.add('incorrect');
            }
            if (idx === correctIdx && idx === selectedIndex) {
                b.classList.add('correct');
            }
        });

        const feedback = document.getElementById('answer-feedback');
        if (answer.correct) {
            feedback.textContent = 'Correcto!';
            feedback.className = 'feedback correct';
        } else {
            const correctText = q.options[correctIdx];
            feedback.textContent = 'Incorrecto. La respuesta correcta era: ' + correctText;
            feedback.className = 'feedback incorrect';
        }

        currentQuestionIndex++;

        setTimeout(function () {
            showQuestion();
        }, 1800);
    } catch (err) {
        alert(err.message);
        btns.forEach(function (b) { b.disabled = false; });
    }
}

// --- Utilities ---
function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
