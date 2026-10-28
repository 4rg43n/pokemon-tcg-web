# Turn History Storage — Design

**Date:** 2026-10-28
**Status:** Approved in chat, pending spec review

## Goal

Save the true game state at the start of every turn, plus the moves made during that turn, so a future AI can estimate each player's chance of winning (e.g. with Monte Carlo rollouts) from **that player's information only**. This change covers storage, read-back, and the per-player information filter. The win-chance evaluator itself is out of scope.

## Requirements

- Store the **full true state** each turn: both decks in real order, both hands, both prize sets.
- Each turn record also holds the **actions taken** during that turn (with the actual card played) and the turn's **new log lines**.
- Persist to **localStorage**, **current game only**. A new game or page load clears the previous game's history.
- Storage must be **compact**: roughly 2 KB per turn and flat, rather than growing with the log.
- Provide `viewFor(record, viewer)`, which returns only what `viewer` knows.
- Recording must **never break gameplay**, and the engine must stay free of storage code so future rollouts can call `dispatch()` thousands of times without writing anything.

## Information model (what each player knows)

| Information | Own side | Opponent |
|---|---|---|
| Hand | Exact cards | Count only |
| Deck + Prizes | Combined contents as counts. Order and which cards are prizes are unknown. | Deck count and prize count only |
| Active, Bench (incl. damage, energies, evolution stack) | Exact | Exact |
| Discard | Exact | Exact |
| Turn flags (`attached`, `retreated`, `supporterUsed`), `mulligans` | Exact | Exact |
| Turn's actions and log lines | Exact | Exact (all plays are public) |

As in the real TCG, a player does not know which of their own cards are prizes, so their deck and prizes are merged into one unknown pool.

## Compact snapshot format (`encodeState` / `decodeState`)

A snapshot uses the engine state's shape and field names, with four changes:

1. **Cards become string codes:** `P:<speciesIndex>` (e.g. `P:2`), `E:<type>` (e.g. `E:Fire`), `T:<name>` (e.g. `T:Potion`). These match the engine's `basic()`, `energy()`, and `trainer()` constructors exactly, so decoding is lossless.
2. **In-play Pokémon are slimmed** to `{s, d, e, t, ev, u}`: species index, damage, energies, `playedTurn`, `evolvedThisTurn`, and `under`. Fields at their default value (`0`, `[]`, `false`) are omitted. Species data (name, HP, attacks, …) is restored from `cards.js` on decode.
3. **Derived fields are dropped:** `prizes` (equals `prizeCards.length`) and per-Pokémon `energy` (equals `energies.length`). Both are recomputed on decode.
4. **UI and cumulative fields are dropped:** `log` and `selection`. Decode restores them as `[]` and `null`.

A version field `v: 1` is added at the top level.

```jsonc
{
  "v": 1, "round": 7, "turn": 0, "phase": "playing", "winner": null,
  "players": [
    { "deck": ["E:Fire", "P:4", "T:Potion"],            // real order, top first
      "hand": ["P:2", "E:Lightning"],
      "prizeCards": ["T:Poké Ball"],
      "discard": ["T:Professor's Research"],
      "active": {"s": 2, "d": 30, "e": ["Lightning"], "t": 3},
      "bench": [{"s": 4, "t": 5}],
      "attached": false, "retreated": false, "supporterUsed": false, "mulligans": 0 },
    { /* player 2, same shape */ }
  ]
}
```

**Invariant (tested):** `decodeState(encodeState(s))` deep-equals `s` with `log: []` and `selection: null`.

## Turn records

```jsonc
// localStorage["ptcg.turn.7"]
{
  "n": 7,              // 0 = setup; otherwise equals the engine's `round`
  "player": 0,         // whose turn it is (same as start.turn)
  "start": { /* compact snapshot at turn start, after the draw */ },
  "actions": [
    {"p": 0, "a": "play", "card": "E:Lightning", "target": "active"},
    {"p": 0, "a": "attack", "index": 0}
  ],
  "log": ["Player 1: Attached Lightning Energy to Pikachu."]
}
```

- **Action entries:** `p` is the acting player (`before.turn`) and `a` is the action name. `target`, `slot`, and `index` are copied from the payload only when defined; `slot` and `index` only when they are integers. For `play` and `trainer`, `card` is the code of `before.players[before.turn].hand[before.selection]`.
- **Not recorded:** `select` and `deselect` (UI-only), and any action that returned an error.
- **`log`** holds the log lines added by this turn's actions, oldest first. The engine `unshift`s new lines, so the recorder takes the new entries from the front of `after.log` and reverses them.

### Turn boundaries

After each recorded action, the recorder compares `before` and `after`:

- **Game over** (`after.winner !== null`): save `encodeState(after)` as `final` in the `ptcg.game` key. No new turn record is opened, even if `round` changed (a deck-out happens inside `next()`).
- **New turn** (`after.phase !== "setup"` and either `before.phase === "setup"` or `after.round !== before.round`): open record `n = after.round` with `start = encodeState(after)`.

This covers every way a turn ends:
- `end` and non-KO `attack` → `next()`
- KO `attack` → `replacement` phase → `promote`, which increments `round` and draws
- the second player's `ready` → `playing`

The action that causes a boundary is appended to the record of the turn it ended. A post-KO `promote` therefore sits at the end of the attacker's turn record, tagged with the defender's `p`.

Record `0` is opened by `start(state)` on the freshly dealt game (`phase: "setup"`). Its `log` starts with the dealt game's existing log lines, oldest first, and it collects both players' setup actions.

## localStorage layout and write pattern

| Key | Contents |
|---|---|
| `ptcg.game` | `{v: 1, turns: <record count>, final: <snapshot> \| null}` |
| `ptcg.turn.<n>` | One turn record |

- `start(state)` removes every key beginning with `ptcg.turn.`, then writes `ptcg.game` and `ptcg.turn.0`.
- Each recorded action rewrites only the open record's key (about 2 KB). A new turn also rewrites `ptcg.game`. The whole history is never re-serialized.
- Expected size is about 100 KB for a 40-turn game, far under the browser's ~5 MB per-site limit.

## Error handling

- All storage access is wrapped in `try/catch`. On the first failure (storage full, storage disabled, no `localStorage` global), log one `console.warn` and keep going with the in-memory history. Later failures stay silent.
- The recorder never throws into `act()`. Gameplay is unaffected by storage problems.

## Module API — `src/history.js` (new)

```js
encodeState(state) → snapshot
decodeState(snapshot) → engine state
viewFor(record, viewer) → view            // see below
createRecorder(storage = globalThis.localStorage) → {
  start(state),                            // new game: clear old keys, open record 0
  record(before, after, action, payload),  // call after a successful dispatch
  turns(),                                 // in-memory records (array)
  final(),                                 // final snapshot or null
}
loadHistory(storage = globalThis.localStorage) → {meta, turns} | null
```

Passing `storage` in as a parameter lets tests use a fake. `loadHistory` reads back `ptcg.game` and the `ptcg.turn.*` keys in order. It returns `null` when no game is stored or storage is unavailable.

### `viewFor(record, viewer)`

```jsonc
{
  "n": 7, "player": 0, "viewer": 1,
  "round": 7, "turn": 0, "phase": "playing", "winner": null,
  "me": {
    "hand": ["P:3", "E:Fire"],
    "unknownPool": {"E:Fire": 9, "P:3": 2, "T:Potion": 4},  // deck + prizeCards counts
    "deckCount": 31, "prizeCount": 5,
    "active": {}, "bench": [], "discard": [],
    "attached": false, "retreated": false, "supporterUsed": false, "mulligans": 0
  },
  "opponent": {
    "handCount": 6, "deckCount": 30, "prizeCount": 4,
    "active": {}, "bench": [], "discard": [],
    "attached": false, "retreated": false, "supporterUsed": false, "mulligans": 0
  },
  "actions": [],
  "log": []
}
```

The view is built from `record.start` plus the record's `actions` and `log`. It must contain **no** `deck` or `prizeCards` arrays for either player and **no** opponent `hand`. `active` and `bench` use the compact Pokémon format.

## Integration

- **`src/engine.js`:** export the existing `pokemon`, `basic`, `energy`, and `trainer` helpers so decoding rebuilds identical objects. No behavior change.
- **`src/main.js`:**
  - Create the recorder and call `start(state)` at load.
  - In `act()`, after a successful `dispatch`: call `start(r.state)` if `action === "reset"`, otherwise `record(state, r.state, action, payload)`.
- **Cache-busting:** bump `?v=15` → `?v=16` in `index.html` (stylesheet, script, visible `v15` label), `src/main.js`, and `src/engine.js`. `src/history.js` imports use `?v=16` so the browser loads only one copy of each module.

## Testing

`tests/history.test.js` uses Node's built-in runner (`node:test`, `node:assert`) with no dependencies. It tests:

1. **Round-trip:** `decodeState(encodeState(s))` on a fresh `newGame()` and on a crafted mid-game state (damage, mixed energies, an evolved Pokémon with `under`, `evolvedThisTurn`, set flags, a non-empty discard).
2. **Card codes:** each card kind encodes to the expected code and decodes back.
3. **Turn boundaries:**
   - Setup actions land in record 0.
   - The second `ready` opens record 1.
   - `end` opens the next record.
   - A KO → `promote` opens a new record, and `promote` is tagged with the defender.
   - Game over writes `final` and opens no record.
4. **Filtering:** `select`/`deselect` are not recorded, and the `card` field is resolved from the hand selection.
5. **Storage:**
   - The fake storage receives the `ptcg.game` and `ptcg.turn.<n>` keys.
   - `start()` clears stale turn keys.
   - `loadHistory()` returns records equal to `turns()`.
   - A storage that throws causes no exception, warns once, and leaves the in-memory history intact.
6. **`viewFor`:**
   - The viewer's hand is exact.
   - `unknownPool` counts equal the multiset of `deck + prizeCards`.
   - Neither side exposes `deck` or `prizeCards`, and the opponent's hand is only a count.
   - Public zones match the snapshot.

Tests build states by calling `newGame()`/`dispatch()` and by editing state directly for the KO and evolution cases.

**Runner:** Node isn't available in the assistant's sandbox, so the user runs:
`"/mnt/c/Program Files/nodejs/node.exe" --test tests/`
This needs Node ≥ 22.7 or ≥ 20.19 for automatic ES module detection, since the repo has no `package.json`. On older Node, add `{"type":"module"}` in a `package.json`.

## Out of scope

- The win-chance / Monte Carlo evaluator.
- Resuming a game after a page refresh. A reload starts a new game and clears history.
- Keeping multiple past games.
- A browser test page.
