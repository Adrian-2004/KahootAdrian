// State
let currentGameId = null;
let currentPlayerId = null;
let currentPlayerName = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let lastAdminGameId = null;
let liveInterval = null;

const API_BASE = '';

// --- Auth State ---
function getToken() { return localStorage.getItem('kahoot_token'); }
function getUsername() { return localStorage.getItem('kahoot_username'); }
function getUserId() { return localStorage.getItem('kahoot_userId'); }

function setAuth(token, userId, username) {
    localStorage.setItem('kahoot_token', token);
    localStorage.setItem('kahoot_userId', userId);
    localStorage.setItem('kahoot_username', username);
}

function clearAuth() {
    localStorage.removeItem('kahoot_token');
    localStorage.removeItem('kahoot_userId');
    localStorage.removeItem('kahoot_username');
}

function isLoggedIn() { return !!getToken(); }

// --- Navigation ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function showHome() {
    stopLiveRefresh();
    currentGameId = null;
    currentPlayerId = null;
    currentPlayerName = null;
    currentQuestions = [];
    currentQuestionIndex = 0;
    updateUserStatus();
    showScreen('screen-home');
}

function updateUserStatus() {
    const el = document.getElementById('user-status');
    if (isLoggedIn()) {
        el.innerHTML = 'Conectado como <strong>' + escapeHtml(getUsername()) + '</strong> | <a href="#" onclick="logout()">Cerrar sesion</a>';
    } else {
        el.innerHTML = '';
    }
}

function logout() {
    clearAuth();
    showHome();
}

function showLogin() { showScreen('screen-login'); }
function showRegister() { showScreen('screen-register'); }

function handleCreateGame() {
    if (!isLoggedIn()) {
        showLogin();
    } else {
        document.getElementById('create-form').reset();
        showScreen('screen-create');
    }
}

function showRankingAdmin() {
    if (lastAdminGameId) {
        showRanking(lastAdminGameId);
    } else {
        alert('Primero crea un juego');
    }
}

// --- Auth ---
document.getElementById('login-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        const res = await fetch(API_BASE + '/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Credenciales invalidas');
        }
        const data = await res.json();
        setAuth(data.token, data.userId, data.username);
        document.getElementById('game-name').focus();
        showScreen('screen-create');
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

document.getElementById('register-form').addEventListener('submit', async function (e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm').value;

    if (password !== confirm) {
        alert('Las contrasenas no coinciden');
        return;
    }

    try {
        const res = await fetch(API_BASE + '/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Error al registrarse');
        }
        const data = await res.json();
        setAuth(data.token, data.userId, data.username);
        document.getElementById('game-name').focus();
        showScreen('screen-create');
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getToken()
            },
            body: JSON.stringify({ name })
        });

        if (res.status === 401) {
            clearAuth();
            showLogin();
            return;
        }
        if (!res.ok) throw new Error('Error al crear el juego');

        const game = await res.json();
        lastAdminGameId = game.id;
        currentGameId = game.id;
        document.getElementById('display-join-code').textContent = game.joinCode;
        document.getElementById('display-game-id').textContent = 'ID: ' + game.id + ' | Autor: ' + game.authorUsername;
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
            body: JSON.stringify({ text, options, correctOptionIndex })
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
        html += '<div class="question-item">' +
            '<span class="q-text">' + (idx + 1) + '. ' + escapeHtml(q.text) + '</span>' +
            '<div class="q-actions"><button onclick="deleteQuestion(\'' + q.id + '\')">Eliminar</button></div>' +
            '</div>';
    });
    container.innerHTML = html;
}

async function deleteQuestion(questionId) {
    const gameId = currentGameId;
    if (!gameId) return;
    try {
        const res = await fetch(API_BASE + '/api/games/' + gameId + '/questions/' + questionId, { method: 'DELETE' });
        if (!res.ok) throw new Error('Error al eliminar pregunta');
        const game = await res.json();
        renderQuestions(game.questions);
    } catch (err) {
        alert('Error al eliminar pregunta: ' + err.message);
    }
}

// --- Game Browser ---
async function showGameBrowser() {
    document.getElementById('browser-join-code').value = '';
    document.getElementById('browser-ranking-result').classList.add('hidden');
    document.getElementById('game-list').innerHTML = '<p class="empty-state">Cargando juegos...</p>';
    showScreen('screen-browser');
    await loadGames();
}

async function loadGames(name, author) {
    const container = document.getElementById('game-list');
    try {
        let url = API_BASE + '/api/games';
        const params = [];
        if (name) params.push('name=' + encodeURIComponent(name));
        if (author) params.push('author=' + encodeURIComponent(author));
        if (params.length) url += '?' + params.join('&');

        const res = await fetch(url);
        if (!res.ok) throw new Error('Error al cargar juegos');
        const games = await res.json();

        if (games.length === 0) {
            container.innerHTML = '<p class="empty-state">No se encontraron juegos.</p>';
            return;
        }

        let html = '';
        games.forEach(function (g) {
            html += '<div class="game-card" onclick="showJoinGame(\'' + g.id + '\', \'' + escapeHtml(g.name) + '\')">' +
                '<div class="game-card-name">' + escapeHtml(g.name) + '</div>' +
                '<div class="game-card-author">Por ' + escapeHtml(g.authorUsername || 'anonimo') +
                ' | Codigo: ' + g.joinCode + '</div>' +
                '<div class="game-card-questions">' + (g.questions ? g.questions.length : 0) + ' preguntas</div>' +
                '</div>';
        });
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<p class="empty-state">Error al cargar juegos.</p>';
    }
}

function searchGames() {
    const name = document.getElementById('search-title').value.trim();
    const author = document.getElementById('search-author').value.trim();
    loadGames(name || null, author || null);
}

// --- Join Game from browser ---
function showJoinGame(gameId, gameName) {
    const playerName = prompt('Ingresa tu nombre para unirte a "' + gameName + '":');
    if (!playerName || !playerName.trim()) return;
    joinGameById(gameId, playerName.trim());
}

async function joinGameById(gameId, playerName) {
    try {
        const gameRes = await fetch(API_BASE + '/api/games/' + gameId);
        if (!gameRes.ok) throw new Error('Error al obtener el juego');
        const game = await gameRes.json();

        if (!game.questions || game.questions.length === 0) {
            alert('El juego aun no tiene preguntas.');
            return;
        }

        // Need to get the join code to use the join endpoint
        const joinRes = await fetch(API_BASE + '/api/games/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joinCode: game.joinCode, name: playerName })
        });
        if (!joinRes.ok) {
            const err = await joinRes.json();
            throw new Error(err.error || 'Error al unirse');
        }

        const player = await joinRes.json();
        currentPlayerId = player.id;
        currentPlayerName = playerName;
        currentGameId = player.gameId;
        currentQuestions = game.questions;
        currentQuestionIndex = 0;
        startPlaying();
    } catch (err) {
        alert(err.message);
    }
}

// --- Join by code (also used for live ranking) ---
async function searchRankingByCode() {
    const joinCode = document.getElementById('browser-join-code').value.trim().toUpperCase();
    if (!joinCode) return;

    try {
        const res = await fetch(API_BASE + '/api/games');
        if (!res.ok) throw new Error('Error');
        const games = await res.json();
        const game = games.find(g => g.joinCode === joinCode);
        if (!game) {
            alert('Codigo de juego invalido');
            return;
        }

        document.getElementById('browser-game-info').textContent = 'Juego: ' + game.name;
        document.getElementById('browser-ranking-result').classList.remove('hidden');
        await refreshRankingByCode(game.id);
        stopLiveRefresh();
        liveInterval = setInterval(function () { refreshRankingByCode(game.id); }, 3000);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function refreshRankingByCode(gameId) {
    const tbody = document.getElementById('browser-ranking-body');
    try {
        const res = await fetch(API_BASE + '/api/games/' + gameId + '/ranking');
        if (!res.ok) return;
        const ranking = await res.json();
        tbody.innerHTML = '';
        ranking.forEach(function (entry, index) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + (index + 1) + '</td><td>' + escapeHtml(entry.playerName) + '</td><td>' + entry.score + '</td>';
            tbody.appendChild(tr);
        });
    } catch (_) { }
}

function stopLiveRefresh() {
    if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
}

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
    document.getElementById('progress-bar').style.width = (currentQuestionIndex / total) * 100 + '%';

    const container = document.getElementById('options-container');
    container.innerHTML = '';
    q.options.forEach(function (opt, idx) {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.dataset.index = idx;
        btn.addEventListener('click', function () { submitAnswer(q.id, idx); });
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
            const err = await res.json();
            throw new Error(err.error || 'Error al enviar respuesta');
        }
        const answer = await res.json();
        const q = currentQuestions[currentQuestionIndex];

        btns.forEach(function (b, idx) {
            if (idx === selectedIndex && answer.correct) b.classList.add('correct');
            else if (idx === selectedIndex && !answer.correct) b.classList.add('incorrect');
            else if (answer.correctOptionText && q.options[idx] === answer.correctOptionText) b.classList.add('reveal');
        });

        const feedback = document.getElementById('answer-feedback');
        if (answer.correct) {
            feedback.textContent = 'Correcto!';
            feedback.className = 'feedback correct';
        } else {
            feedback.textContent = 'Incorrecto. La respuesta correcta era: ' + (answer.correctOptionText || '?');
            feedback.className = 'feedback incorrect';
        }
        currentQuestionIndex++;
        setTimeout(function () { showQuestion(); }, 1800);
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
        if (!res.ok) throw new Error('Error');
        const ranking = await res.json();
        if (ranking.length === 0) {
            empty.classList.remove('hidden');
            return;
        }
        ranking.forEach(function (entry, index) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td>' + (index + 1) + '</td><td>' + escapeHtml(entry.playerName) + '</td><td>' + entry.score + '</td>';
            tbody.appendChild(tr);
        });
    } catch (_) {
        empty.textContent = 'Error al cargar la clasificacion';
        empty.classList.remove('hidden');
    }
}

// --- Utilities ---
function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

// --- Init ---
updateUserStatus();
updateOptionFields();
