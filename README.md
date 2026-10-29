# pokemon-tcg-web
Browser-based Pokémon TCG educational playmat and deck builder.

https://4rg43n.github.io/pokemon-tcg-web/

## Human playmat update (v66)

The v66 integration combines the human-to-human hotseat controls below with
coworkers' existing playmat, coach, imports, and planning/debug features.
The user has requested publication for manual UI testing; browser testing is
deferred, not awaiting browser-control approval or a prerequisite to publishing.
Manual user acceptance, Microsoft Edge, and iPad Safari behavior remain
**unverified**. This release does not certify complete official-rules
compliance or a Judge-panel review.

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
- Buddy-Buddy Poffin is present in the starter catalog and has a named engine
  search: choose up to two Basic Pokémon with 70 HP or less, put them directly
  onto the Bench, then shuffle. A full Bench blocks play; available spaces
  constrain the selection. This implemented path is not a claim that every
  imported printing's metadata or all Trainer interactions are official-text
  complete.

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
`src/external-cards.js`. The resolver may return unresolved rows marked
`unverified`, with inferred/default prototype metadata; that flag is not carried
through as a complete printing-verification status in the registered catalog.
Import success is therefore **not proof of an identified printing**, a legal
Standard/GLC deck, or working official card effects. The builder validates a
candidate deck before replacing the selected deck.

External Pokémon may use a simplified Prototype Attack and inferred stats.
Trainers with named engine implementations use those supported actions;
unsupported external Trainers are rejected and remain in hand rather than
being spent as no-effect actions. Check exact source text and supported
automation before play. Live network resolution and real Limitless beta-export
compatibility remain unverified.

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

Validation of the reconciled v66 source: **33 regression tests passed** and
syntax checks passed for all 19 JavaScript source files. A Node engine smoke
run completed both players' default-deck setup, four passed turns, mandatory
draws, and manual counter placement/removal. No browser interactions were
verified. The parser suite uses local fixtures; it does not exercise live
TCGdex resolution or browser import flow.

```sh
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/` for manual browser checks. Publish v66 for the
requested user testing without representing the deferred browser pass as
complete. Manual acceptance should exercise private handoff, scoped
inspection/detail/Back, search-cost settlement and cancellation,
drag/tap/keyboard placement, and counter Knock Out/Prize/promotion flows.
Microsoft Edge and iPad Safari remain separate, unverified acceptance surfaces.
The visible release and production module/stylesheet cache keys are **v66**.
Confirm the visible version before manual testing; Pages deployment may lag.

## Historical feature notes

The v16–v22 notes preserve feature history, followed by the existing v36 coach
documentation. They are not new browser-test or acceptance results for v66.

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
and explicitly absent values as `—`. This stats-display convention is separate
from external-card registration, which can supply inferred/default prototype
stats as described above. Weakness and Resistance remain informational.

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

- The bubble always opens with **Do this now**: a concrete instruction built from the moves the engine will actually accept (which card to tap and where, which button to press). Playable hand cards glow green, the recommended one gold, and the suggested button pulses. When nothing is left it says so and tells you to end the turn; cards the prototype can't play yet are named as such.
- **Next / Got it** cycle or dismiss the rule and strategy tips shown under the instruction; **—** minimizes to the bird; **✕** mutes (click **Coach** to bring it back).
- Rules explanations show once per browser; strategy tips recur when the board calls for them.
- Knowledge lives in `src/coach_knowledge.js`; each entry is a trigger over the game state plus a cited source. Add a source and a tip there to extend it. Design notes: [COACH_DESIGN.md](COACH_DESIGN.md).

## Generic Trainer mechanics

`src/trainer-mechanics.js` makes Trainers playable by effect family instead of one handler per card. A name table maps each card to one of five mechanics with parameters, and the engine consults it just before rejecting an unknown Trainer, so cards the engine already handles by name are unaffected:

- **Draw**: draw N, or shuffle your hand into your deck then draw N, optionally for both players or one card per Prize left. Hop, Cheren, Hau, Tierno, Cynthia, Judge, Marnie, N.
- **Deck search**: find cards matching a filter (Pokémon, Evolution for one of your Pokémon, Stadium, Tool, Special or Basic Energy), optionally from the top few cards or behind a coin flip. Great Ball, Poké Ball, Evosoda, Guzma & Hala, Energy Search.
- **Discard recovery**: shuffle matching cards from the discard pile back into the deck. Ordinary Rod, Brock's Grit, Energy Recycler.
- **Switch**: swap your Active with a Benched Pokémon, or drag one of the opponent's Benched Pokémon into their Active spot, optionally behind a coin flip. Switch, Switch Cart, Boss's Orders, Pokémon Catcher.
- **Heal**: remove damage from one Pokémon, optionally discarding Energy from it or rolling coins. Hyper Potion, Super Potion, Moomoo Milk.

Cards resolve without a dialog: when the player gives no choice the most useful default is picked (most charged Benched Pokémon to switch in, most damaged Pokémon to heal, lowest-HP opposing Pokémon to drag up) and the log says what happened. Trainers not in the table and not handled by name stay rejected with "not implemented yet". Add a card by adding one line to the table; the big card view describes it automatically.

## Shared references

- [Rules and deckbuilding guide](RULES.md): how to play, rulings, fair play, Standard/GLC deck verification, deckbuilding heuristics, and hidden-information strategy.
- [Simulator requirements](SIMULATOR_REQUIREMENTS.md): requested imports, deck checking, playmat controls, Judge-agent workflow, and implementation acceptance scenarios.

These references distinguish rules and advice from requested software behavior; they do not certify that the prototype implements every rule or feature.
