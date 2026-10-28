# Battle Bird Coach — design

Date: 2026-10-28
Repo: pokemon-tcg-web (vanilla JS, zero dependencies, GitHub Pages)

## Goal

Add a Clippy-style in-game coach, drawn as the BattleRoad battle bird, that:

1. Teaches the rules of the prototype as the player hits them (what to do now, why an action was illegal).
2. Gives strategic suggestions while playing, each attributed to a legitimate source (official rulebook, named competitive players/coaches, established competitive sites) with a link.
3. Gives an end-of-game review listing concrete habits to improve, again with sources.

"AI coach" here means a rule-based advisor over the game state, not a hosted language model. The site is static on GitHub Pages with no backend or API key, so a live LLM is out of scope. Every piece of advice is hand-written from the research brief below and cites where it came from.

## Non-goals

- Changing engine rules or deck contents.
- A full rules engine; the coach only covers mechanics the prototype implements.
- Per-card meta analysis for real Standard-format decks.
- Multiplayer or server features.

## Assets

- `assets/br_bird.svg` — the bird glyph alone, extracted from `br_bird_white.svg` (path 0, bbox x 0–49, y 0–36) in the AtomEngine logos folder. Fill uses `currentColor` so CSS can tint it.
- `assets/br_logo.svg` — copy of `br_logo_white.svg` (BATTLEROAD wordmark, 1130×209 viewBox).
- Both are committed into this repo so the Pages deploy is self-contained.

## Architecture

Three new modules, no changes to `engine.js` or `cards.js`:

```
src/main.js ──act()──▶ engine.dispatch ──▶ new state
    │
    └──▶ coachUI.update({prev, state, action, payload, error})
             │
             ├─▶ coach.advise(ctx)  → ranked [{id,title,text,source,kind}]
             │       └─ reads coach_knowledge.TIPS (text + trigger fns)
             └─▶ coach.review(ctx)  → per-game tracker + end-of-game findings
```

### `src/coach_knowledge.js` (data)

- `SOURCES`: id → `{name, url, kind}` where kind ∈ official | player | coach | site.
- `TIPS`: array of `{id, kind: "rule"|"tip", title, text, source, priority, once, when(ctx)}`.
  - `when(ctx)` is a pure predicate over a derived context object (below). Triggers and copy live together so each tip is reviewable in one place.
  - `once: true` tips (pure rules explanations) are suppressed after the player has seen them, persisted in localStorage.
- `REVIEW_RULES`: array of `{id, title, text, source, detect(turnSummaries) → boolean}` used by the end-of-game review.

### `src/coach.js` (pure logic)

- `buildContext(prev, state, action, payload, error)` derives: current player, phase, round, hand composition (basics, evolutions matching board, energy by type, trainers by name), bench count, active HP remaining, opponent active HP, best affordable attack and whether it knocks out, energy attached this turn, supporter used, retreat possible, deck size, prizes both sides, going-first flag, whether the last action errored and which message.
- `advise(ctx, seenOnce, dismissed)` → tips whose `when(ctx)` is true, sorted by priority, minus seen-once and dismissed ids. Returns up to 5.
- `trackTurn(tracker, ctx)` → returns a new tracker (never mutates the argument) with the per-turn facts needed for the review (attached energy?, attacked when able?, held Research with hand ≤ 2?, benched when bench was thin and basics in hand?).
- `review(tracker)` → list of findings for the end-of-game card.
- No DOM access; runnable in Node.

### `src/coach_ui.js` (presentation)

- Fixed bottom-right widget: bird avatar + speech bubble.
- Bubble shows one tip at a time: title, text, `Source: <name> ↗` link opening in a new tab, and a kind badge ("Rule" / "Pro tip").
- Controls: **Next** (cycle through currently applicable tips), **Got it** (hide this tip for the rest of the game), **—** minimize to bird-only button (click bird to reopen), **Mute** in the minimized state persists to localStorage.
- Animations: idle bob; short "flap" when a new tip appears; bubble fades in. `prefers-reduced-motion` disables them.
- Game over: bubble switches to the review card listing findings with sources.
- Hotseat: the bubble names the player it is coaching ("Player 2, …") because the two seats alternate.
- Header gets a small "Coach by BATTLEROAD" badge using the wordmark.

### `src/main.js` changes

- Import `coach_ui.js`; call `coachUI.update(...)` at the end of `act()`, once after initial render, and in the two dialogs that dispatch directly (ball search, Pick and Stick). The deck builder's start callback reports a `reset`.
- Cache keys: upstream versions each module independently, so only the entry points this feature changes move: `style.css` and `main.js` go to `v36` in `index.html`, the coach modules start at `v1`, and other imports keep upstream's keys.
- The page opens on the main menu; `main[hidden]~#coach` hides the widget until the playmat is shown.

Upstream at integration time (origin/main 190ba3c, which added the Player 2 AI planner) had Quick Ball / Ultra Ball instead of Poké Ball, Air Balloon (retreat cost via `retreatCost()` in cards.js), and Abilities on Rapidash and Morpeko. The context uses `retreatCost()`, the ball tip covers both Balls, and an Ability reminder tip was added.

### `style.css`

- Append `.coach*` rules; reuse the existing palette (`#0b1422` bg, `#f9d36b` accent, `#173547` panel).
- Mobile (`max-width:700px`): widget becomes a bottom bar with the bird at left.

## Tip selection rules

- At most one bubble visible; Next cycles.
- Rule tips outrank strategy tips when the last action produced an error (explain the rule that was just hit).
- Lethal detection ("your Spark Strike knocks out their Active") outranks everything else during the playing phase.
- The same tip is not repeated two updates in a row unless its trigger context changed (hash of relevant ctx fields).
- Setup phase shows only setup/rules tips.

## Persistence

`localStorage["coach"]` = `{muted, minimized, seenOnce:[ids]}`. "Got it" is per-game and lives in memory only.

## Error handling

Coach failures must never break the game: `coachUI.update` wraps `advise`/`review` in try/catch and logs to console. Missing assets degrade to a text-only bubble.

## Verification

- Node smoke run of `advise()`, `summarizeTurn()`, `trackTurn()` and `review()` against real engine states plus 40 random full games (throwaway script, not committed, per the repo's no-test-suite convention). 25 checks pass.
- Node run of `coach_ui.js` against a minimal DOM stub covering mount, render, Next/Got it/minimize/mute/unmute, error path, reset and the game-over review. 16 checks pass.
- Manual pass in a browser on the Pages deploy is still owed; the sandbox has no browser.

## Knowledge base

Every entry below ships in `coach_knowledge.js` with the URL. Sources were fetched and checked on 2026-10-28. Attribution is to the person who actually wrote the advice; where the advice is a rule, it cites the rules reference.

### Sources

| id | Name | Kind | URL |
|---|---|---|---|
| bulba-tcg | Bulbapedia — Pokémon TCG gameplay (transcribes rulebook) | official-secondary | https://bulbapedia.bulbagarden.net/wiki/Pokémon_Trading_Card_Game |
| bulba-evolution | Bulbapedia — Evolution (TCG) | official-secondary | https://bulbapedia.bulbagarden.net/wiki/Evolution_(TCG) |
| bulba-retreat | Bulbapedia — Retreat | official-secondary | https://bulbapedia.bulbagarden.net/wiki/Retreat |
| bulba-bench | Bulbapedia — Bench (TCG) | official-secondary | https://bulbapedia.bulbagarden.net/wiki/Bench_(TCG) |
| bulba-prize | Bulbapedia — Prize card | official-secondary | https://bulbapedia.bulbagarden.net/wiki/Prize_card |
| bulba-ex | Bulbapedia — Pokémon ex (TCG) | official-secondary | https://bulbapedia.bulbagarden.net/wiki/Pokémon_ex_(TCG) |
| bulba-weakness | Bulbapedia — Weakness (TCG) | official-secondary | https://bulbapedia.bulbagarden.net/wiki/Weakness_(TCG) |
| bulba-supporter | Bulbapedia — Supporter card (TCG) | official-secondary | https://bulbapedia.bulbagarden.net/wiki/Supporter_card_(TCG) |
| tpci-2020 | The Pokémon Company, Feb 2020 first-turn rule announcement (reproduced) | official | https://pocketmonsters.net/news/3965 |
| trademat | tradematches rules guide (cites rulebook + Tournament Handbook) | site | https://tradematches.app/en/blog/pokemon-tcg-rules-guide |
| nance-tempo | Erik Nance, SixPrizes — "Don't Have a Tempo Tantrum!" | player | https://sixprizes.com/2013/03/29/dont-have-a-tempo/ |
| nance-pass | Erik Nance, SixPrizes — "And I'll Pass…" | player | https://sixprizes.com/2012/12/13/and-ill-pass-a/ |
| kettler-primer | John Kettler, SixPrizes — "A Primer on Playing" | player | https://sixprizes.com/2011/09/21/a-primer-on-playing/ |
| kettler-deep | John Kettler, SixPrizes — "Going off the Deep End" | player | https://sixprizes.com/2012/08/28/going-off-the-deep/ |
| shen-risk | Kent Shen, SixPrizes — "Risk Management" | player | https://sixprizes.com/2012/07/10/risk-management-in-the/ |
| juntunen-numbers | Esa Juntunen, SixPrizes — "I Play the Game AND the Numbers" | player | https://sixprizes.com/2013/03/14/i-play-the-game-and-the-numbers |
| pero-finish | Xander Pero, SixPrizes — "From Start to Finish" | player | https://sixprizes.com/2017/06/16/from-start-to-finish/ |
| rubin-deckout | Jeremy Rubin, SixPrizes | player | https://sixprizes.com/2012/07/20/the-penguin-that-will/ |
| wisdom-mulligan | Kenny Wisdom, SixPrizes — "Go Fish" | player | https://sixprizes.com/2015/10/01/go-fish/ |
| roberts-math | Patrick Roberts (TheMathTCG), SixPrizes | player | https://sixprizes.com/2013/01/13/themathtcg-the-probabilities-behind/ |
| croxton-first | Jonathan Croxton, SixPrizes — "Drumroll Please" | player | https://sixprizes.com/2020/02/18/drumroll-please/ |
| jib-draw | JustInBasil — Draw Cards | site | https://www.justinbasil.com/guide/draw |
| jib-search | JustInBasil — Pokémon Search | site | https://www.justinbasil.com/guide/search |
| jib-attacker | JustInBasil — Main Attacker | site | https://www.justinbasil.com/guide/main-attacker |
| tcgp-prize | TCG Protectors — Prize Trade Guide | site | https://tcgprotectors.com/blogs/pokemon-blog/pokemon-tcg-prize-trade-guide-advanced-prize-mapping |
| tcgp-inter | TCG Protectors — Intermediate Strategy Guide | site | https://tcgprotectors.com/blogs/pokemon-blog/pokemon-tcg-intermediate-strategy-guide |

### Rule tips (kind "rule", `once: true`)

| id | Trigger (ctx) | Message gist | Source |
|---|---|---|---|
| rule-setup | phase = setup | Choose a Basic as Active, bench up to 5 more Basics, then Ready. | bulba-tcg |
| rule-mulligan | player.mulligans > 0 on first setup view | You mulliganed (no Basic in 7); in the real game the opponent may draw an extra card per mulligan. | trademat, wisdom-mulligan |
| rule-first-turn-attack | error contains "cannot attack on the first turn" OR round 1 & turn 0 | Going first: no attack this turn (and in the official game no Supporter either). | bulba-tcg, tpci-2020 |
| rule-one-energy | error "only one Energy per turn" | One Energy attachment per turn, Active or Bench. | bulba-tcg |
| rule-one-supporter | error "Only one Supporter per turn" | One Supporter per turn. | bulba-supporter |
| rule-evolve-timing | error "Cannot evolve a Pokémon played or evolved this turn" or "must evolve from" | Evolution needs the Basic to have been in play since the start of your turn; damage and Energy carry over. | bulba-evolution |
| rule-retreat | error "Retreat requires" / retreat button enabled first time | Retreat once per turn; discard Energy equal to Retreat Cost; needs a Benched Pokémon. | bulba-retreat |
| rule-bench-limit | error "Bench is full" | Max 5 on the Bench. | bulba-bench |
| rule-ex-prizes | opponent's Active is an ex, first time | KO an ex and you take 2 Prizes; losing yours gives up 2. | bulba-ex |
| rule-win | prizes ≤ 1 either side | Win by taking all 6 Prizes, or if the opponent has no Pokémon left. | bulba-prize |
| rule-deckout | own deck ≤ 5 | You lose if you cannot draw at the start of your turn. | trademat |

A Weakness rule tip was dropped: no attacker in the prototype matches a defender's Weakness and the engine does not apply Weakness, so it could never fire.

### Strategy tips (kind "tip")

| id | Trigger (ctx) | Advice | Source |
|---|---|---|---|
| tip-lethal | affordable attack damage ≥ opp Active remaining HP | "X knocks out their Active for N prizes." Highest priority. | tcgp-prize |
| tip-trade-up | lethal and own Active is 1-prize, opp Active is ex | Favourable trade: a single-prizer taking a 2-prize ex. | tcgp-prize |
| tip-bench-early | round ≤ 3, Basic in hand, bench < 5 | Get your Pokémon in play; competitive players aim to be set up within three turns. | nance-tempo |
| tip-empty-bench | bench = 0, Basic in hand | Never sit on an empty Bench: a KO with no Bench loses the game. | bulba-bench, nance-pass |
| tip-ended-no-energy | turn ended with Energy in hand and no attachment | Addressed to the player who just ended: missing an Energy attachment is like missing a turn. (also feeds the review) | nance-tempo |
| tip-ended-no-attack | turn ended via End Turn with an affordable damaging attack | Addressed to the player who just ended: free damage is free. | kettler-primer |
| tip-attach-last | Energy attached while Research / Poké Ball still in hand this turn | Draw and search first, attach Energy last: it is your most irreversible action. | tcgp-inter |
| tip-cheap-attacks | round ≤ 3, Active's cheapest attack ≤ 1 Energy exists on Bench while Active needs ≥ 3 | Favour cheap attacks early. | nance-tempo, jib-attacker |
| tip-power-bench | Active healthy, a Benched Pokémon has 0 Energy and Energy in hand | Build the next attacker while the Active fights. | nance-tempo |
| tip-dont-overload | all Energy on one Pokémon (≥ 3) and Bench has 0-Energy Pokémon | Loading everything onto one Pokémon is a big risk. | nance-pass |
| tip-no-idle-ex | ex Basic in hand, bench already ≥ 2 attackers | Don't bench a 2-prize Pokémon you aren't about to use. | tcgp-prize |
| tip-prize-map | after setup, opponent board visible | Map how many KOs you need (ex = 2 each). | tcgp-prize |
| tip-prize-parity | opponent at 3 or 1 prizes | Think about odd/even prize counts. | pero-finish |
| tip-fast-six | lethal available but own attacker then in opp KO range | Fast first Prize isn't the goal; fast six is. | juntunen-numbers |
| tip-research-low-hand | hand ≤ 2 (excluding Research), Research in hand, supporter unused, not turn-1 first player | Play Professor's Research now: weak hands are exactly what it is for. | jib-draw |
| tip-research-hold | Research in hand, hand has ≥ 4 useful cards (evolution matching board, Energy) | Don't discard your good stuff. | kettler-deep, jib-draw |
| tip-not-obliged | prize lead ≥ 2, Research in hand, hand ≥ 5 | You are not obliged to use a Supporter every turn. | shen-risk |
| tip-ball-search | Quick Ball or Ultra Ball in hand on own first turn | Item search is the opening play; pay the discard with dead cards. | jib-search |
| tip-use-ability | own Pokémon with an unused Ability, deck not empty | Abilities are free and don't end the turn; use it before attacking. | bulba-ability |
| tip-research-deckout | deck ≤ 10, Research in hand | Research late in the game decks you out. | rubin-deckout |
| tip-count-deck | deck < 8 | Count your deck versus turns needed. | bulba-tcg, pero-finish |
| tip-retreat-cost | phase = replacement, choices differ in retreat cost | Check Retreat Cost before promoting. | nance-pass |
| tip-retreat-loop | second consecutive own turn with a retreat | Avoid the retreat loop. | nance-pass |
| tip-retreat-save | Active in opp KO range, Benched Pokémon can attack, retreat affordable | Retreat to save a damaged attacker and keep tempo. | nance-tempo |
| tip-evolve-now | Stage 1 in hand whose Basic is on board and eligible | Evolve as soon as the rule allows. | nance-tempo, jib-attacker |
| tip-potion-breaks-ko | Potion in hand, (damage − 30) takes Active out of opp attack range | Heal when it breaks a knockout. | tcgp-inter |
| tip-behind-take-risks | prize deficit ≥ 3 | Far behind: smart risks are the only way back. | kettler-primer, shen-risk |
| tip-ahead-safe-ko | prize lead and lethal available | Ahead: take the safe KO. | shen-risk |
| tip-going-second | setup, player 2 | Second player attacks (and uses a Supporter) first. | tpci-2020, croxton-first |
| tip-prized-cards | searching for a card none of which is in hand/board and deck has 0 copies | Six of your cards are prized; it may be in there. | nance-pass |

### End-of-game review rules

| id | Detect | Finding | Source |
|---|---|---|---|
| rev-energy | turns ended with Energy in hand and no attachment ≥ 1 | "You skipped N Energy attachments." | nance-tempo |
| rev-attack | turns ended via End Turn with an affordable attack ≥ 1 | "You passed N times when you could attack." | kettler-primer |
| rev-bench | first 3 own turns ended with a Basic in hand and bench < 2 | "Slow setup: Basics stayed in hand." | nance-tempo |
| rev-research | turns with hand ≤ 2 and Research in hand but unplayed ≥ 1 | "Research held on an empty hand." | jib-draw |
| rev-lethal | turns with lethal available but not taken ≥ 1 | "Missed N knockouts." | tcgp-prize |
| rev-deckout | lost by deck-out | "Lost to deck-out; watch Research late." | rubin-deckout |
| rev-good | none of the above | "Clean game: you attached every turn and took every KO." | — |

### Known gaps

- pokemon.com (rulebook PDF, Tord Reklev's strategy article), PokéBeach and Limitless returned 403 to the fetcher, so no world-class named pro is quoted yet. The data file is designed so adding one is a one-row `SOURCES` entry plus a `source` reference; this is the first follow-up once those pages can be fetched.
- `engine.js` does not apply Weakness or Resistance (they are display-only upstream), so the coach ships no Weakness advice.
- Coach text uses "Professor's Research"; several sources discuss Professor Juniper, an identical card.
