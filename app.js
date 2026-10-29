/* De interface bewaart de beurt; Trainer rekent met de zichtbare spelinformatie. */
'use strict';
const { SUITS, RANKS, HAND_SUIT_ORDER, cardKey, legalCards, winner } = Trainer;
const LEVELS = { easy: 3, medium: 5, advanced: 8, expert: 10, hard: 13 };
const SEATS = ['Jij', 'Links', 'Overkant', 'Rechts'];
const SKILLS = { counts: 'Kleuren tellen', cards: 'Kaarten bijhouden', players: 'Spelers volgen', rebuild: 'Slag terugbouwen', apply: 'Informatie toepassen' };
const MODE_COPY = {
  counts: 'Tel de gespeelde kaarten van je gekozen kleuren. Tijdens het spel vragen we hoeveel er nog over zijn.',
  cards: 'Onthoud welke kaarten van je gekozen kleuren vallen. Eerst herkennen, daarna zelf de resterende kaarten aanwijzen.',
  players: 'Let op wie de uitgekomen kleur niet bekent. Alleen dan weet je zeker dat die speler die kleur niet meer heeft.',
  rebuild: 'Onthoud wie welke kaart speelt. Tijdens het spel bouw je een eerdere slag terug op met de vier kaarten.',
  table: 'Volg aantallen, exacte kaarten en spelers tegelijk. Pas je informatie toe en bouw eerdere slagen terug op.',
};
const $ = id => document.getElementById(id);
const readSaved = () => {
  try { const value = JSON.parse(localStorage.getItem('kaartwacht-progress') || '{}'); return value && typeof value === 'object' ? value : {}; } catch { return {}; }
};
const saved = readSaved();
const positiveInteger = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const progress = {
  score: positiveInteger(saved.score), streak: positiveInteger(saved.streak), best: positiveInteger(saved.best),
  skills: Object.fromEntries(Object.keys(SKILLS).map(key => [key, {
    correct: positiveInteger(saved.skills?.[key]?.correct), attempts: positiveInteger(saved.skills?.[key]?.attempts),
  }])),
};
let mode = 'counts';
let tracked = [3];
let game;
let timer;
const pick = list => list[Math.floor(Math.random() * list.length)];
const color = card => [1, 2].includes(card.suit) ? 'red-suit' : 'black-suit';
const suitMarkup = suit => `<span class="suit-icon ${color({ suit })}">${SUITS[suit]}</span>`;
const cardMarkup = card => `<span class="rank">${card.rank}</span><span class="suit">${SUITS[card.suit]}</span>`;
const cardLabel = card => `${card.rank}${SUITS[card.suit]}`;
const showCard = (card, extra = '') => `<span class="playing-card ${color(card)} ${extra}" aria-label="${cardLabel(card)}">${cardMarkup(card)}</span>`;
const skillFor = kind => ({ count: 'counts', recognize: 'cards', cards: 'cards', voids: 'players', canFollow: 'apply', highest: 'apply', rebuild: 'rebuild' })[kind];

function saveProgress() {
  try { localStorage.setItem('kaartwacht-progress', JSON.stringify(progress)); } catch { /* Oefenen werkt ook zonder opslag. */ }
  $('score').textContent = progress.score;
  $('streak').textContent = progress.streak;
  $('best-score').textContent = progress.best;
  $('progress-fill').style.width = `${Math.min(progress.best * 10, 100)}%`;
  $('progress-caption').textContent = `Beste reeks: ${progress.best}`;
  $('skill-progress').innerHTML = Object.entries(SKILLS).map(([key, label]) => {
    const skill = progress.skills[key];
    return `<div class="skill-row"><span>${label}</span><span>${skill.attempts ? `${Math.round(100 * skill.correct / skill.attempts)}% · ${skill.correct}/${skill.attempts}` : '—'}</span></div>`;
  }).join('');
}
function settings() {
  return {
    target: LEVELS[$('difficulty').value], tracked: [...tracked],
    cardStyle: $('card-style').value, ranks: $('rank-range').value,
    scope: $('count-scope').value, help: $('help-toggle').checked, pace: $('pace').value,
  };
}
function renderSettings() {
  const count = Number($('tracked-count').value);
  tracked = tracked.filter(suit => HAND_SUIT_ORDER.includes(suit)).slice(0, count);
  for (const suit of HAND_SUIT_ORDER) if (tracked.length < count && !tracked.includes(suit)) tracked.push(suit);
  $('focus-suits').innerHTML = HAND_SUIT_ORDER.map(suit => `<button type="button" class="suit-toggle ${color({ suit })} ${tracked.includes(suit) ? 'is-selected' : ''}" data-focus="${suit}" aria-label="Volg ${SUITS[suit]}" aria-pressed="${tracked.includes(suit)}" ${count === 4 ? 'disabled' : ''}>${SUITS[suit]}</button>`).join('');
  $('card-settings').hidden = !['cards', 'table'].includes(mode);
  $('scope-settings').hidden = !['counts', 'cards', 'table'].includes(mode);
}
function createRound() {
  clearTimeout(timer);
  renderSettings();
  game = {
    ...settings(), mode, hands: Trainer.deal(), trump: Math.floor(Math.random() * 4),
    turn: 0, phase: 'brief', trick: [], history: [], question: null, response: null,
    nextQuestionAt: Math.min(settings().target - 1, pick([2, 3])),
    previousSuit: null, retry: null, results: [], showReview: false,
  };
  $('focus-title').textContent = mode === 'table' ? 'Aan tafel' : SKILLS[mode];
  $('focus-copy').innerHTML = `${MODE_COPY[mode]}<br><br>Volg ${tracked.map(suitMarkup).join(' ')} · ${game.target} slagen.${game.help ? '<br>De tijdelijke telhulp verdwijnt halverwege en tijdens alle vragen.' : ''}`;
  render();
}
function renderTable() {
  if (game.phase === 'brief') {
    $('played-cards').innerHTML = `<div class="empty-table-message"><span aria-hidden="true">${game.tracked.map(suit => SUITS[suit]).join(' ')}</span><p>${MODE_COPY[game.mode]}</p><small>${game.target} slagen · tussendoor vragen · jouw hand blijft zichtbaar</small></div>`;
    return;
  }
  if (['question', 'feedback'].includes(game.phase)) {
    $('played-cards').innerHTML = '<div class="empty-table-message"><span aria-hidden="true">♠ ♥ ♦ ♣</span><p>De slag is opgeruimd.<br>Wat heb je onthouden?</p></div>';
    return;
  }
  if (game.phase === 'done') {
    $('played-cards').innerHTML = '<div class="empty-table-message"><span aria-hidden="true">✓</span><p>Hand afgerond</p></div>';
    return;
  }
  $('played-cards').innerHTML = SEATS.map((name, player) => {
    const play = game.trick.find(item => item.player === player);
    const active = game.phase === 'play' && game.turn === player;
    return `<div class="seat seat-${player}"><span class="seat-label">${name}${active ? ' <span class="turn-indicator" aria-label="aan de beurt">●</span>' : ''}</span>${play ? showCard(play.card) : '<span class="card-slot" aria-hidden="true">♠</span>'}</div>`;
  }).join('');
}
function renderHand() {
  const legal = legalCards(game.hands[0], game.trick);
  $('hand').innerHTML = game.hands[0].map((card, index) => `<button type="button" class="playing-card hand-card ${color(card)}" data-card="${index}" aria-label="Speel ${cardLabel(card)}" ${game.phase !== 'play' || game.turn !== 0 || !legal.includes(card) ? 'disabled' : ''}>${cardMarkup(card)}</button>`).join('') || '<span class="hand-label">Alle kaarten gespeeld</span>';
}
function renderAid() {
  const visible = game.help && ['play', 'trick'].includes(game.phase) && game.history.length < Math.ceil(game.target / 2);
  $('learning-aid').hidden = !visible;
  if (!visible) return;
  const visibleHistory = game.phase === 'play' && game.trick.length ? [...game.history, { number: game.history.length + 1, plays: game.trick }] : game.history;
  const proof = Trainer.knownVoids(visibleHistory);
  $('learning-aid').innerHTML = `<span>Tijdelijke telhulp · ${game.scope === 'others' ? 'bij de anderen' : 'nog niet gespeeld'} · verdwijnt na ${Math.ceil(game.target / 2)} slagen</span><div>${game.tracked.map(suit => `${suitMarkup(suit)} ${Trainer.remainingCards(visibleHistory, suit, game.hands[0], game.scope).length}`).join(' · ')}</div><small>${[1, 2, 3].map(player => `${SEATS[player]}: ${game.tracked.filter(suit => proof[player][suit] !== null).map(suit => `×${SUITS[suit]}`).join(' ') || '?'}`).join(' · ')}</small>`;
}
function render() {
  renderTable(); renderHand(); renderAid();
  $('scenario').innerHTML = `Troef ${suitMarkup(game.trump)} <span>· Volg ${game.tracked.map(suitMarkup).join(' ')} </span>`;
  $('sequence-count').textContent = `${game.history.length} / ${game.target} slagen · ${game.results.length} vragen`;
  const titles = {
    brief: ['TELOPDRACHT', 'Onthoud wat er valt.'],
    play: [`SLAG ${game.history.length + 1} / ${game.target}`, game.turn === 0 ? 'Jouw beurt.' : `${SEATS[game.turn]} speelt…`],
    trick: [`SLAG ${game.history.length} / ${game.target}`, `${game.turn === 0 ? 'Jij wint' : `${SEATS[game.turn]} wint`} de slag.`],
    question: ['GEHEUGENCHECK', 'Wat weet je nog?'],
    feedback: ['GEHEUGENCHECK', game.lastCorrect ? 'Goed onthouden.' : 'Kijk waar je iets miste.'],
    done: ['HAND AFGEROND', 'Elke slag telt.'],
  };
  [$('round-label').textContent, $('round-title').textContent] = titles[game.phase];
  const hints = {
    brief: 'Lees je opdracht en druk op Start.', play: game.turn === 0 ? 'Beken kleur als je kunt.' : 'De andere spelers spelen automatisch.',
    trick: 'Bekijk de slag en ga verder.', question: 'De eigen hand blijft zichtbaar.', feedback: 'Bekijk de uitleg en speel verder.', done: 'Bekijk je slagen of start een nieuwe hand.',
  };
  $('keyboard-hint').textContent = hints[game.phase];
  $('answer-area').hidden = !['question', 'feedback'].includes(game.phase);
  $('feedback').hidden = game.phase !== 'feedback';
  $('check-button').hidden = !['brief', 'trick', 'question'].includes(game.phase);
  $('check-button').textContent = game.phase === 'brief' ? '▶ Start' : game.phase === 'trick' ? '→ Verder' : 'Controleer ↗';
  $('check-button').disabled = game.phase === 'question' && !responseReady();
  $('next-button').hidden = !['feedback', 'done'].includes(game.phase);
  $('next-button').textContent = game.phase === 'done' ? '↻ Nieuwe hand' : game.history.length === game.target ? '→ Resultaat' : '→ Verder spelen';
  $('review-button').hidden = game.phase !== 'feedback' || !game.question.evidence.length;
  $('review-button').textContent = game.showReview ? '↶ Verberg terugblik' : '↶ Bekijk slag';
  $('history-review').hidden = !game.showReview;
  $('summary').hidden = game.phase !== 'done';
  if (['question', 'feedback'].includes(game.phase)) renderQuestion();
  if (game.phase === 'feedback') renderFeedback();
  if (game.phase === 'done') renderSummary();
}
function startTrick() {
  game.phase = 'play'; game.trick = []; game.showReview = false;
  render(); scheduleBot();
}
function playCard(player, card) {
  if (game.phase !== 'play' || player !== game.turn || !legalCards(game.hands[player], game.trick).includes(card)) return;
  game.hands[player].splice(game.hands[player].indexOf(card), 1);
  game.trick.push({ player, card });
  if (game.trick.length === 4) {
    game.turn = winner(game.trick, game.trump);
    game.history.push({ number: game.history.length + 1, plays: [...game.trick], winner: game.turn });
    game.phase = 'trick'; render(); return;
  }
  game.turn = (player + 1) % 4;
  render(); scheduleBot();
}
function scheduleBot() {
  clearTimeout(timer);
  if (game.phase !== 'play' || game.turn === 0) return;
  const current = game;
  const player = game.turn;
  timer = setTimeout(() => {
    if (game !== current || game.phase !== 'play' || game.turn !== player) return;
    playCard(player, pick(legalCards(game.hands[player], game.trick)));
  }, { slow: 1300, normal: 800, fast: 350 }[game.pace]);
}
function askQuestion() {
  const mixedKinds = ['count', game.cardStyle === 'select' ? 'cards' : 'recognize', 'voids', 'highest', 'canFollow', 'rebuild'];
  const retry = game.retry;
  game.question = Trainer.createQuestion({
    history: game.history, ownHand: game.hands[0], tracked: retry?.suit !== undefined ? [retry.suit] : game.tracked,
    trump: game.trump, mode: game.mode, cardStyle: game.cardStyle, ranks: game.ranks, scope: game.scope,
    kind: retry?.kind || (game.mode === 'table' ? mixedKinds[game.results.length % mixedKinds.length] : undefined),
    previousSuit: retry ? undefined : game.previousSuit,
  });
  game.previousSuit = game.question.suit;
  game.retry = null; game.response = null; game.phase = 'question'; game.showReview = false;
  game.trick = [];
  render();
  $('question-title').focus();
}
function responseReady() {
  if (game.response === null) return false;
  if (game.question.kind === 'rebuild') return game.response.length === 4 && game.response.every(Boolean) && new Set(game.response).size === 4;
  return true;
}
function renderQuestion() {
  const q = game.question;
  const symbol = q.suit !== undefined ? suitMarkup(q.suit) : '';
  const scope = q.scope === 'others' ? 'Alleen bij de andere spelers; trek je eigen hand ook af.' : 'Inclusief de kaarten in je eigen hand.';
  const copy = {
    count: [`Hoeveel ${symbol} zijn nog ${q.scope === 'others' ? 'bij de anderen' : 'niet gespeeld'}?`, scope],
    recognize: [`Is deze kaart nog ${q.scope === 'others' ? 'bij de anderen' : 'in het spel'}?`, scope],
    cards: [`Welke ${symbol} zijn nog ${q.scope === 'others' ? 'bij de anderen' : 'niet gespeeld'}?`, `${scope} Kies alle kaarten die erbij horen.`],
    voids: [`Wie heeft bewezen geen ${symbol} meer?`, 'Kies alleen spelers die deze kleur niet bekenden. Voor de anderen is het onbekend.'],
    canFollow: [`Wie kan ${symbol} zeker niet meer bekennen?`, 'Gebruik wat je hebt gezien; voor de andere spelers weten we het nog niet.'],
    rebuild: [`Bouw slag ${q.record?.number} terug op.`, 'Welke kaart speelde iedere speler? Kies bij elke plek een kaart.'],
    highest: ['Is dit de hoogste overgebleven kaart van deze kleur?', 'Denk aan de kaarten bij de andere spelers. Troef kan deze kaart nog wel verslaan.'],
  };
  $('question-title').innerHTML = copy[q.kind][0];
  $('question-help').textContent = copy[q.kind][1];
  const response = game.response;
  const pressed = selected => `class="answer-option ${selected ? 'is-selected' : ''}" aria-pressed="${selected}"`;
  if (q.kind === 'count') {
    $('question-controls').innerHTML = `<div class="choice-options" role="group" aria-label="Aantal kaarten">${Array.from({ length: 14 }, (_, number) => `<button type="button" data-number="${number}" ${pressed(response === number)}>${number}</button>`).join('')}</div>`;
  } else if (q.kind === 'recognize' || q.kind === 'highest') {
    $('question-controls').innerHTML = `<div class="question-card">${showCard(q.card)}</div><div class="choice-options"><button type="button" data-bool="true" ${pressed(response === true)}>✓ ${q.kind === 'highest' ? 'Ja' : 'Nog over'}</button><button type="button" data-bool="false" ${pressed(response === false)}>× ${q.kind === 'highest' ? 'Nee' : 'Al gespeeld'}</button></div>`;
  } else if (q.kind === 'cards') {
    $('question-controls').innerHTML = `<div class="answer-cards" role="group" aria-label="Selecteer resterende kaarten">${q.options.map(card => `<button type="button" class="playing-card card-choice ${color(card)} ${response?.includes(cardKey(card)) ? 'is-selected' : ''}" data-select-card="${cardKey(card)}" aria-label="${cardLabel(card)}" aria-pressed="${!!response?.includes(cardKey(card))}">${cardMarkup(card)}</button>`).join('')}</div><button type="button" data-none ${pressed(Array.isArray(response) && !response.length)}>Geen van deze</button>`;
  } else if (q.kind === 'voids' || q.kind === 'canFollow') {
    $('question-controls').innerHTML = `<div class="player-options">${[1, 2, 3].map(player => `<button type="button" data-player="${player}" ${pressed(!!response?.includes(player))}>${['', '←', '↑', '→'][player]} ${SEATS[player]}</button>`).join('')}<button type="button" data-none ${pressed(Array.isArray(response) && !response.length)}>Nog niemand bewezen</button></div>`;
  } else if (q.kind === 'rebuild') {
    $('question-controls').innerHTML = `<div class="rebuild-grid">${SEATS.map((name, player) => `<label class="rebuild-seat">${name}<select data-rebuild="${player}" aria-label="Kaart van ${name}"><option value="">Kies kaart</option>${q.options.map(card => `<option value="${cardKey(card)}" ${response?.[player] === cardKey(card) ? 'selected' : ''} ${response?.includes(cardKey(card)) && response[player] !== cardKey(card) ? 'disabled' : ''}>${cardLabel(card)}</option>`).join('')}</select></label>`).join('')}</div>`;
  }
  if (game.phase === 'feedback') $('question-controls').querySelectorAll('button, select').forEach(element => { element.disabled = true; });
}
function answerDescription(q) {
  if (q.kind === 'count') return `${SUITS[q.suit]}: 13 − ${q.seenCount}${q.scope === 'others' ? ` − ${q.ownCount} in je hand` : ''} = ${q.answer}.`;
  if (q.kind === 'recognize') return `${cardLabel(q.card)} is ${q.answer ? (q.scope === 'others' ? 'nog bij een andere speler' : 'nog niet gespeeld') : 'al gespeeld'}.`;
  if (q.kind === 'cards') return `Nog over ${SUITS[q.suit]}: ${q.answer.length ? q.options.filter(card => q.answer.includes(cardKey(card))).map(cardLabel).join(' · ') : 'geen van deze kaarten'}.`;
  if (q.kind === 'voids' || q.kind === 'canFollow') return `${q.answer.length ? `${q.answer.map(player => SEATS[player]).join(' en ')}: bewezen geen ${SUITS[q.suit]} meer.` : `Nog niemand heeft bewezen geen ${SUITS[q.suit]} meer.`} Niet bekennen bewijst het; voor de overige spelers is het onbekend.`;
  if (q.kind === 'highest') return `${cardLabel(q.card)} is ${q.answer ? 'de hoogste overgebleven kaart van deze kleur' : 'nog niet de hoogste: een andere speler heeft een hogere kaart van deze kleur'}.`;
  return `Slag ${q.record.number}: ${SEATS.map((name, player) => `${name} ${cardLabel(q.record.plays.find(play => play.player === player).card)}`).join(' · ')}.`;
}
function submitAnswer() {
  if (game.phase !== 'question' || !responseReady()) return;
  const q = game.question;
  const correct = Trainer.evaluateQuestion(q, game.response);
  const skill = progress.skills[skillFor(q.kind)];
  skill.attempts++; if (correct) skill.correct++;
  if (correct) { progress.score++; progress.streak++; progress.best = Math.max(progress.best, progress.streak); } else progress.streak = 0;
  game.results.push({ kind: q.kind, correct, number: game.history.length });
  game.lastCorrect = correct;
  game.retry = correct ? null : { kind: q.kind, ...(q.suit !== undefined ? { suit: q.suit } : {}) };
  game.nextQuestionAt = game.history.length + (game.target <= 5 ? pick([1, 2]) : pick([2, 3]));
  game.showReview = !correct && !!q.evidence.length;
  game.phase = 'feedback';
  saveProgress(); render();
}
function evidenceMarkup(records) {
  const q = game.phase === 'feedback' ? game.question : null;
  return records.map(record => `<div class="evidence-trick"><span>Slag ${record.number} · ${SEATS[record.winner]} wint</span><div class="evidence-cards">${record.plays.map(play => {
    const offSuit = record.plays[0].card.suit === q?.suit && play.card.suit !== q.suit;
    const highlight = q && ((['voids', 'canFollow'].includes(q.kind) && offSuit) || (['count', 'recognize', 'cards', 'highest'].includes(q.kind) && play.card.suit === q.suit) || (q.kind === 'rebuild' && game.response[play.player] !== cardKey(play.card)));
    return `<div class="evidence-play ${highlight ? 'proof-highlight' : ''}"><small>${SEATS[play.player]}${offSuit && ['voids', 'canFollow'].includes(q?.kind) ? ' · niet bekend' : ''}</small>${showCard(play.card)}</div>`;
  }).join('')}</div></div>`).join('');
}
function renderFeedback() {
  const q = game.question;
  $('feedback').classList.toggle('is-wrong', !game.lastCorrect);
  $('feedback').textContent = `${game.lastCorrect ? '✓ Goed onthouden!' : '↺ Nog even oefenen.'} ${answerDescription(q)}${!game.lastCorrect ? (game.history.length < game.target ? ' Deze vaardigheid komt later terug.' : ' Oefen deze vaardigheid opnieuw in een volgende hand.') : ''}`;
  if (game.showReview) $('history-review').innerHTML = `<h3>Zo ging het</h3><div class="evidence-list">${evidenceMarkup(q.evidence)}</div>`;
}
function finishRound() {
  game.phase = 'done'; game.showReview = true;
  render();
}
function renderSummary() {
  const correct = game.results.filter(result => result.correct).length;
  $('session-summary').innerHTML = `<div class="summary-grid"><div><strong>${game.history.length}</strong><span>slagen gespeeld</span></div><div><strong>${correct}/${game.results.length}</strong><span>vragen goed</span></div></div>${Object.entries(SKILLS).map(([key, label]) => {
    const results = game.results.filter(result => skillFor(result.kind) === key);
    return results.length ? `<div class="skill-row"><span>${label}</span><span>${results.filter(result => result.correct).length}/${results.length}</span></div>` : '';
  }).join('')}<p>Oefen eerst één kleur en breid uit naar twee en vier. Je scores per vaardigheid blijven bewaard.</p>`;
  $('history-review').innerHTML = `<h3>Jouw gespeelde slagen</h3><div class="evidence-list">${evidenceMarkup(game.history)}</div>`;
}
$('check-button').addEventListener('click', () => {
  if (game.phase === 'question') return submitAnswer();
  if (game.phase === 'brief') return startTrick();
  if (game.phase === 'trick') {
    if (game.history.length >= game.nextQuestionAt || game.history.length === game.target) askQuestion();
    else startTrick();
  }
});
$('next-button').addEventListener('click', () => {
  if (game.phase === 'done') return createRound();
  if (game.phase === 'feedback') game.history.length === game.target ? finishRound() : startTrick();
});
$('review-button').addEventListener('click', () => { if (game.phase === 'feedback') { game.showReview = !game.showReview; render(); } });
$('hand').addEventListener('click', event => {
  const button = event.target.closest('[data-card]');
  if (!button || button.disabled || game.phase !== 'play' || game.turn !== 0) return;
  playCard(0, game.hands[0][Number(button.dataset.card)]);
});
$('question-controls').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled || game.phase !== 'question') return;
  if (button.dataset.number !== undefined) game.response = Number(button.dataset.number);
  else if (button.dataset.bool !== undefined) game.response = button.dataset.bool === 'true';
  else if (button.hasAttribute('data-none')) game.response = [];
  else {
    const value = button.dataset.selectCard ?? Number(button.dataset.player);
    const selected = new Set(game.response || []);
    selected.has(value) ? selected.delete(value) : selected.add(value);
    game.response = [...selected];
  }
  const focusSelector = button.dataset.number !== undefined ? `[data-number="${button.dataset.number}"]`
    : button.dataset.bool !== undefined ? `[data-bool="${button.dataset.bool}"]`
    : button.hasAttribute('data-none') ? '[data-none]'
    : button.dataset.selectCard !== undefined ? `[data-select-card="${button.dataset.selectCard}"]`
    : `[data-player="${button.dataset.player}"]`;
  renderQuestion(); $('check-button').disabled = !responseReady();
  $('question-controls').querySelector(focusSelector)?.focus({ preventScroll: true });
});
$('question-controls').addEventListener('change', event => {
  const select = event.target.closest('[data-rebuild]');
  if (!select || game.phase !== 'question') return;
  game.response ||= Array(4).fill(''); game.response[Number(select.dataset.rebuild)] = select.value;
  renderQuestion(); $('check-button').disabled = !responseReady();
  $('question-controls').querySelector(`[data-rebuild="${select.dataset.rebuild}"]`)?.focus({ preventScroll: true });
});
$('focus-suits').addEventListener('click', event => {
  const button = event.target.closest('[data-focus]');
  if (!button || button.disabled) return;
  const suit = Number(button.dataset.focus);
  if (!tracked.includes(suit)) { tracked = [...tracked.slice(1), suit]; createRound(); }
});
for (const id of ['difficulty', 'tracked-count', 'card-style', 'rank-range', 'count-scope', 'help-toggle', 'pace']) $(id).addEventListener('change', createRound);
document.querySelectorAll('.mode-tab').forEach(tab => tab.addEventListener('click', () => {
  mode = tab.dataset.mode;
  if (mode === 'table') { $('tracked-count').value = '4'; $('rank-range').value = 'all'; }
  document.querySelectorAll('.mode-tab').forEach(button => { button.classList.toggle('is-active', button === tab); button.setAttribute('aria-pressed', String(button === tab)); });
  createRound();
}));
saveProgress(); createRound();
