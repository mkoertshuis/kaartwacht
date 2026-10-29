const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('./training.js');

const card = (rank, suit) => ({ rank, suit });
const play = (player, rank, suit) => ({ player, card: card(rank, suit) });
const record = (number, plays, trump = 3) => ({ number, plays, winner: T.winner(plays, trump) });

test('dealing makes four unique 13-card hands and sorts own hand ♣ ♦ ♠ ♥ high to low', () => {
  const hands = T.deal();
  assert.deepEqual(hands.map(hand => hand.length), [13, 13, 13, 13]);
  assert.equal(new Set(hands.flat().map(T.cardKey)).size, 52);
  const ordered = hands[0].map(c => T.HAND_SUIT_ORDER.indexOf(c.suit) * 13 + 12 - T.RANKS.indexOf(c.rank));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
});

test('hand sorting supports all 24 color orders in both rank directions without changing cards or inputs', () => {
  const permutations = items => items.length ? items.flatMap((item, index) => permutations(items.filter((_, other) => other !== index)).map(rest => [item, ...rest])) : [[]];
  const ascending = ['2', '10', 'J', 'Q', 'K', 'A'];
  const ranks = ['J', '2', 'A', '10', 'K', 'Q'];
  const hand = Object.freeze([0, 1, 2, 3].flatMap(suit => ranks.map(rank => Object.freeze(card(rank, suit)))));
  const originalKeys = hand.map(T.cardKey);
  const orders = permutations([0, 1, 2, 3]);
  assert.equal(orders.length, 24);
  for (const suitOrder of orders) {
    Object.freeze(suitOrder);
    for (const direction of ['asc', 'desc']) {
      const expectedRanks = direction === 'asc' ? ascending : [...ascending].reverse();
      const expected = suitOrder.flatMap(suit => expectedRanks.map(rank => `${suit}-${rank}`));
      const sorted = T.sortHand(hand, suitOrder, direction);
      assert.deepEqual(sorted.map(T.cardKey), expected);
      assert.notEqual(sorted, hand);
      assert(sorted.every(c => hand.includes(c)));
      assert.deepEqual(hand.map(T.cardKey), originalKeys);
    }
  }
  assert.deepEqual(T.SUITS, ['♠', '♥', '♦', '♣']);
  assert.deepEqual(T.RANKS, ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']);
  assert.deepEqual(T.HAND_SUIT_ORDER, [3, 2, 0, 1]);
});

test('invalid hand color orders and rank directions preserve safe default sorting', () => {
  const hand = [card('10', 1), card('2', 3), card('A', 0), card('Q', 2), card('K', 3), card('2', 1)];
  const expectedDefault = ['3-K', '3-2', '2-Q', '0-A', '1-10', '1-2'];
  assert.deepEqual(T.sortHand(hand).map(T.cardKey), expectedDefault);
  for (const invalid of [null, undefined, [], [0, 1, 2], [0, 1, 2, 2], [0, 1, 2, 4], [0, 1, 2, 3, 4], ['0', 1, 2, 3], [0, 1, 2, undefined], [0, 1, 2, NaN], new Set([0, 1, 2, 3])]) {
    assert.deepEqual(T.sortHand(hand, invalid).map(T.cardKey), expectedDefault);
  }
  for (const direction of [null, undefined, '', 'ascending', 'descending', 'ASC', 1]) {
    assert.deepEqual(T.sortHand(hand, T.HAND_SUIT_ORDER, direction).map(T.cardKey), expectedDefault);
  }
  assert.deepEqual(T.sortHand([], [0, 1, 2, 3], 'asc'), []);
  assert.deepEqual(T.sortHand(hand, null, 'asc').map(T.cardKey), ['3-2', '3-K', '2-Q', '0-A', '1-2', '1-10']);
});

test('follow suit when possible, otherwise every card is legal; input hands stay intact', () => {
  const hand = [card('2', 0), card('A', 0), card('K', 1)];
  assert.deepEqual(T.legalCards(hand, [play(3, 'Q', 0)]), hand.slice(0, 2));
  assert.deepEqual(T.legalCards(hand, [play(3, 'Q', 3)]), hand);
  assert.deepEqual(T.legalCards(hand, []), hand);
  assert.equal(hand.length, 3);
});

test('trick winner respects led suit, every lead player and trump strength', () => {
  assert.equal(T.winner([play(2, '2', 0), play(3, 'A', 1), play(0, 'K', 0), play(1, 'A', 2)], 3), 0);
  assert.equal(T.winner([play(1, 'A', 0), play(2, '2', 3), play(3, 'K', 0), play(0, '3', 3)], 3), 0);
  assert.equal(T.winner([play(3, '10', 3), play(0, 'A', 3), play(1, 'K', 3), play(2, 'Q', 3)], 3), 0);
});

const history = [
  record(1, [play(0, '2', 1), play(1, 'A', 1), play(2, '3', 2), play(3, 'K', 1)]),
  record(2, [play(1, '4', 1), play(2, '4', 2), play(3, '5', 2), play(0, '5', 1)]),
];
const ownHand = [card('7', 1), card('Q', 1), card('A', 0)];

test('remaining cards include own hand by default and exclude it only for other-player scope', () => {
  assert.equal(T.remainingCards(history, 1, ownHand).length, 8);
  assert.equal(T.remainingCards(history, 1, ownHand, 'others').length, 6);
  assert(T.remainingCards(history, 1, ownHand).some(c => c.rank === '7'));
  assert(!T.remainingCards(history, 1, ownHand, 'others').some(c => c.rank === '7'));
  assert(!T.remainingCards(history, 1).some(c => c.rank === 'A'));
});

test('void inference records first failure to follow, never absence from a hidden hand', () => {
  const proof = T.knownVoids(history);
  assert.equal(proof[2][1], 1);
  assert.equal(proof[3][1], 2);
  assert.equal(proof[1][1], null);
  assert.equal(proof[0][1], null);
  assert.equal(proof[2][2], null);
  assert.deepEqual(T.knownVoids([]), Array.from({ length: 4 }, () => Array(4).fill(null)));
});

test('count, exact-card and recognition answers use the requested scope and rank range', () => {
  for (const scope of ['all', 'others']) {
    const settings = { history, ownHand, tracked: [1], scope };
    const count = T.createQuestion({ ...settings, mode: 'counts' });
    assert.equal(count.kind, 'count');
    assert.equal(count.answer, scope === 'all' ? 8 : 6);
    assert.equal(count.seenCount, 5);
    assert.equal(count.ownCount, 2);
    assert(T.evaluateQuestion(count, count.answer));
    assert(!T.evaluateQuestion(count, String(count.answer)));
    assert(!T.evaluateQuestion(count, count.answer + 1));
    for (const ranks of ['high', 'all']) {
      const exact = T.createQuestion({ ...settings, mode: 'cards', cardStyle: 'select', ranks });
      assert.equal(exact.options.length, ranks === 'high' ? 4 : 13);
      const expected = T.remainingCards(history, 1, ownHand, scope).filter(c => ranks !== 'high' || ['A', 'K', 'Q', 'J'].includes(c.rank)).map(T.cardKey);
      assert.deepEqual(new Set(exact.answer), new Set(expected));
      assert(T.evaluateQuestion(exact, [...exact.answer].reverse()));
      assert(!T.evaluateQuestion(exact, [...exact.answer, '1-A']));
      for (let n = 0; n < 20; n++) {
        const recognition = T.createQuestion({ ...settings, mode: 'cards', cardStyle: 'recognize', ranks });
        assert.equal(recognition.kind, 'recognize');
        assert(!ownHand.some(c => T.cardKey(c) === T.cardKey(recognition.card)));
        assert.equal(recognition.answer, expected.includes(T.cardKey(recognition.card)));
        assert(T.evaluateQuestion(recognition, recognition.answer));
        assert(!T.evaluateQuestion(recognition, !recognition.answer));
      }
    }
  }
});

test('player questions identify only opponents proven void and retain the evidence trick', () => {
  for (const kind of ['voids', 'canFollow']) {
    const q = T.createQuestion({ history, ownHand, tracked: [1], mode: 'players', kind });
    assert.deepEqual(q.answer, [2, 3]);
    assert.deepEqual(q.evidence.map(r => r.number), [1, 2]);
    assert(T.evaluateQuestion(q, [3, 2]));
    assert(!T.evaluateQuestion(q, [1, 2, 3]));
  }
  const q = T.createQuestion({ history, ownHand, tracked: [0], mode: 'players' });
  assert.deepEqual(q.answer, []);
  assert(T.evaluateQuestion(q, []));
});

test('highest question distinguishes an unbeatable own suit card from one with higher cards outside hand', () => {
  const top = T.createQuestion({ history, ownHand, tracked: [0], kind: 'highest' });
  assert.equal(top.card.rank, 'A');
  assert.equal(top.answer, true);
  const lower = T.createQuestion({ history, ownHand: [card('7', 1)], tracked: [1], kind: 'highest' });
  assert.equal(lower.answer, false);
  const upgraded = T.createQuestion({ history, ownHand: [card('Q', 1)], tracked: [1], kind: 'highest' });
  assert.equal(upgraded.answer, true); // A and K have already fallen.
});

test('rebuilding checks every player position and retains actual trick order', () => {
  const q = T.createQuestion({ history: [history[1]], mode: 'rebuild' });
  assert.deepEqual(q.record.plays.map(p => p.player), [1, 2, 3, 0]);
  assert.deepEqual(q.answer, ['1-5', '1-4', '2-4', '2-5']);
  assert.equal(new Set(q.options.map(T.cardKey)).size, 4);
  assert(T.evaluateQuestion(q, q.answer));
  assert(!T.evaluateQuestion(q, [...q.answer].reverse()));
  assert(!T.evaluateQuestion(q, q.answer.slice(1)));
});

test('question suit respects training selection and varies across multiple selected colors', () => {
  for (const mode of ['counts', 'cards']) {
    for (let index = 0; index < 20; index++) {
      const q = T.createQuestion({ history, ownHand, tracked: [1, 2], previousSuit: 1, mode });
      assert.equal(q.suit, 2);
    }
  }
});

test('player questions prefer tracked colors with observed proof before suit variation', () => {
  for (const kind of ['voids', 'canFollow']) {
    for (let index = 0; index < 20; index++) {
      const q = T.createQuestion({ history, ownHand, tracked: [1, 2], previousSuit: 1, mode: 'players', kind });
      assert.equal(q.suit, 1);
      assert.deepEqual(q.answer, [2, 3]);
    }
    const noProofTracked = T.createQuestion({ history, ownHand, tracked: [0, 2], previousSuit: 0, mode: 'players', kind });
    assert.equal(noProofTracked.suit, 2);
    assert.deepEqual(noProofTracked.answer, []);
  }
});

test('a full 13-trick game remains legal and offers nontrivial questions through hand end', () => {
  for (let repetition = 0; repetition < 20; repetition++) {
    const hands = T.deal();
    const played = [];
    const trump = repetition % 4;
    let turn = repetition % 4;
    for (let number = 1; number <= 13; number++) {
      const trick = [];
      for (let index = 0; index < 4; index++) {
        const legal = T.legalCards(hands[turn], trick);
        const chosen = legal[Math.floor(Math.random() * legal.length)];
        hands[turn].splice(hands[turn].indexOf(chosen), 1);
        trick.push({ player: turn, card: chosen });
        turn = (turn + 1) % 4;
      }
      turn = T.winner(trick, trump);
      played.push({ number, plays: trick, winner: turn });
      for (const scope of ['all', 'others']) {
        for (let suit = 0; suit < 4; suit++) {
          const actual = (scope === 'others' ? hands.slice(1) : hands).flat().filter(c => c.suit === suit).map(T.cardKey);
          assert.deepEqual(new Set(T.remainingCards(played, suit, hands[0], scope).map(T.cardKey)), new Set(actual));
        }
      }
      const proof = T.knownVoids(played);
      for (let player = 0; player < 4; player++) for (let suit = 0; suit < 4; suit++) {
        if (proof[player][suit] !== null) assert(!hands[player].some(c => c.suit === suit));
      }
      for (const mode of ['counts', 'cards', 'players', 'rebuild', 'table']) {
        const q = T.createQuestion({ history: played, ownHand: hands[0], tracked: [3, 2, 0, 1], mode, cardStyle: number % 2 ? 'recognize' : 'select' });
        assert(T.evaluateQuestion(q, q.answer));
        if (number === 13) assert.equal(q.kind, 'rebuild');
      }
    }
    assert.deepEqual(hands.map(hand => hand.length), [0, 0, 0, 0]);
    assert.equal(new Set(played.flatMap(r => r.plays.map(p => T.cardKey(p.card)))).size, 52);
  }
});
