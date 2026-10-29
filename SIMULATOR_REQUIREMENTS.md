# Pokémon TCG simulator requirements

Last updated: 2026-10-28.

## 1. Scope and implementation status

This document records requested software features and implementation acceptance criteria. It does **not** assert that they are implemented or verified. Gameplay rules, rulings, deck-verification criteria, and deckbuilding/strategy advice live in [RULES.md](RULES.md); keep those separate from interface and engineering requirements.

The current work focuses on **human-to-human hotseat rules and UI**. AI-versus-human work belongs to coworkers: preserve main's existing AI toggle, planner algorithm, and debug/export features, but do not add new controller modes, AI policies, schedulers, or planning improvements as part of this work. iPad Safari via GitHub Pages remains a primary user-testing surface; another browser's result is not iPad acceptance.

**v60 is the current integration/release target.** The user has requested publication for manual UI testing; a browser pass is deferred, not a prerequisite to publishing. The reconciled source passed 33 engine/parser regressions, syntax checks for 18 JavaScript source files, and a Node engine smoke of default-deck setup, four passed turns, mandatory draws, and counter corrections. Manual user acceptance and Edge/iPad Safari behavior remain unverified. These checks do not establish complete official-rules compliance or a Judge-panel review. Historical context: v14 was previously user-confirmed stable; v15 Trainer/deselection acceptance remained pending in the earlier handoff.

The current prototype retains its supported card pool, automated effects, deck builder, live external-card lookup, Limitless/PTCGL import, Battle Bird coach/design notes, and coworkers' existing AI/planning/graph/debug/export material. Human-facing work covers a deliberate private handoff, drag placement with tap/keyboard alternatives, zone/card inspection, explicit scoped manual permission declarations, and manual counter adjustments with Knock Out/Prize/promotion consequences. A permission declaration logs the claimed card/rule and reason; it does **not** verify that an official rule grants access. Manual counters likewise do not certify an authorized effect. Player 1 still starts; full coin-choice/setup coverage below remains a requirement.

Text import and external lookup **exist in source**, but import success does not certify printing identity, format legality, or engine support. The maintained Standard/GLC legality database, broader official card-effect coverage, and Judge-agent workflow below remain requested capabilities unless separately evidenced. There is **no connected Judge service**. These documents do not implement those systems or claim that all listed acceptance scenarios pass.

## 2. Text deck import

Provide a paste-text import option for each player's deck. Primary compatibility target: the **[Limitless beta Pokémon TCG deck builder](https://limitlesstcg.com/builder)** export. Do not substitute Pokémon TCG Pocket or another game's format.

The builder already offers paste-text import through `src/limitless-import.js` and `src/limitless-resolver.js`, with live TCGdex printing lookup through `src/external-cards.js`. The resolver can return unresolved rows marked `unverified`, including inferred/default metadata; the catalog registration path does not preserve a complete printing-verification status. External Pokémon receive simplified prototype attacks/stats. Named Trainer implementations are available, while unsupported external Trainers are rejected without leaving the hand, not spent as no-effect actions. The builder validates the complete candidate before replacing the selected deck. These source paths do not establish that every requirement below is met.

[Limitless decklist-submission documentation](https://docs.limitlesstcg.com/player/decklists.html) identifies Pokémon TCG Live and Limitless Deck Builder exports as supported sources. Direct retrieval of the builder and documentation returned HTTP 403 during the earlier research pass; no live beta export was captured or exercised in that pass. Compatibility and live-network behavior need separate evidence.

The expected format family includes quantity, full card name, set code, and collector number, often with section headings. This is only an **illustrative excerpt**, not a captured export, complete deck, or verified Standard-legal list:

```text
Pokémon: 1
1 Charmander MEW 4

Trainer: 1
1 Rare Candy SVI 191

Energy: 1
1 Basic {R} Energy SVE 2

Total Cards: 3
```

Required behavior (acceptance targets, not a description of every current resolver behavior):

- Capture real beta exports before claiming compatibility. Confirm exact headings, optional fields, Basic Energy notation, alternate-art identifiers, and collector-number conventions.
- Preserve quantities, full names, set codes, and collector numbers. Use stable printing/card identities, not only the current species-array index or display name.
- Handle normal pasted line endings, blank lines, whitespace, accents, punctuation, multiword names, and Energy type tokens. Collector numbers are identifiers, not necessarily plain integers.
- Treat section headings and stated totals as metadata. Compute the actual total from quantities rather than trusting the export's summary.
- Report malformed rows and unresolved/ambiguous cards with actionable context. Do not silently drop entries, guess a different printing, or replace an unknown card with a prototype.
- Distinguish **parsed**, **identified**, **legal for the selected format**, and **engine-supported**. Names and artwork do not implement attacks, Abilities, or effects.
- Validate a complete candidate before replacing an existing deck. Failed import must not partially overwrite a deck or mutate a running game.
- Do not silently allow unsupported card behavior in a supposedly automated, rules-enforced match. Any manual-play allowance must clearly state what automation is absent.

## 3. Standard and GLC legal-deck checker

Implement the verification criteria in [RULES.md, section 2](RULES.md#2-deck-verification-standard-and-glc). Scope: **Standard and GLC**, not Expanded.

The checker must:

1. Require the chosen format and identify the effective rules/data version used.
2. Resolve printings and canonical card names against source-backed metadata, permitted card pools, authorized reprint equivalences, and current bans. Support bans applying across multiple printings.
3. Apply total-size, Basic Pokémon, copy-limit, format, and card-specific checks. Use printed TCG types for GLC, not video-game species typing. Detect Rule Box restrictions from reliable card information, not suffixes alone.
4. Produce useful failures identifying the card and reason: banned, outside the format, excess copies, wrong printed TCG type, excluded Rule Box, missing Basic, or invalid total.
5. Return **unverified**, not legal, when identity or essential legality data is missing. Separate this from a known illegal result and from a legal card with unsupported engine behavior.
6. Update source/version information when rotations, bans, releases, or errata change. Do not hard-code this document's date or a guessed current regulation-mark list as permanent legality.
7. Keep deck quality separate from legality: never reject a deck for having more/fewer than seven Energy, an unconventional ratio, a gimmick, or a weak matchup.

This requires actual maintained legality data; the prototype card library and builder checks are not a complete card-pool/ban database. No such database is supplied or certified by this work.

## 4. Playmat and visibility

Requested per-player areas: Lost Zone, discard pile, draw pile, hand, one Active Spot, configurable Bench, and six individual Prize cards at setup. Represent a shared Stadium where needed. Exact gameplay/visibility rules remain in [RULES.md, section 3](RULES.md#3-play-areas-and-hidden-information).

- Default to five Bench slots. Support card-driven limits from **three through eight**, including intermediate values, for the requested card pool. Eight is the current requested UI capacity, not a universal future rules cap.
- Preserve occupied cards when limits change; resolve excess Pokémon under the responsible effect before hiding/removing slots. Do not manufacture Knock Outs or Prizes during a layout change.
- Keep draw pile, discard, and Lost Zone distinct in state and interaction. Discard-only recovery must not select Lost Zone cards.
- Support face-up/face-down cards for setup, Prizes, and relevant effects. A generic flip interaction must not bypass access permissions.
- Do not provide a general manual/testing flip that bypasses hidden-zone permissions in normal human play. Any separate developer fixture must remain outside the live match interface.
- Ordinary hidden Prize selection must not show identities before the choice. Inspection/reveal effects must preserve who is authorized to see which cards.
- Keep hidden information out of opponent-visible card labels, dialogs, logs, and hot-seat transitions. Provide a deliberate player handoff even if one human controls both sides.
- Search interfaces must distinguish searching, choosing, mandatory public reveals, and returning/shuffling cards. Do not automatically choose a random Basic as a universal substitute for an official search effect.
- Either player's face-up Pokémon, discard, and Lost Zone are public and inspectable at any time; each player may read their own hand privately. Protected zones include **either player's deck and Prizes, and the opponent's hand**. A resolving effect/rule must authorize the exact player, zone, cards, viewer, and duration; a manual declaration is not proof of that authority.
- Do not expose an entire zone where only a top card, chosen subset, or one-time view is permitted. Scope the manual UI to an explicitly authorized whole zone, top/bottom N deck cards, or chosen face-down Prize positions without identity previews. Card detail and Back must preserve the same scope. Protect preview images, labels, logs, and exported data as well as the primary playmat. Close private views on handoff and invalidate stale choices after state changes.
- No generic free cut, shuffle, or peek control. A deck cut can follow only an authorized deck shuffle; a Prize cut can follow only an authorized Prize shuffle. A deck shuffle does not authorize Prize manipulation or a bad-top-card redraw.
- Coworkers own AI behavior and its information boundaries; preserve the existing main integration without claiming a new AI implementation here.

The preserved developer Debug views/commands can expose hidden cards and change state; they are not permissions granted by a card/rule and are not privacy-safe normal-play controls. Keep that privileged testing distinction explicit. Do not use developer access or private debug/history exports as evidence that ordinary inspection is authorized or that human-play privacy is verified.

The v60 human UI uses locally mirrored printed TCG type/Colorless symbols through `src/type-symbols.js` and eleven assets in `assets/types/`. Per-file source URLs and rights-holder attribution are in [`assets/types/sources.json`](assets/types/sources.json). This supplies artwork/provenance, not verified card metadata or implemented Weakness/Resistance damage rules.

## 5. Quality-of-life operations

| Requested control | Exact intended operation |
| --- | --- |
| Shuffle deck | Randomize the remaining draw pile without changing its membership. |
| Shuffle hand into deck | Move the hand into the deck and shuffle the combined pile. Do not automatically draw replacement cards. |
| Shuffle hand and place it on the bottom | Randomize the hand's order and place that group below the existing draw pile. Preserve the existing deck order unless the effect separately instructs a deck shuffle. Do not automatically draw afterward. |

These are requirements for **authorized effect resolution**, not unrestricted extra legal actions or a promise that generic controls are present. Require the exact affected player/card group and source; never offer a free reshuffle to learn Prizes or dodge the next draw. If card text specifies selected cards, a chosen order, a different destination, a draw count, or an additional shuffle, resolve that specific instruction instead. A cut is permitted only after the relevant authorized shuffle; no generic free-cut control is requested.

Do not manipulate randomness to guarantee setup, stop a brick, hide an illegal deck, or help a preferred deck win. The soft consistency guidance is about deckbuilding, not stacked draws.

## 6. Rules-engine work and known evidence gaps

Use [RULES.md](RULES.md) as the gameplay reference rather than copying a second rules manual into this document. Requested engine behavior includes:

- Explicit coin-flip choice, simultaneous setup/reveal, mulligans, compensation, Prize placement, and first-turn draw sequencing.
- Separate per-player turn allowances and evolution timing; UI selection changes must not refresh them.
- Mandatory start-of-turn draw, including the first player's first turn, before discretionary play. A short effect draw is not the mandatory-draw loss condition. Effect-only attacks end the turn, and passing is permitted.
- Ordinary Energy allowance counts one **card from hand**, not provided Energy units; extra attachments require an effect. Ability usage limits follow exact card text, not a universal once-per-turn flag. Stadium-play limits, activated per-player/text limits, and continuous passive effects are separate.
- Trainer admission must separate timing/public prerequisites and committed costs from a legal hidden search's result. Optional “you may” clauses affect only their specified steps. Never expose hidden target availability through an enabled/disabled play control or refund paid costs merely because a legal specified-card search finds none. Apply the exact source-backed exceptions rather than permitting every no-effect Trainer or treating every search as fail-able; see [RULES.md, section 5](RULES.md#5-turns-and-play-limits).
- Setup uses a face-down Basic Active and optional 0..current-Bench-limit face-down Basics (normally 0..5), except an explicit setup exception.
- Energy-card identity distinct from currently provided Energy units; selectable legal retreat payment and effect-driven switches.
- Complete evolution stacks and attachments; card-specific devolution behavior only after the relevant ruling is established.
- Special Condition markers restricted to the Active Pokémon and supported authorizing effects, including legal condition combinations and effect-specific amounts.
- Checkup after attacks and passes, condition recovery timing, Knock Outs, Prize choices, promotions, and all ordinary win conditions.
- Effects targeting Pokémon, players, Energy, and cards in hand/deck/discard, with their actual scope and expiry rather than indiscriminate cleanup.
- Explicit card/rule-box Prize awards and modifiers rather than a universal suffix-based rule.

Supported automation must remain intact while manual human controls are added. Current cards are simplified and Weakness/Resistance remain informational. Compare each supported printing and effect with its actual text before claiming official compliance; do not use manual controls as evidence that unsupported effects are automated. For Knock Outs, zero-or-less remaining HP requires normal discard destinations unless applicable effects replace them; evaluate all applicable effects. Rescue Scarf's exact attack-damage-only trigger and attachment-discard text are recorded in [RULES.md, section 9](RULES.md#9-knock-outs-prizes-and-winning), not generalized to counter placement or all attachments returning to hand.

Buddy-Buddy Poffin is included as TEF 144 in the starter catalog and has a named engine/UI search implementation: up to two Basic Pokémon with 70 HP or less go directly to the Bench, then the deck is shuffled. A full Bench blocks play and the selection must fit the available spaces. Eligibility uses the engine's Pokémon metadata, which can be inferred for external cards; this is not printing verification or a claim of comprehensive official-text coverage. Its exact TEF 144/162 text, Potion's SWSH 177/202 text, and the limits of retrieved ruling evidence are recorded in RULES.md. The scenarios below remain acceptance criteria, not passing results.

During-turn Active Knock Outs require promotion before Checkup, resuming an interrupted continuing turn without another draw. Checkup Knock Outs require promotion before the next turn. Manual counter changes must use signed whole counters (10 damage each), never make damage negative, distinguish counter placement from attack damage, and resolve resulting Knock Outs/Prizes/promotions. Disputed legality/corrections still require a Judge; the UI is not an adjudication backend.

Ball search UI must commit the required discard choices before revealing any deck grid. Cancellation after reveal still pays committed costs and performs the required shuffle. Snack Seek cancellation after its private top-card view means keep the card and consume the Ability use. Neither flow may reopen a free preview by canceling.

### Proposed seven-mulligan fallback

The original request proposed a fallback after seven mulligans: draw until a Basic is found, shuffle, and draw the starting seven. This is **not standard setup** and is not an approved project default. Shuffling the found Basic back does not guarantee the next hand contains it.

If a separate house-rule option is adopted, first define whether the Basic is retained, how the final seven are formed, and how compensation is counted. Until then, follow ordinary repeated mulligans after legal-deck verification. This proposal is unrelated to the seven-Energy GLC heuristic.

## 7. Judge-agent consultation and deliberation

Requested capability, **not a deployed agent system**: consult a designated **Judge agent** when an engineer/player is uncertain about a legal move, a mechanic, or an interaction, or disputes a suspected violation. Both players share responsibility for maintaining a valid board. Routine legal actions do not need preapproval, and the Judge must not act as a license to guess missing card behavior. Until a real service is available, use the rules reference and an appropriate human Judge.

### Decision process

1. **Capture the exact question.** Record printings/text, format, material board/attachment state, turn history, active effects, and proposed action. Preserve the pre-action state while adjudication is pending. Give Judges necessary private evidence without exposing it to unauthorized players.
2. **Search direct authority.** Use applicable rules, errata, official rulings, and format rules first. Cite the relevant passage, URL, date/version, and why it applies. Distinguish reading a source from seeing a search snippet or an inaccessible link.
3. **Examine precedent.** Check previous and analogous rulings, explicitly matching targets, wording, timing, and conditions. Prior rulings or links mentioned outside available context must be located and checked, not assumed.
4. **Convene multiple Judges if needed.** When no readily available answer exists, the lead consults at least **two other Judge agents** for independent evidence-backed cases. Share their reasoning for deliberation; require challenges, counterexamples, and discussion of dissent rather than repeated agreement.
5. **Separate authority from inference.** The panel may extrapolate from related rulings and apparent intent, explaining its case and differences from precedents. Intent cannot override applicable explicit text. A consensus or majority is not official Pokémon authority.
6. **Issue a labeled disposition.** Use **officially sourced**, **provisional project interpretation**, **house rule**, or **unresolved**. Record evidence, arguments, dissent, limits, and facts that would change the result. Never reclassify an AI interpretation as official by repeating it.
7. **Escalate unresolved conflicts.** Missing facts, conflicting authority, or an unsupported conclusion require an authorized human Judge/Head Judge or the appropriate official/format ruling channel. Do not commit a guessed official action to continue play. A labeled casual house ruling requires a separate explicit decision.
8. **Preserve and maintain the finding.** Record the question, relevant state, sources, arguments, authority level, result, and applicable format/version. Update rules documentation and behavior scenarios when a finding is adopted; revisit superseded rulings after updates.

Open devolution, unusual condition-timing, simultaneous game-end, and penalty-boundary questions must follow this process. Earlier delegated Judge research failed in its environment before producing findings. No panel decision or complete authoritative review was obtained; none of those questions is silently resolved here.

## 8. Fair-play enforcement and penalties

Follow [RULES.md, section 10](RULES.md#10-fair-play-errors-and-penalties) and the applicable event policy.

- Reject illegal deck entry and illegal actions without partial state changes. Do not automatically label an invalid click or accidental error cheating.
- Pause discovered game-state errors for adjudication rather than secretly repairing hidden state.
- Distinguish factual investigation, authorized correction, and disciplinary decision. Agents must not invent intent findings or claim official tournament authority.
- Keep penalty-adjusted victory thresholds separate from actual Prize cards and normal awards. Do not implement a penalty by drawing unspecified hidden Prizes.
- Verify the full current policy for repeated penalties, already-reached thresholds, immediate losses, higher-sanction authority, and appeals before enabling automated enforcement.
- Preserve an appropriate ruling/penalty record without leaking unrelated private cards.

## 9. Acceptance scenarios

These are **criteria to exercise**, not tests reported as passing:

- Import real Limitless beta exports without losing quantities/printings; reject malformed and ambiguous entries without partially replacing a deck.
- Reject 59/61-card decks, no-Basic decks, and excess ordinary copies. Keep legality failures distinct from unresolved data and unsupported engine effects.
- Validate against current Standard/GLC pool and ban data. Reject GLC duplicates, mixed printed Pokémon TCG types, and excluded Rule Box cards. Handle Standard rotation and authorized older reprints correctly.
- Count GLC singleton by full printed name across printings, not species: reject two printings both named `Pikachu`. For a conditional naming fixture, distinguish `Pikachu` from `Team Rocket's Pikachu`, but never certify the latter's existence/eligibility from the example; require actual printing, pool, type, Rule Box, and ban data before reporting a real deck legal.
- Accept otherwise legal GLC Energy counts above/below seven and legal off-meta decks. Never force draws to make setup succeed.
- Exercise either player winning the coin flip and choosing first or second; one-sided and shared mulligans; optional compensation; hidden setup/Prizes; simultaneous reveal; first mandatory draw.
- Block first-player first-turn Supporters and all attacks, including effect-only attacks. Permit passing. Enforce both players' own first-turn evolution restrictions.
- Preserve manual Energy, Supporter, and retreat allowances across UI interactions and switches. Allow repeated legal Items/Tools without exceeding Tool capacity.
- Reject a Trainer before exposing hidden cards or mutating state when its public prerequisite, timing, required target, or cost cannot be satisfied. Exercise a “you may” clause without treating it as permission to skip a separate mandatory cost or condition. Once a legal search and costs are committed, finding no qualifying hidden cards must not undo the costs; perform the exact required shuffle and cleanup.
- Exercise the implemented Poffin path against **TEF 144/162: up to 2 Basic Pokémon with 70 HP or less, directly to Bench, then shuffle**. With the ordinary Bench full, reject play without deck access or a shuffle. With one free space, permit legal play and selection of at most one qualifying Basic; never require two spaces or two targets. With two spaces, exercise choosing one or two, and a zero-result search. Permit zero when the player privately knows there are no qualifying Basics in a nonempty hidden deck; keep controls/logs from revealing that knowledge. Shuffle after a legal zero-result search. Do not apply specified-card failure permission to a mandatory “any card” search in a nonempty deck.
- For Potion's checked **SWSH 177/202** text, reject an undamaged target and a board with no legal damaged target; heal all 10/20 damage when that is all present, and 30 when at least 30 is healable. Do not offer arbitrary partial healing, heal an opponent's Pokémon, create negative damage, or ignore a supported healing restriction.
- Keep Stadium-from-hand play separate from activation: use an existing Stadium legally, replace it with a different-name Stadium using the still-unused play allowance, then evaluate the new effect under its own printed usage scope. Reject same-name replacement regardless of owner and a second ordinary Stadium play from hand that turn. Exercise a passive Stadium without an activation requirement; replacement must not reset broader printed usage restrictions.
- Exercise exact per-card Ability limits (including unrestricted, per-Pokémon, and shared-name wording where supported), continuous effects, and Stadium activation/play allowances independently. Do not make every Ability or Stadium effect once per turn.
- Change Bench limits from five to three/eight and back under supported effects without silently deleting cards or inventing Prizes.
- Exercise flips/reveals and deck searches from each player perspective; inspect dialogs/logs for hidden-card leakage. Keep Lost Zone and discard recovery distinct.
- Inspect both public discards/Lost Zones/face-up fields and the correct player's own hand. Refuse protected-zone access without a scoped declaration, never label the declaration a verified ruling, and enforce any actual effect's narrower scope. Exercise explicit whole-zone permission, top/bottom N deck views, and chosen face-down Prize positions without identity previews. Preserve scope through detail/Back and keep private identities out of shared logs. Confirm normal human-play controls provide no free peek, shuffle, Prize cut, or bad-top dodge; treat retained developer Debug access separately.
- Exercise drag-and-drop to valid own targets, invalid occupied Basic drops, and equivalent tap/keyboard paths. Verify focus and deliberate private handoff; do not infer accessibility or privacy acceptance from written event handlers.
- Shuffle each intended card group without unintended membership/order changes, replacement draws, or a second shuffle of an otherwise preserved deck.
- Exercise legal Special Condition combinations and both outcomes of relevant coin flips; clear conditions on benching/evolution without clearing unrelated state.
- Process Checkup on both sides after an attack and pass; handle paralysis at the correct later Checkup; resolve condition substeps before associated Knock Outs/Prizes.
- Retreat using player-selected payments, including multi-unit Energy; distinguish blocked manual retreat from legal effect-driven switching.
- Preserve evolution stacks/damage/attachments; normally discard the full stack and attachments on Knock Out. Apply every relevant replacement/trigger and verify Rescue Scarf's exact trigger/destinations without returning Energy/Tools to hand or suppressing Prizes absent a separate modifier. Consult the Judge before automating unresolved interactions.
- Award correct hidden Prizes for attack, self-inflicted, and Checkup Knock Outs. Promote before Checkup for during-turn Knock Outs, and before the next turn after Checkup Knock Outs; resume an interrupted turn without an extra draw or false loss while a Bench exists.
- Exercise all three win conditions, including the forced first turn-start draw. Empty a deck during an effect without immediate deck-out, draw as much as the effect allows, then fail the next mandatory draw if it remains empty.
- Consult the Judge/panel for unresolved mechanics; preserve sources, dissent, and authority labels. Do not substitute a fabricated consensus or leak private state.
- Exercise documented penalty thresholds separately from physical Prize awards, with authoritative boundary-case policy and authorized adjudication.

## 10. Release and collaboration conventions

- Inspect current repository state and relevant instructions before editing; avoid overwriting another engineer's changes.
- Keep increments small and testable. Preserve working gameplay while extending it.
- For each **gameplay release**, increment the visible version beside the header and synchronize production module/stylesheet cache keys throughout the dependency graph. The current target is **v60**; obsolete release/stash targets must not replace incoming coworker work.
- Syntax-check changed JavaScript before committing and exercise the changed path. Report observed checks separately from user acceptance testing; do not claim iPad Safari coverage from another browser.
- After an actual committed/deployed release, provide the versioned Pages link and focused user checks. Confirm the visible version first because Safari and Pages caches can lag.
- Do not claim a document, prototype, imported image, or resolved card name proves working official mechanics. Update the implementation-status statement only with evidence.

### Integration verification handoff

Validation of the reconciled v60 source: 33 engine/parser regression tests passed; syntax checks passed for all 18 JavaScript source files. A Node engine smoke completed default-deck setup, four passed turns, mandatory draws, and manual counter placement/removal. Browser interactions remain unverified. From the repository root:

```sh
node --experimental-default-type=module --test tests/limitless-import.test.mjs src/engine.test.mjs
python3 -m http.server 8765
```

`tests/limitless-import.test.mjs` exercises the parser with local fixtures, not live resolver/network compatibility, full format legality, or the browser import path. `src/engine.test.mjs` must run against the reconciled engine; passing results from the old pre-pull engine are not current evidence. The obsolete `tests/decks.test.mjs` path is not available.

Publish v60 for the requested manual UI testing without claiming that a browser pass has occurred. Edge and iPad Safari acceptance remain pending separately. Manual acceptance should exercise handoff/setup privacy, drag/tap/keyboard placement, scoped inspection/detail/Back, cost-first search and cancellation, Snack Seek closure, signed counter corrections, Knock Out/Prize/promotion flow, and continuing-turn resumption without a draw. Preserve coach, live import/search, developer debug, and planning-graph integration while checking those paths. Edge results cannot establish iPad Safari acceptance. A release target or Pages URL alone is not evidence that a commit was deployed or that the visible version/cache keys are correct.
