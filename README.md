# pokemon-tcg-web
Browser-based Pokémon TCG educational playmat and deck builder.

https://4rg43n.github.io/pokemon-tcg-web/

## Human playmat update (v48 release target)

The local v48 integration reconciles the human-to-human hotseat controls below
with main's **v47** playmat, coach, imports, and planning/debug features.
Observed validation is recorded below. Microsoft Edge UI smoke testing and
user acceptance remain **unverified** pending browser-control approval.
No deployment, iPad Safari acceptance, complete official-rules compliance, or
Judge-panel review is claimed.

- Pass the device deliberately at the private-hand handoff before revealing
  the next player's hand. Starting Pokémon remain face down until setup reveal.
- Drag a selected hand card onto a valid own Active/Bench target, or use the
  equivalent tap/click and keyboard selection paths. Basics need empty spaces;
  evolution and attachments need the appropriate existing Pokémon.
- Inspect either player's public face-up Pokémon, discard, and Lost Zone, and
  read your own hand privately. Either player's deck/Prizes and the opponent's
  hand require an actual resolving card/rule granting that exact access.
  The manual dialog records a declared card/rule, reason, player, zone, and
  scope; it **does not validate permission or official legality**.
- Scope a permitted inspection to an explicitly authorized whole zone,
  top/bottom N deck cards, or selected face-down Prize positions without an
  identity preview. Card details and Back must retain that scope; a narrow
  effect is not permission to inspect the whole zone. Keep private identities
  out of shared logs and close private views on handoff.
- Use a public Pokémon inspector's manual counter adjustment only for an
  authorized effect/correction, with its source and reason. Each increment is
  one counter (10 damage), not attack damage; removing counters cannot make
  damage negative. Resulting Knock Outs, Prizes, and required promotions are
  part of the flow; an interrupted continuing turn resumes without another draw.
- Ball searches commit discard choices before showing the deck. Closing after
  reveal still pays the cost and shuffles. Closing Snack Seek keeps the top
  card and consumes that Ability use; it is not a repeatable free preview.
- Normal human-play controls provide no generic free peek, shuffle, or cut to
  avoid an unwanted draw. A cut requires an authorized shuffle of that same
  deck/Prize group; this is not a claim that a generic cut control exists.

The retained **developer Debug** features can expose hidden cards and alter
state. They are not legal gameplay permissions or privacy-safe normal-play
controls; do not use them during a fair hidden-information match or share
private debug/history exports with an unauthorized viewer.

Both players share responsibility for a valid board. Pause disputed or unclear
interactions and consult an appropriate human Judge; **no Judge service is
connected**. Manual declarations/corrections neither implement unsupported card
effects nor certify a ruling. Player 1 still starts; complete coin-choice/setup
coverage and maintained Standard/GLC legality data remain requirements.

Type, Weakness/Resistance, and Colorless retreat symbols use eleven locally
mirrored Pokémon TCG artwork files, not video-game type icons or emoji.
Source URLs and rights-holder attribution are recorded in
[`assets/types/sources.json`](assets/types/sources.json). Weakness/Resistance
remain informational in battle.

## Importing and finding cards

The existing deck builder includes **Validate and import deck** for pasted
Limitless/PTCGL exports, plus live English-printing search through
[TCGdex](https://www.tcgdex.net/). Its parser, resolver, and external-card support
live in `src/limitless-import.js`, `src/limitless-resolver.js`, and
`src/external-cards.js`. The resolver preserves unresolved rows as explicitly
unverified references and may supply inferred/default prototype metadata.
Import success is therefore **not proof of an identified printing**, a legal
Standard/GLC deck, or working official card effects.

External Pokémon may use a simplified Prototype Attack and inferred stats;
external Trainers without implemented effects may be no-effect prototype
actions. Check exact source text and supported automation before play. Live
network resolution and real Limitless beta-export compatibility are not
verified by this documentation task.

## Existing AI, planning, and debug work

Coworkers' existing AI Player 2 toggle, deterministic planner, plan-graph
inspector, coach integration, and debug/history export material are retained.
Planning source lives in `src/planning/`; developer state commands are in
`src/debug.js`. This human-interface update adds no AI controller modes,
scheduler, policies, or planning-algorithm changes and makes no new AI
information-boundary or playing-strength claim.

## Local development and verification status

From the repository root, the available regression entry points are:

```sh
node --experimental-default-type=module --test tests/limitless-import.test.mjs src/engine.test.mjs
```

The integrated command passed **16 tests**: 12 engine regressions and four
import-parser cases. The parser suite does not exercise live TCGdex resolution
or browser import flow. JavaScript syntax checks passed for the changed modules;
these checks do not establish that the browser interactions work.

```sh
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/` for browser checks. Microsoft Edge UI checks are
awaiting browser-control approval. Before claiming UI verification, exercise
private handoff, scoped inspection/detail/back, search-cost settlement,
drag/tap/keyboard placement, and counter Knock Out/Prize/promotion flows in Edge.
iPad Safari remains a separate acceptance surface. The intended visible release
and production module/stylesheet cache keys are **v48**; this target is not
evidence of a committed or deployed release.

## Historical feature notes

The v16–v22 notes preserve feature history, followed by the existing v36 coach
documentation. They are not new browser-test or acceptance results for v48.

## Deck builder (v16)

Choose **Build Decks** to edit a separate deck for each player. Search or filter
supported cards, inspect a card by tapping its name, and use +/− to adjust copies.
A deck needs exactly 60 cards and at least one Basic Pokémon before it can be
saved or used. Current validation rejects more than four copies of the same
non-unlimited full card name across printings; missing evolution prerequisites
produce warnings. These are educational decks, not certified official format
decklists. Imported cards retain the prototype-effect limitations above.

**Save both decks** stores both completed decks on the current browser only.
**Start new game with these decks** asks before replacing the current match.
**Back to menu** preserves the match and keeps edits in memory until reload.
**New Game** restarts with the decks chosen for the current match. On a fresh
page load, open the builder and start a match to use saved decks.

Current regression and local-server commands are listed above. The former
`tests/decks.test.mjs` path is not an available test entry point.

## Main menu (v17)

The page opens on a main menu. Choose **Play** to open the playmat or
**Deck Builder** to edit decks. **Main Menu** on the playmat returns without
resetting the match. The builder's **Back to menu** also preserves edits
and the match. Starting a match from the builder opens the playmat directly.

## Pokémon card stats (v18)

Pokémon cards and their enlarged previews show Weakness, Resistance, and
Retreat. Typed circles identify Weakness/Resistance; a Colorless star with a
number identifies the retreat Energy cost. Unknown data is shown as `?`,
and explicitly absent values as `—`. No missing card data is inferred.
Weakness and Resistance are informational until their battle rules are added.

## Air Balloon (v19)

Add Air Balloon from Trainers in the deck builder (remove a card first if
your deck has 60). During your turn, select Air Balloon in your hand and tap
your Active or a Benched Pokémon. One Pokémon Tool is allowed per Pokémon.
Air Balloon reduces retreat cost by two, to a minimum of zero; the retreat
button and card icons show the adjusted cost. It stays through evolution
and retreat, and goes to Discard when its Pokémon is Knocked Out.

## Ponyta and Rapidash (v20)

Both cards are available under Pokémon in the deck builder, using the supplied card images. Ponyta has Collect (draw one) and Flop (30). Rapidash evolves from Ponyta and has Fire Mane (60). Tap your Rapidash on the field, then Use Hurried Gait to draw once per turn per Rapidash. Weakness remains informational.

## Morpeko (v21)

Morpeko (TWM 072/167) is available in the builder with the supplied image. Tap your Morpeko and use Snack Seek to privately inspect the top card and keep or discard it once per turn. Pick and Stick lets you choose up to two Basic Energy from discard and assign each to your Active or Benched Pokémon before ending the turn.

## Ball search cards (v22)

Quick Ball replaces Poké Ball in the card library and starters; saved decks automatically migrate those copies. Ultra Ball is also available. Select either in hand and press Play Trainer to choose the required other hand cards to discard and the Pokémon to find (Quick Ball: Basic only; Ultra Ball: any Pokémon). The found card is revealed in the log and the deck is shuffled. Search may finish without finding a card; discard costs still apply.

## Battle Bird coach (v36)

The BattleRoad battle bird sits in the bottom-right corner of the playmat and coaches whoever's turn it is: it explains a rule the moment you bump into it, points out Knock Outs, Energy, evolution and Ability plays, and warns about deck-out and bad prize trades. Every tip links to its source (official rules references and articles by competitive players). When the game ends it reviews both players' habits.

- **Next / Got it** cycle or dismiss tips; **—** minimizes to the bird; **✕** mutes (click **Coach** to bring it back).
- Rules explanations show once per browser; strategy tips recur when the board calls for them.
- Knowledge lives in `src/coach_knowledge.js`; each entry is a trigger over the game state plus a cited source. Add a source and a tip there to extend it. Design notes: [COACH_DESIGN.md](COACH_DESIGN.md).

## Shared references

- [Rules and deckbuilding guide](RULES.md): how to play, rulings, fair play, Standard/GLC deck verification, deckbuilding heuristics, and hidden-information strategy.
- [Simulator requirements](SIMULATOR_REQUIREMENTS.md): requested imports, deck checking, playmat controls, Judge-agent workflow, and implementation acceptance scenarios.

These references distinguish rules and advice from requested software behavior; they do not certify that the prototype implements every rule or feature.
