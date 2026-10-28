# Pokémon TCG simulator requirements

Last updated: 2026-10-28.

## 1. Scope and implementation status

This document records requested software features and implementation acceptance criteria. It does **not** assert that they are implemented or verified. Gameplay rules, rulings, deck-verification criteria, and deckbuilding/strategy advice live in [RULES.md](RULES.md); keep those separate from interface and engineering requirements.

The project is a browser-based two-player game, initially with one human controlling both players. iPad Safari via GitHub Pages is a primary user-testing surface. AI opponents are a possible later direction, not a requirement to invent during this documentation change.

The inspected local page identifies itself as **v15**. The supplied handoff identifies v14 as the last user-confirmed stable build and says v15 Trainer/deselection behavior still needs acceptance testing. The current engine uses fixed prototype decks, prepares opening hands and Prizes automatically, and starts Player 1. Existing behavior is not a reference implementation of all rules.

This is a documentation-only update. The playable version and runtime files remain unchanged. No Judge-agent system, new importer, deck validator, or controls are implemented by these documents.

## 2. Text deck import

Provide a paste-text import option for each player's deck. Primary compatibility target: the **[Limitless beta Pokémon TCG deck builder](https://limitlesstcg.com/builder)** export. Do not substitute Pokémon TCG Pocket or another game's format.

[Limitless decklist-submission documentation](https://docs.limitlesstcg.com/player/decklists.html) identifies Pokémon TCG Live and Limitless Deck Builder exports as supported sources. Direct retrieval of the builder and documentation returned HTTP 403 during this pass; no live beta export was captured or exercised.

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

Required behavior:

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

This requires actual maintained legality data; the existing prototype species definitions are not a complete card-pool/ban database. No such database is supplied or certified by this documentation change.

## 4. Playmat and visibility

Requested per-player areas: Lost Zone, discard pile, draw pile, hand, one Active Spot, configurable Bench, and six individual Prize cards at setup. Represent a shared Stadium where needed. Exact gameplay/visibility rules remain in [RULES.md, section 3](RULES.md#3-play-areas-and-hidden-information).

- Default to five Bench slots. Support card-driven limits from **three through eight**, including intermediate values, for the requested card pool. Eight is the current requested UI capacity, not a universal future rules cap.
- Preserve occupied cards when limits change; resolve excess Pokémon under the responsible effect before hiding/removing slots. Do not manufacture Knock Outs or Prizes during a layout change.
- Keep draw pile, discard, and Lost Zone distinct in state and interaction. Discard-only recovery must not select Lost Zone cards.
- Support face-up/face-down cards for setup, Prizes, and relevant effects. A generic flip interaction must not bypass access permissions.
- Permit arbitrary manual flipping only in a clearly identified testing/manual context. Rules-enforced actions reveal only what a rule/effect permits.
- Ordinary hidden Prize selection must not show identities before the choice. Inspection/reveal effects must preserve who is authorized to see which cards.
- Keep hidden information out of opponent-visible card labels, dialogs, logs, and hot-seat transitions. Provide a deliberate player handoff even if one human controls both sides.
- Search interfaces must distinguish searching, choosing, mandatory public reveals, and returning/shuffling cards. Do not automatically choose a random Basic as a universal substitute for an official search effect.
- Future AI decisions must use information available to that player, not raw access to the opposing imported deck, hand, deck order, or hidden Prizes. Public deductions are allowed; hidden-state omniscience is not.

## 5. Quality-of-life operations

| Requested control | Exact intended operation |
| --- | --- |
| Shuffle deck | Randomize the remaining draw pile without changing its membership. |
| Shuffle hand into deck | Move the hand into the deck and shuffle the combined pile. Do not automatically draw replacement cards. |
| Shuffle hand and place it on the bottom | Randomize the hand's order and place that group below the existing draw pile. Preserve the existing deck order unless the effect separately instructs a deck shuffle. Do not automatically draw afterward. |

These operations support manual testing and effect resolution. They are **not unrestricted extra legal actions**. If card text specifies selected cards, a chosen order, a different destination, a draw count, or an additional shuffle, resolve that specific instruction instead.

Do not manipulate randomness to guarantee setup, stop a brick, hide an illegal deck, or help a preferred deck win. The soft consistency guidance is about deckbuilding, not stacked draws.

## 6. Rules-engine work and known evidence gaps

Use [RULES.md](RULES.md) as the gameplay reference rather than copying a second rules manual into this document. Requested engine behavior includes:

- Explicit coin-flip choice, simultaneous setup/reveal, mulligans, compensation, Prize placement, and first-turn draw sequencing.
- Separate per-player turn allowances and evolution timing; UI selection changes must not refresh them.
- Energy-card identity distinct from currently provided Energy units; selectable legal retreat payment and effect-driven switches.
- Complete evolution stacks and attachments; card-specific devolution behavior only after the relevant ruling is established.
- Special Condition markers restricted to the Active Pokémon and supported authorizing effects, including legal condition combinations and effect-specific amounts.
- Checkup after attacks and passes, condition recovery timing, Knock Outs, Prize choices, promotions, and all ordinary win conditions.
- Effects targeting Pokémon, players, Energy, and cards in hand/deck/discard, with their actual scope and expiry rather than indiscriminate cleanup.
- Explicit card/rule-box Prize awards and modifiers rather than a universal suffix-based rule.

The existing engine's simplified cards, Poké Ball search, Stoke, first-turn/evolution timing, and replacement flow need individual review before claiming official compliance. These are review requirements, not bugs reproduced or fixed by this document. Verify exact printings and card text rather than extending prototype behavior by assumption.

### Proposed seven-mulligan fallback

The original request proposed a fallback after seven mulligans: draw until a Basic is found, shuffle, and draw the starting seven. This is **not standard setup** and is not an approved project default. Shuffling the found Basic back does not guarantee the next hand contains it.

If a separate house-rule option is adopted, first define whether the Basic is retained, how the final seven are formed, and how compensation is counted. Until then, follow ordinary repeated mulligans after legal-deck verification. This proposal is unrelated to the seven-Energy GLC heuristic.

## 7. Judge-agent consultation and deliberation

Requested capability, **not a deployed agent system**: consult a designated **Judge agent** whenever an engineer/player is uncertain about a legal move, a mechanic, or an interaction. The Judge must not act as a license to guess missing card behavior.

### Decision process

1. **Capture the exact question.** Record printings/text, format, material board/attachment state, turn history, active effects, and proposed action. Preserve the pre-action state while adjudication is pending. Give Judges necessary private evidence without exposing it to unauthorized players.
2. **Search direct authority.** Use applicable rules, errata, official rulings, and format rules first. Cite the relevant passage, URL, date/version, and why it applies. Distinguish reading a source from seeing a search snippet or an inaccessible link.
3. **Examine precedent.** Check previous and analogous rulings, explicitly matching targets, wording, timing, and conditions. Prior rulings or links mentioned outside available context must be located and checked, not assumed.
4. **Convene multiple Judges if needed.** When no readily available answer exists, the lead consults at least **two other Judge agents** for independent evidence-backed cases. Share their reasoning for deliberation; require challenges, counterexamples, and discussion of dissent rather than repeated agreement.
5. **Separate authority from inference.** The panel may extrapolate from related rulings and apparent intent, explaining its case and differences from precedents. Intent cannot override applicable explicit text. A consensus or majority is not official Pokémon authority.
6. **Issue a labeled disposition.** Use **officially sourced**, **provisional project interpretation**, **house rule**, or **unresolved**. Record evidence, arguments, dissent, limits, and facts that would change the result. Never reclassify an AI interpretation as official by repeating it.
7. **Escalate unresolved conflicts.** Missing facts, conflicting authority, or an unsupported conclusion require an authorized human Judge/Head Judge or the appropriate official/format ruling channel. Do not commit a guessed official action to continue play. A labeled casual house ruling requires a separate explicit decision.
8. **Preserve and maintain the finding.** Record the question, relevant state, sources, arguments, authority level, result, and applicable format/version. Update rules documentation and behavior scenarios when a finding is adopted; revisit superseded rulings after updates.

Open devolution, unusual condition-timing, simultaneous game-end, and penalty-boundary questions must follow this process. No panel decision was obtained during this documentation pass; none of those questions is silently resolved here.

## 8. Fair-play enforcement and penalties

Follow [RULES.md, section 10](RULES.md#10-fair-play-errors-and-penalties) and the applicable event policy.

- Reject illegal deck entry and illegal actions without partial state changes. Do not automatically label an invalid click or accidental error cheating.
- Pause discovered game-state errors for adjudication rather than secretly repairing hidden state.
- Distinguish factual investigation, authorized correction, and disciplinary decision. Agents must not invent intent findings or claim official tournament authority.
- Keep penalty-adjusted victory thresholds separate from actual Prize cards and normal awards. Do not implement a penalty by drawing unspecified hidden Prizes.
- Verify the full current policy for repeated penalties, already-reached thresholds, immediate losses, higher-sanction authority, and appeals before enabling automated enforcement.
- Preserve an appropriate ruling/penalty record without leaking unrelated private cards.

## 9. Acceptance scenarios for future implementation

These are **criteria to exercise**, not tests reported as passing:

- Import real Limitless beta exports without losing quantities/printings; reject malformed and ambiguous entries without partially replacing a deck.
- Reject 59/61-card decks, no-Basic decks, and excess ordinary copies. Keep legality failures distinct from unresolved data and unsupported engine effects.
- Validate against current Standard/GLC pool and ban data. Reject GLC duplicates, mixed printed Pokémon TCG types, and excluded Rule Box cards. Handle Standard rotation and authorized older reprints correctly.
- Accept otherwise legal GLC Energy counts above/below seven and legal off-meta decks. Never force draws to make setup succeed.
- Exercise either player winning the coin flip and choosing first or second; one-sided and shared mulligans; optional compensation; hidden setup/Prizes; simultaneous reveal; first mandatory draw.
- Block first-player first-turn Supporters and all attacks, including effect-only attacks. Permit passing. Enforce both players' own first-turn evolution restrictions.
- Preserve manual Energy, Supporter, and retreat allowances across UI interactions and switches. Allow repeated legal Items/Tools without exceeding Tool capacity.
- Change Bench limits from five to three/eight and back under supported effects without silently deleting cards or inventing Prizes.
- Exercise flips/reveals and deck searches from each player perspective; inspect dialogs/logs for hidden-card leakage. Keep Lost Zone and discard recovery distinct.
- Shuffle each intended card group without unintended membership/order changes, replacement draws, or a second shuffle of an otherwise preserved deck.
- Exercise legal Special Condition combinations and both outcomes of relevant coin flips; clear conditions on benching/evolution without clearing unrelated state.
- Process Checkup on both sides after an attack and pass; handle paralysis at the correct later Checkup; resolve condition substeps before associated Knock Outs/Prizes.
- Retreat using player-selected payments, including multi-unit Energy; distinguish blocked manual retreat from legal effect-driven switching.
- Preserve evolution stacks/damage/attachments; discard the full stack on Knock Out; consult the Judge before automating unresolved devolution cases.
- Award correct hidden Prizes for attack, self-inflicted, and Checkup Knock Outs. Promote without an extra draw or a false loss while a Bench exists.
- Exercise all three win conditions. Empty a deck during an effect without immediate deck-out, then fail the next mandatory draw if it remains empty.
- Consult the Judge/panel for unresolved mechanics; preserve sources, dissent, and authority labels. Do not substitute a fabricated consensus or leak private state.
- Exercise documented penalty thresholds separately from physical Prize awards, with authoritative boundary-case policy and authorized adjudication.

## 10. Release and collaboration conventions

- Inspect current repository state and relevant instructions before editing; avoid overwriting another engineer's changes.
- Keep increments small and testable. Preserve working gameplay while extending it.
- For each **gameplay release**, increment the visible version beside the header and synchronize all cache keys: HTML references to CSS and `src/main.js`, `main.js` importing `engine.js`, and `engine.js` importing `cards.js`.
- Syntax-check changed JavaScript before committing and exercise the changed path. Report observed checks separately from user acceptance testing; do not claim iPad Safari coverage from another browser.
- After an actual committed/deployed release, provide the versioned Pages link and focused user checks. Confirm the visible version first because Safari and Pages caches can lag.
- Do not claim a document, prototype, imported image, or resolved card name proves working official mechanics. Update the implementation-status statement only with evidence.
