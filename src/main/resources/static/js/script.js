alert('JS loaded - v11');

// State
var state = {
    currentGameId: null,
    currentPlayerId: null,
    currentPlayerName: null,
    currentQuestions: [],
    currentQuestionIndex: 0,
    lastAdminGameId: null,
    liveInterval: null
};

var API_BASE = '';

// --- Auth State ---
function getToken() { return localStorage.getItem('k_token'); }
function getUsername() { return localStorage.getItem('k_user'); }
function getUserId() { return localStorage.getItem('k_id'); }

function setAuth(token, userId, username) {
    localStorage.setItem('k_token', token);
    localStorage.setItem('k_id', userId);
    localStorage.setItem('k_user', username);
}

function clearAuth() {
    localStorage.removeItem('k_token');
    localStorage.removeItem('k_id');
    localStorage.removeItem('k_user');
}

function isLoggedIn() { return !!getToken(); }

function $(id) { return document.getElementById(id); }

// --- Navigation Ultra-Limpia ---
function showScreen(screenId) {
    stopLiveRefresh(); // Paramos cualquier bucle activo por seguridad
    
    // Ocultamos todas las pantallas de clase .screen de golpe
    document.querySelectorAll('.screen').forEach(function (s) { 
        s.classList.remove('active'); 
        s.style.display = 'none'; 
    });
    
    // Forzamos visibilidad de la pantalla destino
    var el = $(screenId);
    if (el) {
        el.classList.add('active');
        el.style.display = 'block';
    }
}

function showHome() {
    showScreen('screen-home');
}

function showLogin() {
    showScreen('screen-login');
}

function showRegister() {
    showScreen('screen-register');
}

function handleCreateGame() {
    if (!isLoggedIn()) {
        alert("Debes iniciar sesión con tu usuario y contraseña para crear un juego.");
        showLogin();
        return;
    }
    showScreen('screen-create');
}

function showGameBrowser() {
    showScreen('screen-browser');
    loadGames(); 
}

function updateUserStatus() {
    var el = $('user-status');
    if (!el) return;
    if (isLoggedIn()) {
        el.innerHTML = '<span style="color: #ffffff !important; font-weight: bold; background-color: rgba(0,0,0,0.6); padding: 6px 12px; border-radius: 4px; display: inline-block; margin-top: 10px;">Conectado como: <strong>' + escapeHtml(getUsername()) + '</strong></span> | <a href="#" onclick="logout();return false" style="color: #ffc107 !important; font-weight: bold; text-decoration: underline;">Cerrar sesión</a>';
    } else {
        el.innerHTML = '';
    }
}

function logout() {
    clearAuth();
    updateUserStatus();
    showHome();
}

function showRankingAdmin() {
    if (state.lastAdminGameId) {
        showRanking(state.lastAdminGameId);
    } else {
        alert('Primero crea un juego');
    }
}

// --- Auth ---
function initAuth() {
    var loginForm = $('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var username = $('login-username').value.trim();
            var password = $('login-password').value;
            fetch(API_BASE + '/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            }).then(function (r) {
                if (!r.ok) return r.text().then(function (t) { throw new Error(t || 'Credenciales incorrectas'); });
                return r.json();
            }).then(function (data) {
                if (data && (data.token || data.accessToken)) {
                    setAuth(data.token || data.accessToken, data.userId || data.id, data.username || username);
                    updateUserStatus();
                    showScreen('screen-create');
                } else {
                    throw new Error('Respuesta inválida del servidor.');
                }
            }).catch(function (err) {
                alert('Error: ' + err.message);
            });
        });
    }

    var regForm = $('register-form');
    if (regForm) {
        regForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var username = $('reg-username').value.trim();
            var password = $('reg-password').value;
            var confirmVal = $('reg-confirm').value;
            if (password !== confirmVal) {
                alert('Las contraseñas no coinciden');
                return;
            }
            fetch(API_BASE + '/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            }).then(function (r) {
                if (!r.ok) return r.text().then(function (t) { throw new Error(t || 'Error en el registro'); });
                return r.text();
            }).then(function () {
                alert("¡Registro completado! Ahora inicia sesión.");
                showLogin();
            }).catch(function (err) {
                alert('Error: ' + err.message);
            });
        });
    }
}

// --- Create & Manage Games ---
function initCreateGame() {
    var form = $('create-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = $('game-name').value.trim();
        if (!name) return;

        fetch(API_BASE + '/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': getToken()
            },
            body: JSON.stringify({ name: name })
        }).then(function (res) {
            if (res.status === 401) { clearAuth(); updateUserStatus(); showLogin(); return null; }
            if (!res.ok) throw new Error('Error al crear el juego');
            return res.json();
        }).then(function (game) {
            if (!game) return;
            state.lastAdminGameId = game.id;
            state.currentGameId = game.id;
            if ($('display-join-code')) $('display-join-code').textContent = game.joinCode;
            if ($('display-game-id')) $('display-game-id').textContent = 'ID: ' + game.id;
            if ($('questions-list')) $('questions-list').innerHTML = '<p class="empty-state">No hay preguntas aún.</p>';
            if ($('question-form')) $('question-form').reset();
            updateOptionFields();
            showScreen('screen-admin');
        }).catch(function (err) {
            alert(err.message);
        });
    });
}

function searchRankingByCode() {
    var inputEl = $('browser-join-code');
    var joinCode = inputEl ? inputEl.value.trim().toUpperCase() : '';
    
    if (!joinCode) {
        alert('Por favor, introduce un código de juego.');
        return;
    }

    fetch(API_BASE + '/api/games')
        .then(function (res) { if (!res.ok) throw new Error('Error de conexión'); return res.json(); })
        .then(function (games) {
            var game = null;
            for (var i = 0; i < games.length; i++) {
                if (games[i].joinCode && games[i].joinCode.toUpperCase() === joinCode) { game = games[i]; break; }
            }
            if (!game) {
                alert('Código de juego no encontrado.');
                return;
            }
            if ($('browser-game-info')) $('browser-game-info').textContent = 'Juego: ' + game.name;
            var br = $('browser-ranking-result');
            if (br) { br.classList.remove('hidden'); br.style.display = 'block'; }
            
            refreshRankingByCode(game.id);
            state.liveInterval = setInterval(function () { refreshRankingByCode(game.id); }, 3000);
        }).catch(function (err) { alert(err.message); });
}

function refreshRankingByCode(gameId) {
    var tbody = $('browser-ranking-body');
    if (!tbody) return;
    fetch(API_BASE + '/api/games/' + gameId + '/ranking')
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (ranking) {
            if (!ranking) return;
            tbody.innerHTML = '';
            if (ranking.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#aaa;">Sin puntuaciones aún</td></tr>';
                return;
            }
            ranking.forEach(function (entry, idx) {
                var tr = document.createElement('tr');
                tr.innerHTML = '<td>' + (idx + 1) + '</td><td>' + escapeHtml(entry.playerName) + '</td><td>' + entry.score + '</td>';
                tbody.appendChild(tr);
            });
        });
}

function stopLiveRefresh() {
    if (state.liveInterval) { clearInterval(state.liveInterval); state.liveInterval = null; }
}

function loadGames(name, code) {
    var container = $('game-list');
    if (!container) return;
    var url = API_BASE + '/api/games';
    var params = [];
    if (name) params.push('name=' + encodeURIComponent(name));
    if (code) params.push('code=' + encodeURIComponent(code));
    if (params.length) url += '?' + params.join('&');

    fetch(url).then(function (res) { return res.json(); }).then(function (games) {
        if (code) {
            games = games.filter(function(g) { return g.joinCode && g.joinCode.toUpperCase().includes(code.toUpperCase()); });
        }
        if (games.length === 0) { container.innerHTML = '<p class="empty-state">No se encontraron juegos.</p>'; return; }
        var html = '';
        games.forEach(function (g) {
            html += '<div class="game-card" data-gameid="' + g.id + '" data-gamename="' + escapeAttr(g.name) + '">' +
                '<div class="game-card-name">' + escapeHtml(g.name) + '</div>' +
                '<div style="color:#ffc107; font-weight:bold; margin:3px 0;">CÓDIGO: ' + g.joinCode + '</div>' +
                '<div class="game-card-author">Por ' + escapeHtml(g.authorUsername || 'anónimo') + '</div>' +
                '</div>';
        });
        container.innerHTML = html;
        container.querySelectorAll('.game-card').forEach(function (card) {
            card.addEventListener('click', function () { showJoinGame(card.dataset.gameid, card.dataset.gamename); });
        });
    }).catch(function() { container.innerHTML = '<p class="empty-state">Error al cargar.</p>'; });
}

function searchGames() {
    var name = $('search-title') ? $('search-title').value.trim() : '';
    var code = $('search-author') ? $('search-author').value.trim() : '';
    loadGames(name || null, code || null);
}

function showJoinGame(gameId, gameName) {
    var playerName = prompt('Ingresa tu nombre para unirte a "' + gameName + '":');
    if (!playerName || !playerName.trim()) return;
    
    fetch(API_BASE + '/api/games/' + gameId).then(function (res) { return res.json(); }).then(function (game) {
        if (!game.questions || game.questions.length === 0) { alert('El juego no tiene preguntas.'); return; }
        return fetch(API_BASE + '/api/games/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joinCode: game.joinCode, name: playerName.trim() })
        }).then(function (r) { return r.json(); }).then(function (player) {
            state.currentPlayerId = player.id;
            state.currentPlayerName = playerName.trim();
            state.currentGameId = player.gameId;
            state.currentQuestions = game.questions;
            state.currentQuestionIndex = 0;
            showScreen('screen-play');
            showQuestion();
        });
    }).catch(function(e) { alert(e.message); });
}

function showQuestion() {
    if (state.currentQuestionIndex >= state.currentQuestions.length) { showRanking(state.currentGameId); return; }
    var q = state.currentQuestions[state.currentQuestionIndex];
    if ($('question-counter')) $('question-counter').textContent = 'Pregunta ' + (state.currentQuestionIndex + 1) + ' / ' + state.currentQuestions.length;
    if ($('current-question')) $('current-question').textContent = q.text;
    if ($('progress-bar')) $('progress-bar').style.width = (state.currentQuestionIndex / state.currentQuestions.length) * 100 + '%';

    var container = $('options-container');
    if (!container) return; container.innerHTML = '';
    q.options.forEach(function (opt, idx) {
        var btn = document.createElement('button'); btn.className = 'option-btn'; btn.textContent = opt;
        btn.addEventListener('click', function () { submitAnswer(q.id, idx); });
        container.appendChild(btn);
    });
}

function submitAnswer(questionId, selectedIndex) {
    document.querySelectorAll('.option-btn').forEach(function (b) { b.disabled = true; });
    fetch(API_BASE + '/api/games/' + state.currentGameId + '/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: state.currentPlayerId, questionId: questionId, selectedOptionIndex: selectedIndex })
    }).then(function (res) { return res.json(); }).then(function (answer) {
        var feedback = $('answer-feedback');
        if (feedback) {
            feedback.classList.remove('hidden');
            feedback.textContent = answer.correct ? '¡Correcto!' : 'Incorrecto.';
            feedback.className = answer.correct ? 'feedback correct' : 'feedback incorrect';
        }
        state.currentQuestionIndex++;
        setTimeout(function () { if ($('answer-feedback')) $('answer-feedback').classList.add('hidden'); showQuestion(); }, 1800);
    });
}

function showRanking(gameId) {
    showScreen('screen-ranking');
    var tbody = $('ranking-body'); if (tbody) tbody.innerHTML = '';
    fetch(API_BASE + '/api/games/' + gameId + '/ranking').then(function (res) { return res.json(); }).then(function (ranking) {
        ranking.forEach(function (entry, index) {
            var tr = document.createElement('tr');
            tr.innerHTML = '<td>' + (index + 1) + '</td><td>' + escapeHtml(entry.playerName) + '</td><td>' + entry.score + '</td>';
            if (tbody) tbody.appendChild(tr);
        });
    });
}

function updateOptionFields() {
    var count = parseInt($('options-count').value);
    var grid = $('options-grid'); var correctSelect = $('correct-option');
    if (!grid || !correctSelect) return; grid.innerHTML = ''; correctSelect.innerHTML = '';
    for (var i = 0; i < count; i++) {
        var input = document.createElement('input'); input.type = 'text'; input.className = 'option-input'; input.placeholder = 'Opción ' + (i + 1); input.required = true;
        grid.appendChild(input);
        var option = document.createElement('option'); option.value = i; option.textContent = 'Opción ' + (i + 1); correctSelect.appendChild(option);
    }
}

function initOptions() { var el = $('options-count'); if (el) el.addEventListener('change', updateOptionFields); }

function initAddQuestion() {
    var form = $('question-form'); if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var text = $('question-text').value.trim();
        var options = []; document.querySelectorAll('.option-input').forEach(function (input) { options.push(input.value.trim()); });
        var correctOptionIndex = parseInt($('correct-option').value);

        fetch(API_BASE + '/api/games/' + state.currentGameId + '/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, options: options, correctOptionIndex: correctOptionIndex })
        }).then(function (res) { return res.json(); }).then(function (game) {
            var container = $('questions-list'); if (container) container.innerHTML = '';
            game.questions.forEach(function (q, idx) {
                var div = document.createElement('div'); div.className = 'question-item'; div.textContent = (idx + 1) + '. ' + q.text;
                if (container) container.appendChild(div);
            });
            form.reset(); updateOptionFields();
        });
    });
}

function escapeHtml(str) { var div = document.createElement('div'); div.appendChild(document.createTextNode(str)); return div.innerHTML; }
var escapeAttr = function(str) { return String(str).replace(/"/g, '&quot;'); };

function init() { updateUserStatus(); updateOptionFields(); initAuth(); initOptions(); initCreateGame(); initAddQuestion(); }
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }