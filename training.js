/* Spelregels en vragen gebruiken alleen gespeelde slagen en de eigen hand. */
const Trainer = (() => {
  'use strict';

  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const HAND_SUIT_ORDER = [3, 2, 0, 1];
  const cardKey = card => `${card.suit}-${card.rank}`;
  const rankValue = card => RANKS.indexOf(card.rank);
  const cardsInHistory = history => history.flatMap(record => record.plays.map(play => play.card));

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
      const swap = Math.floor(Math.random() * (index + 1));
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function deal() {
    const deck = shuffle(SUITS.flatMap((_, suit) => RANKS.map(rank => ({ rank, suit }))));
    const hands = [0, 1, 2, 3].map(player => deck.slice(player * 13, player * 13 + 13));
    hands[0].sort((first, second) => HAND_SUIT_ORDER.indexOf(first.suit) - HAND_SUIT_ORDER.indexOf(second.suit) || rankValue(second) - rankValue(first));
    return hands;
  }

  function legalCards(hand, trick) {
    const following = trick.length ? hand.filter(card => card.suit === trick[0].card.suit) : [];
    return following.length ? following : [...hand];
  }

  function winner(trick, trump) {
    if (!trick.length) throw new Error('Een lege slag heeft geen winnaar.');
    return trick.reduce((best, play) => {
      if (play.card.suit === best.card.suit) return rankValue(play.card) > rankValue(best.card) ? play : best;
      return play.card.suit === trump ? play : best;
    }).player;
  }

  function remainingCards(history, suit, ownHand = [], scope = 'all') {
    const excluded = new Set(cardsInHistory(history).map(cardKey));
    if (scope === 'others') ownHand.forEach(card => excluded.add(cardKey(card)));
    return RANKS.map(rank => ({ rank, suit })).filter(card => !excluded.has(cardKey(card)));
  }

  function knownVoids(history) {
    const proof = Array.from({ length: 4 }, () => Array(4).fill(null));
    for (const record of history) {
      if (!record.plays.length) continue;
      const ledSuit = record.plays[0].card.suit;
      for (const play of record.plays.slice(1)) {
        if (play.card.suit !== ledSuit && proof[play.player][ledSuit] === null) proof[play.player][ledSuit] = record.number;
      }
    }
    return proof;
  }

  function evidenceFor(history, suit) {
    return history.filter(record => record.plays.some(play => play.card.suit === suit));
  }

  function pick(items) { return items[Math.floor(Math.random() * items.length)]; }

  function rebuildQuestion(history) {
    if (!history.length) throw new Error('Speel eerst een slag voordat je die terugbouwt.');
    const record = pick(history);
    const answer = Array(4);
    record.plays.forEach(play => { answer[play.player] = cardKey(play.card); });
    return { kind: 'rebuild', record, options: shuffle(record.plays.map(play => play.card)), answer, evidence: [record] };
  }

  function createQuestion(settings) {
    const {
      history = [], ownHand = [], tracked = [0], trump = 0,
      mode = 'counts', cardStyle = 'recognize', ranks = 'all', scope = 'all',
      kind: forcedKind, previousSuit,
    } = settings;
    const trackedSuits = [...new Set(tracked)].filter(suit => Number.isInteger(suit) && suit >= 0 && suit < 4);
    if (!trackedSuits.length) trackedSuits.push(trump);
    const availableSuits = trackedSuits.filter(suit => remainingCards(history, suit).length > 0);
    const ownSuits = availableSuits.filter(suit => ownHand.some(card => card.suit === suit));
    let kind = forcedKind;
    if (!kind) {
      if (mode === 'cards') kind = cardStyle === 'select' ? 'cards' : 'recognize';
      else if (mode === 'players') kind = 'voids';
      else if (mode === 'rebuild') kind = 'rebuild';
      else if (mode === 'table') {
        const kinds = ['count', cardStyle === 'select' ? 'cards' : 'recognize', 'voids', 'canFollow', 'rebuild'];
        if (ownSuits.length) kinds.push('highest');
        kind = pick(kinds);
      } else kind = 'count';
    }

    // Aan het einde is "wat is nog over?" altijd nul: oefen dan een eerdere slag.
    if (kind === 'rebuild' || (!availableSuits.length && history.length)) return rebuildQuestion(history);
    if (kind === 'highest' && !ownSuits.length) return rebuildQuestion(history);

    let candidates = kind === 'highest' ? ownSuits : availableSuits;
    // Een bewezen renonce geeft de speler iets concreets om te herinneren.
    // Varieer pas daarna, zodat 'onbekend' geen bekende aanwijzing verdringt.
    if (kind === 'voids' || kind === 'canFollow') {
      const proof = knownVoids(history);
      const withProof = candidates.filter(suit => [1, 2, 3].some(player => proof[player][suit] !== null));
      if (withProof.length) candidates = withProof;
    }
    // Varieer de kleur en geef voorkeur aan kleuren waarvan al kaarten gevallen zijn.
    const different = candidates.filter(suit => suit !== previousSuit);
    if (different.length) candidates = different;
    if (kind === 'count' || kind === 'cards' || kind === 'recognize') {
      const changed = candidates.filter(suit => evidenceFor(history, suit).length > 0);
      if (changed.length) candidates = changed;
    }
    if (!candidates.length) candidates = trackedSuits;
    const suit = pick(candidates);
    const remaining = remainingCards(history, suit, ownHand, scope);
    const evidence = evidenceFor(history, suit);
    const base = { kind, suit, scope, evidence };

    if (kind === 'count') {
      return { ...base, answer: remaining.length, seenCount: 13 - remainingCards(history, suit).length, ownCount: ownHand.filter(card => card.suit === suit).length };
    }

    if (kind === 'cards' || kind === 'recognize') {
      const questionRanks = ranks === 'high' ? ['A', 'K', 'Q', 'J'] : [...RANKS].reverse();
      const options = questionRanks.map(rank => ({ rank, suit }));
      const remainingKeys = new Set(remaining.map(cardKey));
      if (kind === 'cards') return { ...base, options, answer: options.filter(card => remainingKeys.has(cardKey(card))).map(cardKey) };

      const ownKeys = new Set(ownHand.map(cardKey));
      const unseenInHand = options.filter(card => !ownKeys.has(cardKey(card)));
      if (!unseenInHand.length) return history.length ? rebuildQuestion(history) : { ...base, kind: 'count', answer: remaining.length, seenCount: 0, ownCount: ownHand.filter(card => card.suit === suit).length };
      const card = pick(unseenInHand);
      return { ...base, card, answer: remainingKeys.has(cardKey(card)) };
    }

    if (kind === 'voids' || kind === 'canFollow') {
      const proof = knownVoids(history);
      const answer = [1, 2, 3].filter(player => proof[player][suit] !== null);
      const numbers = new Set(answer.map(player => proof[player][suit]));
      return { ...base, answer, evidence: history.filter(record => numbers.has(record.number)) };
    }

    if (kind === 'highest') {
      const card = ownHand.filter(candidate => candidate.suit === suit).reduce((best, candidate) => rankValue(candidate) > rankValue(best) ? candidate : best);
      const outsideHand = remainingCards(history, suit, ownHand, 'others');
      return { ...base, scope: 'others', card, answer: !outsideHand.some(candidate => rankValue(candidate) > rankValue(card)) };
    }

    throw new Error(`Onbekende vraagsoort: ${kind}`);
  }

  function evaluateQuestion(question, response) {
    if (question.kind === 'count') return typeof response === 'number' && Number.isInteger(response) && response === question.answer;
    if (question.kind === 'recognize' || question.kind === 'highest') return typeof response === 'boolean' && response === question.answer;
    if (!Array.isArray(response)) return false;
    if (question.kind === 'rebuild') return response.length === question.answer.length && question.answer.every((key, index) => response[index] === key);
    if (question.kind === 'cards' || question.kind === 'voids' || question.kind === 'canFollow') {
      const selected = new Set(response);
      return selected.size === question.answer.length && question.answer.every(value => selected.has(value));
    }
    return false;
  }

  return { SUITS, RANKS, HAND_SUIT_ORDER, shuffle, deal, cardKey, legalCards, winner, remainingCards, knownVoids, createQuestion, evaluateQuestion };
})();

globalThis.Trainer = Trainer;
if (typeof module !== 'undefined' && module.exports) module.exports = Trainer;
