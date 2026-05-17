// State
let currentGameId = null;
let currentPlayerId = null;
let currentPlayerName = null;
let currentQuestions = [];
let currentQuestionIndex = 0;

const API_BASE = '';
let liveRankingInterval = null;
let lastAdminGameId = null;

// --- Navigation ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showHome() {
    stopLiveRanking();
    currentGameId = null;
    currentPlayerId = null;
    currentPlayerName = null;
    currentQuestions = [];
    currentQuestionIndex = 0;
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

function showRankingAdmin() {
    if (lastAdminGameId) {
        showRanking(lastAdminGameId);
    } else {
        alert('Primero crea un juego');
    }
}

// --- Dynamic Options ---
function updateOptionFields() {
    const count = parseInt(document.getElementById('options-count').value);
    const grid = document.getElementById('options-grid');
    const correctSelect = document.getElementById('correct-option');

    grid.innerHTML = '';
    correctSelect.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'option-input';
        input.placeholder = 'Opcion ' + (i + 1);
        input.dataset.index = i;
        input.required = true;
        grid.appendChild(input);

        const option = document.createElement('option');
        option.value = i;
        option.textContent = 'Opcion ' + (i + 1);
        correctSelect.appendChild(option);
    }
}

document.getElementById('options-count').addEventListener('change', updateOptionFields);

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

        lastAdminGameId = game.id;
        currentGameId = game.id;
        document.getElementById('display-join-code').textContent = game.joinCode;
        document.getElementById('display-game-id').textContent = 'ID: ' + game.id;
        document.getElementById('questions-list').innerHTML = '<p class="empty-state">No hay preguntas aun. Agrega la primera.</p>';
        document.getElementById('question-form').reset();
        updateOptionFields();
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

    if (!valid || options.length < 2) {
        alert('Debe haber al menos 2 opciones con texto');
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
        updateOptionFields();
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
        const optionsSummary = q.options ? q.options.join(', ') : '';
        html += '<div class="question-item">' +
            '<div class="q-text">' + (idx + 1) + '. ' + escapeHtml(q.text) +
            '<span class="q-options-preview"> [' + escapeHtml(optionsSummary) + ']</span>' +
            '</div>' +
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
        showRanking(currentGameId);
        return;
    }

    const q = currentQuestions[currentQuestionIndex];
    const total = currentQuestions.length;

    document.getElementById('question-counter').textContent = 'Pregunta ' + (currentQuestionIndex + 1) + ' / ' + total;
    document.getElementById('current-question').textContent = q.text;

    const progress = (currentQuestionIndex / total) * 100;
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

        // Show correct/incorrect styling
        btns.forEach(function (b, idx) {
            if (idx === selectedIndex && answer.correct) {
                b.classList.add('correct');
            } else if (idx === selectedIndex && !answer.correct) {
                b.classList.add('incorrect');
            } else if (answer.correctOptionText && q.options[idx] === answer.correctOptionText) {
                b.classList.add('reveal');
            }
        });

        const feedback = document.getElementById('answer-feedback');
        if (answer.correct) {
            feedback.textContent = 'Correcto!';
            feedback.className = 'feedback correct';
        } else {
            const correctText = answer.correctOptionText || '?';
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

// --- Ranking ---
async function showRanking(gameId) {
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

// --- Live Ranking ---
function showLiveRankingForm() {
    stopLiveRanking();
    document.getElementById('live-ranking-form').reset();
    document.getElementById('live-ranking-content').classList.add('hidden');
    document.getElementById('live-ranking-body').innerHTML = '';
    document.getElementById('live-ranking-empty').classList.add('hidden');
    document.getElementById('live-game-info').textContent = '';
    document.getElementById('live-join-code').value = '';
    showScreen('screen-live-ranking');
}

document.getElementById('live-ranking-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const joinCode = document.getElementById('live-join-code').value.trim().toUpperCase();
    if (!joinCode) return;

    await startLiveRanking(joinCode);
});

async function startLiveRanking(joinCode) {
    stopLiveRanking();

    // Resolve join code to game ID
    try {
        const gameRes = await fetch(API_BASE + '/api/games');
        if (!gameRes.ok) throw new Error('Error al obtener juegos');
        const games = await gameRes.json();
        const game = games.find(g => g.joinCode === joinCode);
        if (!game) {
            alert('Codigo de union invalido');
            return;
        }

        const gameId = game.id;
        document.getElementById('live-game-info').textContent = 'Juego: ' + game.name + ' (Codigo: ' + game.joinCode + ')';
        document.getElementById('live-ranking-content').classList.remove('hidden');

        // Initial load
        await fetchAndRenderLiveRanking(gameId);

        // Auto-refresh every 3 seconds
        liveRankingInterval = setInterval(function () {
            fetchAndRenderLiveRanking(gameId);
        }, 3000);

    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function fetchAndRenderLiveRanking(gameId) {
    const tbody = document.getElementById('live-ranking-body');
    const empty = document.getElementById('live-ranking-empty');

    try {
        const res = await fetch(API_BASE + '/api/games/' + gameId + '/ranking');
        if (!res.ok) return;
        const ranking = await res.json();

        tbody.innerHTML = '';
        empty.classList.add('hidden');

        if (ranking.length === 0) {
            empty.classList.remove('hidden');
            return;
        }

        ranking.forEach(function (entry, index) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + (index + 1) + '</td>' +
                '<td>' + escapeHtml(entry.playerName) + '</td>' +
                '<td>' + entry.score + '</td>';
            tbody.appendChild(tr);
        });
    } catch (err) {
        // Silently fail on refresh errors
    }
}

function stopLiveRanking() {
    if (liveRankingInterval) {
        clearInterval(liveRankingInterval);
        liveRankingInterval = null;
    }
}

// --- Utilities ---
function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// Init
updateOptionFields();
