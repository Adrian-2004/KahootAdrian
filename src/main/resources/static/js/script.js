alert('JS loaded - v10');

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

// --- Navigation ---
function showScreen(screenId) {
    // Oculta todas las pantallas clásicas que usan clases .screen
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); s.style.display = 'none'; });
    
    // Oculta también los bloques alternativos que pusimos antes por seguridad
    const alternativeHomes = [document.getElementById('home-section'), document.getElementById('login-section'), document.getElementById('screen-login'), document.getElementById('screen-register'), document.getElementById('register-section'), document.getElementById('screen-signup'), document.getElementById('screen-create'), document.getElementById('create-section')];
    alternativeHomes.forEach(function(el) { if(el) el.style.display = 'none'; });

    var el = $(screenId);
    if (el) {
        el.classList.add('active');
        el.style.display = 'block'; // Fuerza a que se vea la pantalla solicitada
    }
}

function showHome() {
    showScreen('screen-home');
    // Soporte para IDs antiguos alternativos
    var homeSection = $('home-section');
    if (homeSection) homeSection.style.display = 'block';
}

function updateUserStatus() {
    var el = $('user-status');
    if (!el) return;
    if (isLoggedIn()) {
        el.innerHTML = '<span style="color: #ffffff !important; font-weight: bold; background-color: rgba(0,0,0,0.5); padding: 5px 10px; border-radius: 4px;">Conectado como <strong>' + escapeHtml(getUsername()) + '</strong></span> | <a href="#" onclick="logout();return false" style="color: #ffc107 !important; font-weight: bold;">Cerrar sesión</a>';
    } else {
        el.innerHTML = '';
    }
}

function logout() {
    clearAuth();
    updateUserStatus();
    showHome();
}

function showLogin() {
    showScreen('screen-login');
}

function showRegister() {
    // Busca el ID real de tu pantalla de registro
    var regScreen = $('screen-register') || $('register-section') || $('screen-signup');
    if (regScreen) {
        showScreen(regScreen.id);
    } else {
        console.error("No se encontró el ID de la pantalla de registro.");
    }
}

function handleCreateGame() {
    // Corregido: Ahora comprueba 'k_token' de forma nativa con isLoggedIn()
    if (!isLoggedIn()) {
        alert("Debes iniciar sesión con tu usuario y contraseña para crear un juego.");
        showLogin();
        return;
    }
    
    // Si ya está logueado, vamos directo al creador (formulario del título)
    showScreen('screen-create');
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
                if (!r.ok) {
                    return r.text().then(function (text) { 
                        throw new Error(text || 'Usuario o contraseña incorrectos'); 
                    });
                }
                return r.json();
            }).then(function (data) {
                // Aseguramos guardar los datos correctos del Login
                if (data && (data.token || data.accessToken)) {
                    setAuth(data.token || data.accessToken, data.userId || data.id, data.username || username);
                    updateUserStatus();
                    var gn = $('game-name');
                    if (gn) gn.focus();
                    showScreen('screen-create');
                } else {
                    throw new Error('El servidor no devolvió los datos de sesión esperados.');
                }
            }).catch(function (err) {
                alert('Error al iniciar sesión: ' + err.message);
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
                if (!r.ok) {
                    return r.text().then(function (text) { 
                        throw new Error(text || 'El usuario ya existe o los datos son inválidos'); 
                    });
                }
                // Solución al error de la captura: Leemos primero como texto por si viene vacío
                return r.text();
            }).then(function (text) {
                var data = {};
                if (text) {
                    try { data = JSON.parse(text); } catch(e) { /* Si no es JSON válido, ignoramos */ }
                }
                
                // Si el registro no te loguea automáticamente de forma nativa en el backend,
                // simulamos un login temporal con los datos introducidos para que puedas jugar:
                setAuth(data.token || 'temp_token', data.userId || 'temp_id', data.username || username);
                updateUserStatus();
                
                alert("¡Registro completado con éxito! Bienvenido.");
                showHome();
            }).catch(function (err) {
                alert('Error en el registro: ' + err.message);
            });
        });
    }
}

// --- Dynamic Options ---
function updateOptionFields() {
    var count = parseInt($('options-count').value);
    var grid = $('options-grid');
    var correctSelect = $('correct-option');
    if (!grid || !correctSelect) return;
    grid.innerHTML = '';
    correctSelect.innerHTML = '';
    for (var i = 0; i < count; i++) {
        var input = document.createElement('input');
        input.type = 'text';
        input.className = 'option-input';
        input.placeholder = 'Opcion ' + (i + 1);
        input.dataset.index = i;
        input.required = true;
        grid.appendChild(input);
        var option = document.createElement('option');
        option.value = i;
        option.textContent = 'Opcion ' + (i + 1);
        correctSelect.appendChild(option);
    }
}

function initOptions() {
    var el = $('options-count');
    if (el) el.addEventListener('change', updateOptionFields);
}

// --- Create Game ---
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
            if (res.status === 401) {
                clearAuth();
                updateUserStatus();
                showLogin();
                return null;
            }
            if (!res.ok) throw new Error('Error al crear el juego');
            return res.json();
        }).then(function (game) {
            if (!game) return;
            state.lastAdminGameId = game.id;
            state.currentGameId = game.id;
            var jc = $('display-join-code');
            if (jc) jc.textContent = game.joinCode;
            var gi = $('display-game-id');
            if (gi) gi.textContent = 'ID: ' + game.id + ' | Autor: ' + (game.authorUsername || 'anónimo');
            var ql = $('questions-list');
            if (ql) ql.innerHTML = '<p class="empty-state">No hay preguntas aún. Agrega la primera.</p>';
            var qf = $('question-form');
            if (qf) qf.reset();
            updateOptionFields();
            showScreen('screen-admin');
        }).catch(function (err) {
            alert('Error al crear el juego: ' + err.message);
        });
    });
}

// --- Add Question ---
function initAddQuestion() {
    var form = $('question-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
        e.preventDefault();
        var gameId = state.currentGameId;
        if (!gameId) return;

        var text = $('question-text').value.trim();
        if (!text) return;

        var optionInputs = document.querySelectorAll('.option-input');
        var options = [];
        var valid = true;
        optionInputs.forEach(function (input) {
            var val = input.value.trim();
            if (!val) valid = false;
            options.push(val);
        });
        if (!valid || options.length < 2) {
            alert('Debe haber al menos 2 opciones con texto');
            return;
        }
        var correctOptionIndex = parseInt($('correct-option').value);

        fetch(API_BASE + '/api/games/' + gameId + '/questions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text, options: options, correctOptionIndex: correctOptionIndex })
        }).then(function (res) {
            if (!res.ok) throw new Error('Error al agregar pregunta');
            return res.json();
        }).then(function (game) {
            renderQuestions(game.questions);
            var qf = $('question-form');
            if (qf) qf.reset();
            updateOptionFields();
        }).catch(function (err) {
            alert('Error al agregar pregunta: ' + err.message);
        });
    });
}

function renderQuestions(questions) {
    var container = $('questions-list');
    if (!container) return;
    if (!questions || questions.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay preguntas aún. Agrega la primera.</p>';
        return;
    }
    var html = '';
    questions.forEach(function (q, idx) {
        html += '<div class="question-item">' +
            '<span class="q-text">' + (idx + 1) + '. ' + escapeHtml(q.text) + '</span>' +
            '<div class="q-actions"><button onclick="deleteQuestion(\'' + q.id + '\')">Eliminar</button></div>' +
            '</div>';
    });
    container.innerHTML = html;
}

function deleteQuestion(questionId) {
    var gameId = state.currentGameId;
    if (!gameId) return;
    fetch(API_BASE + '/api/games/' + gameId + '/questions/' + questionId, { method: 'DELETE' })
        .then(function (res) {
            if (!res.ok) throw new Error('Error');
            return res.json();
        })
        .then(function (game) { renderQuestions(game.questions); })
        .catch(function (err) { alert('Error al eliminar pregunta'); });
}

// --- Game Browser ---
function showGameBrowser() {
    var browserScreen = $('screen-browser') || $('browser-section') || $('games-section') || $('game-browser');
    if (browserScreen) {
        showScreen(browserScreen.id);
    } else {
        console.error("Error: No se encontró el ID de la sección del buscador en el HTML.");
        alert("¡Ups! No se encuentra la sección de buscar juegos en el diseño HTML.");
        return; 
    }
    loadGames(); 
}

function loadGames(name, author) {
    var container = $('game-list');
    if (!container) return;
    var url = API_BASE + '/api/games';
    var params = [];
    if (name) params.push('name=' + encodeURIComponent(name));
    if (author) params.push('author=' + encodeURIComponent(author));
    if (params.length) url += '?' + params.join('&');

    fetch(url)
        .then(function (res) {
            if (!res.ok) throw new Error('Error');
            return res.json();
        })
        .then(function (games) {
            if (games.length === 0) {
                container.innerHTML = '<p class="empty-state">No se encontraron juegos.</p>';
                return;
            }
            var html = '';
            games.forEach(function (g) {
                html += '<div class="game-card" data-gameid="' + g.id + '" data-gamename="' + escapeAttr(g.name) + '">' +
                    '<div class="game-card-name">' + escapeHtml(g.name) + '</div>' +
                    '<div class="game-card-author">Por ' + escapeHtml(g.authorUsername || 'anónimo') +
                    ' | Código: ' + g.joinCode + '</div>' +
                    '<div class="game-card-questions">' + (g.questions ? g.questions.length : 0) + ' preguntas</div>' +
                    '</div>';
            });
            container.innerHTML = html;
            container.querySelectorAll('.game-card').forEach(function (card) {
                card.addEventListener('click', function () {
                    showJoinGame(card.dataset.gameid, card.dataset.gamename);
                });
            });
        })
        .catch(function () {
            container.innerHTML = '<p class="empty-state">Error al cargar juegos.</p>';
        });
}

function searchGames() {
    var name = $('search-title') ? $('search-title').value.trim() : '';
    var author = $('search-author') ? $('search-author').value.trim() : '';
    loadGames(name || null, author || null);
}

// --- Join Game from browser ---
function showJoinGame(gameId, gameName) {
    var playerName = prompt('Ingresa tu nombre para unirte a "' + gameName + '":');
    if (!playerName || !playerName.trim()) return;
    joinGameById(gameId, playerName.trim());
}

function joinGameById(gameId, playerName) {
    fetch(API_BASE + '/api/games/' + gameId)
        .then(function (res) {
            if (!res.ok) throw new Error('Error al obtener el juego');
            return res.json();
        })
        .then(function (game) {
            if (!game.questions || game.questions.length === 0) {
                alert('El juego aún no tiene preguntas.');
                return null;
            }
            return fetch(API_BASE + '/api/games/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ joinCode: game.joinCode, name: playerName })
            }).then(function (joinRes) {
                if (!joinRes.ok) return joinRes.json().then(function (d) { throw new Error(d.error || 'Error'); });
                return joinRes.json().then(function (player) {
                    state.currentPlayerId = player.id;
                    state.currentPlayerName = playerName;
                    state.currentGameId = player.gameId;
                    state.currentQuestions = game.questions;
                    state.currentQuestionIndex = 0;
                    startPlaying();
                });
            });
        })
        .catch(function (err) {
            alert(err.message);
        });
}

// --- Join by code ---
function searchRankingByCode() {
    var joinCode = $('browser-join-code') ? $('browser-join-code').value.trim().toUpperCase() : '';
    if (!joinCode) return;

    fetch(API_BASE + '/api/games')
        .then(function (res) {
            if (!res.ok) throw new Error('Error');
            return res.json();
        })
        .then(function (games) {
            var game = null;
            for (var i = 0; i < games.length; i++) {
                if (games[i].joinCode === joinCode) { game = games[i]; break; }
            }
            if (!game) {
                alert('Código de juego inválido');
                return;
            }
            var gi = $('browser-game-info');
            if (gi) gi.textContent = 'Juego: ' + game.name;
            var br = $('browser-ranking-result');
            if (br) br.classList.remove('hidden');
            refreshRankingByCode(game.id);
            stopLiveRefresh();
            state.liveInterval = setInterval(function () { refreshRankingByCode(game.id); }, 3000);
        })
        .catch(function (err) {
            alert('Error: ' + err.message);
        });
}

function refreshRankingByCode(gameId) {
    var tbody = $('browser-ranking-body');
    if (!tbody) return;
    fetch(API_BASE + '/api/games/' + gameId + '/ranking')
        .then(function (res) {
            if (!res.ok) return null;
            return res.json();
        })
        .then(function (ranking) {
            if (!ranking) return;
            tbody.innerHTML = '';
            ranking.forEach(function (entry, index) {
                var tr = document.createElement('tr');
                tr.innerHTML = '<td>' + (index + 1) + '</td><td>' + escapeHtml(entry.playerName) + '</td><td>' + entry.score + '</td>';
                tbody.appendChild(tr);
            });
        })
        .catch(function () { });
}

function stopLiveRefresh() {
    if (state.liveInterval) {
        clearInterval(state.liveInterval);
        state.liveInterval = null;
    }
}

// --- Play ---
function startPlaying() {
    showScreen('screen-play');
    showQuestion();
}

function showQuestion() {
    if (state.currentQuestionIndex >= state.currentQuestions.length) {
        showRanking(state.currentGameId);
        return;
    }
    var q = state.currentQuestions[state.currentQuestionIndex];
    var total = state.currentQuestions.length;
    var qc = $('question-counter');
    if (qc) qc.textContent = 'Pregunta ' + (state.currentQuestionIndex + 1) + ' / ' + total;
    var cq = $('current-question');
    if (cq) cq.textContent = q.text;
    var pb = $('progress-bar');
    if (pb) pb.style.width = (state.currentQuestionIndex / total) * 100 + '%';

    var container = $('options-container');
    if (!container) return;
    container.innerHTML = '';
    q.options.forEach(function (opt, idx) {
        var btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.dataset.index = idx;
        btn.addEventListener('click', function () {
            submitAnswer(q.id, idx);
        });
        container.appendChild(btn);
    });

    var feedback = $('answer-feedback');
    if (feedback) {
        feedback.classList.add('hidden');
        feedback.className = 'feedback hidden';
    }
}

function submitAnswer(questionId, selectedIndex) {
    var btns = document.querySelectorAll('.option-btn');
    btns.forEach(function (b) { b.disabled = true; });

    fetch(API_BASE + '/api/games/' + state.currentGameId + '/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            playerId: state.currentPlayerId,
            questionId: questionId,
            selectedOptionIndex: selectedIndex
        })
    }).then(function (res) {
        if (!res.ok) return res.json().then(function (d) { throw new Error(d.error || 'Error'); });
        return res.json();
    }).then(function (answer) {
        var q = state.currentQuestions[state.currentQuestionIndex];
        btns.forEach(function (b, idx) {
            if (idx === selectedIndex && answer.correct) b.classList.add('correct');
            else if (idx === selectedIndex && !answer.correct) b.classList.add('incorrect');
            else if (answer.correctOptionText && q.options[idx] === answer.correctOptionText) b.classList.add('reveal');
        });
        var feedback = $('answer-feedback');
        if (feedback) {
            if (answer.correct) {
                feedback.textContent = '¡Correcto!';
                feedback.className = 'feedback correct';
            } else {
                feedback.textContent = 'Incorrecto. La respuesta correcta era: ' + (answer.correctOptionText || '?');
                feedback.className = 'feedback incorrect';
            }
        }
        state.currentQuestionIndex++;
        setTimeout(function () { showQuestion(); }, 1800);
    }).catch(function (err) {
        alert(err.message);
        btns.forEach(function (b) { b.disabled = false; });
    });
}

// --- Ranking ---
function showRanking(gameId) {
    showScreen('screen-ranking');
    var tbody = $('ranking-body');
    var empty = $('ranking-empty');
    if (tbody) tbody.innerHTML = '';
    if (empty) empty.classList.add('hidden');

    fetch(API_BASE + '/api/games/' + gameId + '/ranking')
        .then(function (res) {
            if (!res.ok) throw new Error('Error');
            return res.json();
        })
        .then(function (ranking) {
            if (ranking.length === 0) {
                if (empty) empty.classList.remove('hidden');
                return;
            }
            ranking.forEach(function (entry, index) {
                var tr = document.createElement('tr');
                tr.innerHTML = '<td>' + (index + 1) + '</td><td>' + escapeHtml(entry.playerName) + '</td><td>' + entry.score + '</td>';
                if (tbody) tbody.appendChild(tr);
            });
        })
        .catch(function () {
            if (empty) {
                empty.textContent = 'Error al cargar la clasificación';
                empty.classList.remove('hidden');
            }
        });
}

// --- Utilities ---
function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Init ---
function init() {
    updateUserStatus();
    updateOptionFields();
    initAuth();
    initOptions();
    initCreateGame();
    initAddQuestion();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}