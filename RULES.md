# Pokémon TCG rules and deckbuilding guide

Last updated: 2026-10-28.

## 1. Scope, authority, and rulings

This shared reference covers how to play, deck verification for **Standard and Gym Leader Challenge (GLC)**, fair play, and helpful deckbuilding/strategy guidance. Expanded is outside the current project scope. Requested software features, interface controls, and implementation scenarios belong in [SIMULATOR_REQUIREMENTS.md](SIMULATOR_REQUIREMENTS.md), not here.

Distinguish **rules**, **strategy/heuristics**, **provisional interpretations**, and **unresolved questions**. A prototype's current behavior is not evidence of an official rule. Explicit applicable card text, errata, format rules, and authoritative rulings can create exceptions to the ordinary rules below.

**Consult the designated Judge whenever a ruling or interaction is uncertain.** Check the rulebook and existing rulings first. If no direct answer exists, use the multi-Judge deliberation process described in the separate requirements document. Related rulings and intent can support a case, but cannot override applicable explicit text. An extrapolated project interpretation must be labeled provisional, not presented as an official Pokémon ruling. Conflicting or insufficient evidence requires escalation rather than an invented definitive answer.

For each new finding, record the exact card printing or rules question, relevant facts, source URL and passage/ruling, applicable format/date, reasoning, and authority level. Check that a previous ruling remains applicable after errata or rule changes. Do not cite an earlier AI answer as official authority or pretend an unavailable prior link was consulted.

**Research boundary:** direct access to the linked Pokémon rulebook PDFs, penalty guidelines, and GLC rules page returned HTTP 403 during this documentation pass. Research used search-indexed passages, not a complete review of the latest documents. Sources are listed in section 13. No multi-Judge ruling was obtained. Open questions remain explicit; this is not an exhaustive or fully verified official rules manual.

## 2. Deck verification: Standard and GLC

### Construction and format eligibility

| Check | Standard | GLC |
| --- | --- | --- |
| Deck size | Exactly **60 cards**, including Pokémon, Trainers, and Energy. | Exactly **60 cards**, including Pokémon, Trainers, and Energy. |
| Opening Pokémon | At least **one legal Basic Pokémon**. | At least **one legal Basic Pokémon**. |
| Copies by name | Normally up to **four** across all printings, except Basic Energy and explicit card-text exceptions. | **One** of each card name, except Basic Energy. |
| Pokémon types | No general mono-type requirement. | All Pokémon must meet the format's **one printed Pokémon TCG type/color** requirement. |
| Card pool | Eligible regulation-mark blocks and authorized reprints for the selected effective date. | **Black & White era onward** through modern releases, subject to GLC eligibility/reprint rules. |
| Rule Box cards | Allowed only as the format and the specific card rules permit. | **Rule Box cards are excluded**; this is not merely a Pokémon-name-suffix check. |
| Bans and other limits | Current Standard bans, release-eligibility dates, and applicable construction restrictions. | Current GLC bans, card-pool restrictions, and format-specific rulings. |

The format differences discussed here concern **valid deck construction**, not a different turn sequence, set of Special Conditions, or ordinary win conditions.

Card-name limits apply across different artworks and set numbers. For example, `Pikachu` and `Pikachu ex` are distinct names, whereas different Professor's Research printings do not automatically grant separate copy allowances. Basic Energy is exempt from the ordinary copy limit; Special Energy is not generally exempt. Additional restrictions, such as ACE SPEC limits where applicable, still require checking.

**Use printed TCG types, not video-game types.** A species' video-game typing does not establish the type of a particular Pokémon card. GLC's mono-type requirement concerns the Pokémon cards; it does not mean every Trainer or Energy must have that type.

Standard uses rotating regulation-mark blocks: older blocks leave, new cards become eligible according to official policy, and some older printings remain usable through permitted reprints. Do not treat rotation as simply banning every card from an expansion, a video-game generation, or a fixed number of calendar years. Pin the applicable date and policy; a legality result does not remain current forever.

### Deck verification checklist

1. Identify the chosen format and effective date. Use source-backed card-pool, ban-list, errata, and construction-rule data for that format.
2. Identify every card's exact printing and canonical name. Apply only authorized reprint equivalences; a matching name alone does not always prove eligibility.
3. Count physical cards: exactly 60. Confirm at least one Basic Pokémon legal for setup.
4. Aggregate quantities by card name across printings. Apply Standard's ordinary four-copy limit or GLC's singleton limit, with the Basic Energy exception and any applicable explicit exceptions.
5. Check every card against the allowed pool and bans, including bans covering multiple printings of a named card.
6. For GLC, verify the printed Pokémon TCG type requirement and Rule Box exclusions. Check current format-specific restrictions rather than assuming Standard legality implies GLC legality.
7. Apply any additional card-specific deck-construction limits. Escalate uncertain cases to the Judge.
8. Report the exact reason a deck fails and the policy/data date used. Unresolved card identity or missing legality data means **unverified**, not a confirmed legal deck.

Deck legality is separate from deck quality and from whether a simulator has implemented a card's effects. An unconventional legal deck is still legal; recognizable artwork is not proof of accurate mechanics.

**There is no seven-Energy legality rule.** The GLC Energy suggestion in section 11 is a deckbuilding heuristic, not a minimum, maximum, or validation requirement.

## 3. Play areas and hidden information

| Area | Normal rule / role | Visibility |
| --- | --- | --- |
| Active Spot | One Active Pokémon per player during normal play. A temporary empty spot while a required promotion is resolved is not an extra action window. | Face up after setup. |
| Bench | Normally up to **five** Pokémon. Card effects may reduce or increase the limit. | Face up after setup. |
| Hand | Cards available to play; no ordinary maximum hand size. | Private to its owner. |
| Deck / draw pile | Ordered cards, normally drawn from the top. | Face down; order and identities hidden. |
| Discard pile | Cards sent here by rules/effects; recoverable only as applicable effects allow. | Face up and inspectable by either player. |
| Lost Zone | Separate from discard; ordinary discard recovery does not work here. | Face up and inspectable by either player. |
| Prize cards | **Six** per player at setup; taken into hand when awarded. | Face down; identities initially unknown to both players. |
| Shared Stadium | One Stadium in play overall; effects can change play rules, including Bench limits. | Face up. |

Bench-changing effects can produce limits such as three or eight and intermediate values. Follow the responsible card's instructions for the limit, who chooses excess Pokémon, and where they go. Discarding an excess Benched Pokémon is not automatically a Knock Out and does not automatically award Prizes.

Lost Zone cards are effectively unavailable under the ordinary rules discussed here. Do not apply an effect requiring a card in discard to a card in the Lost Zone. Only explicit applicable card text/rulings could authorize an exception; do not invent one or assert that no future card could ever provide one.

Starting Pokémon are face down until setup is complete. There is no unrestricted right to flip hidden cards over. Looking at, revealing, shuffling, or rearranging Prizes or other hidden cards requires a rule or effect, and only the entitled player receives the permitted information. Follow instructions about returning cards face down and revealing to the opponent.

A deck search may let a player inspect permitted cards and infer that missing copies are Prized. It does not directly reveal a specific face-down Prize. Taking a Prize is a choice among hidden cards unless an effect changes that; it is not permission to preview all identities.

## 4. Setup, turn order, and mulligans

1. Confirm both decks are legal for the chosen format, including the presence of a legal Basic Pokémon.
2. Flip a coin. **The winner chooses which player goes first**; winning does not automatically mean taking the first turn.
3. Shuffle each 60-card deck and draw seven cards.
4. A player with no Basic Pokémon reveals their hand, shuffles it back into the deck, and draws another seven. Repeat until the player can set up.
5. From a valid opening hand, place one Basic Pokémon face down as Active and optionally place Basic Pokémon face down on the Bench within the setup limit. Ordinary Evolution cards cannot fill these opening slots.
6. After opening Pokémon placement, put the top six cards of each deck face down as Prizes without inspecting them.
7. Resolve optional bonus draws for uncompensated opposing mulligans after Prizes are placed. Basics drawn this way may be added to the Bench before setup ends, if space permits.
8. Once both players are ready, reveal the starting Pokémon together. The chosen first player begins their turn with the mandatory draw.

Mulligans shared by both players cancel; only the excess permits bonus draws for the other player. With final failed-hand counts `mA` and `mB`, A may draw up to `max(0, mB - mA)` bonus cards, and B up to `max(0, mA - mB)`.

For example, A mulligans three times and B once: B may draw zero, one, or two extra cards; A receives none. If both mulligan twice, neither receives a bonus. A mulligan is a failed opening hand, not every hand dealt.

**Standard setup has no seven-mulligan cutoff.** A proposed capped fallback is a house-rule question, not the ordinary rules. Do not alter the draw process to guarantee an opening that normal shuffling would not produce.

## 5. Turns and play limits

### Turn sequence

1. **Draw one card.** This is mandatory at turn start, including the first player's first turn. Failure to draw this card loses the game.
2. **Take legal actions.** Bench eligible Basics, evolve, attach Energy, play Trainers, use Abilities, and retreat as permitted.
3. **Attack or pass.** An attack ends the turn after resolution. A player may instead end the turn without attacking.
4. **Pokémon Checkup.** Resolve the between-turn step before the next turn begins, unless the game has already ended.

The player going first cannot normally **attack or play a Supporter on their first turn**. The second player can normally do both on their first turn. Neither player normally evolves on their own first turn. Explicit card exceptions must be checked rather than assumed.

A zero-damage attack, search attack, or effect-only attack is still an attack and ends the turn. An attack failing because of Confusion also ends the turn. An illegal attempted action rejected before a legal attack is declared is not itself a completed attack.

### Normal limits

- **One Energy card from hand** attached to one of your Pokémon per turn, Active or Benched. Effect-based extra attachments are separate from this manual allowance.
- **One Supporter per turn**, with the additional first-player first-turn restriction.
- **Any number of Items**, subject to their requirements and restrictions on play.
- **Any number of Pokémon Tools**, but normally **one attached Tool per Pokémon**. Attached Tools cannot be freely removed or reassigned; a rule/effect must permit it. Tools are a distinct modern Trainer category, not automatically Items.
- Normally **one Stadium from hand per turn**. Follow replacement and same-name restrictions; only one Stadium is in play overall.
- **One manual retreat per turn**, including free retreat. Switching through a card effect is not automatically a retreat.
- **No general hand limit** and no ordinary end-of-turn discard-to-limit step.

Going first can give an evolution deck earlier access to its second turn. Going second allows earlier Supporter use and an immediate attack, potentially an early win or "donk" if the opponent loses their only Pokémon. Neither choice is universally preferable; matchup, deck plan, and card exceptions matter.

## 6. Energy, attacking, retreat, and switching

An Energy **card** is not the same thing as the Energy units it currently provides. Special Energy may provide multiple units, types, or conditional amounts. One manual attachment still means one card.

- Meet colored attack requirements with compatible provided Energy. Colorless requirements can be paid with any applicable Energy type.
- Attacking normally requires attached Energy but does not consume it unless the attack says to discard or otherwise remove it.
- Retreat discards attached Energy cards providing the required units. Choose a legal payment from the Active Pokémon's attachments.
- For a retreat cost of two, one card currently providing two applicable Energy can pay the cost. Discard the entire card and all Energy it provides; cards cannot be partially discarded.
- Apply current cost modifiers and Energy restrictions before deciding whether the payment is sufficient.

Manual retreat requires a Benched replacement, permission to retreat, enough discardable Energy, and the unused retreat allowance. Asleep and Paralyzed prevent manual retreat and attacks; Confusion does not itself prevent retreat.

After paying, switch with the chosen Benched Pokémon. Damage, remaining Energy, Tools, and evolution cards stay with the outgoing Pokémon. Its Special Conditions and applicable attack effects end when it reaches the Bench.

An effect-driven switch may move an Asleep or Paralyzed Pokémon when the effect permits it. The retreat restriction is not a blanket switching restriction, and such a switch does not automatically consume the manual-retreat allowance.

## 7. Evolution, devolution, and effects

- Normally play Basics into empty Bench spaces during a turn, not on top of an occupied Pokémon. Evolution requires the correct existing Pokémon and relationship.
- A Pokémon normally cannot evolve on the turn it entered play, on its controller's first turn, or again during the same turn after evolving. Evolution does not permit immediately chaining another ordinary evolution.
- Evolution preserves damage counters, attached Energy and Tools, and the underlying evolution stack. It does not normally heal.
- Use the new top card's HP, attacks, Abilities, and rule text. Underlying cards do not automatically grant their attacks/Abilities.
- Evolution removes Special Conditions and applicable effects of attacks, not every effect affecting the player or the whole board.
- Moving between Active and Bench does not itself make a Pokémon newly played or restart its evolution waiting period.
- Devolution removes the evolution card(s) specified by the effect, exposing a lower stage. Retained damage can reach that stage's lower HP and cause a Knock Out.

**Judge consultation required:** the requested general rule that devolution resets evolution readiness and clears conditions/effects has not been established by this research. Confirm the supported devolution card's timing, attachment/damage handling, same-turn evolution eligibility, and effect cleanup against an applicable ruling. Do not silently treat devolution as identical to ordinary evolution or leaving play and replaying a card.

Effects can target Pokémon, players, attached Energy, or cards in hand, deck, and discard. A condition-removal effect removes only what it says; it does not normally heal damage or discard attachments. Persistent Ability, Tool, and Stadium effects follow their own text. Benching one Pokémon does not erase unrelated player effects or all restrictions in play.

## 8. Special Conditions and Pokémon Checkup

Special Conditions apply only to **Active Pokémon**, through an attack, Ability, Trainer, or other authorizing effect. They are not freely chosen player actions.

| Condition | Effect | Recovery / timing |
| --- | --- | --- |
| Poisoned | Place **1 damage counter** during every Pokémon Checkup unless an effect changes the amount. | No default recovery flip. |
| Burned | Place **2 damage counters** during every Pokémon Checkup, then flip a coin. | Heads removes Burned; tails leaves it. Counters are placed before the recovery flip. |
| Confused | On attempting a legal attack, flip. Heads: resolve normally. Tails: place **3 damage counters** on the attacker; the attack does nothing. | No default Checkup recovery flip. The failed attack ends the turn and can Knock Out the attacker. |
| Paralyzed | Cannot attack or manually retreat. | Clears at the appropriate Checkup after the affected player's turn, not immediately after the opponent's paralyzing attack. Escalate unusual application timing to the Judge. |
| Asleep | Cannot attack or manually retreat. | Flip during every Checkup: heads wakes it; tails leaves it Asleep. |

One damage counter represents **10 damage**. Placing counters is not the same operation as attack damage: do not apply Weakness or Resistance to condition counters or Confusion self-counters.

Poisoned and Burned can coexist with each other and with one of the other three conditions. **Asleep, Confused, and Paralyzed are mutually exclusive**; the newest replaces the prior member of that group. Reapplying Poisoned or Burned does not create arbitrarily stacked independent copies; follow the applicable effect's amount.

Checkup happens **between every pair of turns**, after an attack or a pass, and is not part of either turn. Check affected Pokémon on both sides. Resolve Special Conditions in the order **Poisoned, Burned, Asleep, Paralyzed**; Confusion is checked when attacking, not here. Also resolve applicable Checkup effects under their timing rules. After required Checkup resolutions, handle Knock Outs, Prizes, promotions, and game end before the next mandatory turn draw. Do not award Prizes midway through the condition substeps while other required Checkup resolutions are pending.

Benching or evolving a Pokémon removes its Special Conditions and applicable attack effects. Conditions do not remain on the Bench or automatically return on promotion. Devolution-specific clearing remains an open ruling in section 7. Removing a condition does not automatically remove damage counters, attachments, or unrelated persistent effects.

## 9. Knock Outs, Prizes, and winning

When damage counters reach or exceed current HP, resolve a Knock Out. Normally discard the Pokémon, all underlying evolution cards, and all attachments to the owner's discard pile, subject to explicit replacement effects.

The opposing player normally takes **one of their own Prize cards** for each opposing Pokémon Knocked Out, including Knock Outs from Checkup or other effects. Card rules can change the award; many Pokémon ex award two. Read the actual rule box and applicable modifiers rather than inferring every award from a name suffix. Taking a Prize moves that hidden card to hand, not a card from the deck.

Three ordinary win conditions:

1. **Take all your Prize cards.** Six start the game, but multi-Prize Knock Outs can reduce how many Pokémon must be defeated. Officially applied penalties can alter the relevant threshold as discussed below.
2. **Leave the opponent with no Pokémon in play.** An empty Active Spot pending promotion is not a loss if a Benched Pokémon can be promoted. Promotion is not a new turn and does not grant an extra draw.
3. **The opponent cannot draw their mandatory turn-start card.** An empty deck during another action is not itself an immediate deck-out loss.

An ordinary effect that draws more cards than remain draws as many as possible unless its text or a cost requirement changes play/resolution. A short draw during a turn does not itself cause deck-out. Milling the final card threatens the next mandatory draw; recovery or another win may intervene.

**Judge consultation required:** simultaneous Knock Outs, both players meeting victory conditions together, and complex replacement/trigger ordering need applicable official rulings. Do not decide these cases arbitrarily or award a winner simply because one player's condition was checked first.

## 10. Fair play, errors, and penalties

Win **fairly within the rules**. Intentional cheating is not tolerated. Legal bluffing, surprise cards, an off-meta deck, and bad luck are not cheating.

Distinguish accidental procedural/rules errors, illegal decks, repeated errors, and intentional cheating. Pause a disputed game and consult the Judge about the facts, authorized correction, and applicable penalty. Do not invent a convenient redraw or reshuffle to conceal an error. An attempted move rejected before it occurs is not automatically a tournament infraction or proof of intent.

Use the selected event's current penalty policy. Penalties can range from cautions/warnings through Prize penalties and game/match losses to disqualification. Not every mistake or illegal deck receives the same sanction. Significant penalties, appeals, and intent findings require the appropriate authorized Judge/Head Judge process; an AI opinion is not official tournament disciplinary authority.

Indexed official policy describes a **Double Prize Card penalty** for certain significant game-state errors or escalated situations. In the six-Prize example discussed for this project, a two-Prize reduction means the non-offending opponent can win after taking **four instead of six**. This does **not** mean immediately drawing two hidden Prizes. Distinguish an adjusted victory threshold from actual cards taken.

**Open policy verification:** consult the full current policy and Judge before applying penalties where the threshold is already reached, repeated/combined penalties, immediate-loss boundaries, or a specific illegal-deck infraction. Do not infer those outcomes from the simple four-of-six example. Serious intentional cheating can warrant disqualification under applicable policy; establish facts rather than treating every error as cheating.

Keep a ruling record identifying the evidence, policy version, correction, sanction, issuing authority, and appeal without disclosing unrelated private cards. Casual house rulings are separate from sanctioned procedure.

## 11. Deck archetypes and deckbuilding guidance

### Archetypes and win plans

These categories overlap; they are not construction restrictions or mandatory play styles.

| Archetype | Usual win plan | How it functions |
| --- | --- | --- |
| Offensive / Prize-taking | Take all Prizes through Knock Outs; sometimes remove the opponent's only Pokémon. | Establish an engine, power attackers, choose targets, and manage the Prize trade. Offense still needs defense, recovery, disruption, and pacing. |
| Mill | Make the opponent fail the mandatory turn-start draw, often without taking Prizes. | Remove cards from the opposing deck, force resource use, and survive until the loss condition occurs. Emptying a deck is not itself that loss event. |
| Control | Restrict useful opposing actions until a win condition is secured. | Deny/remove Energy, trap an unfavorable Active, limit legal plays, disrupt hands, or exhaust recovery. May close through deck-out or Prizes. |

Hybrid plans are normal: an attacking deck can disrupt, a control deck can take a timely Knock Out, and a mill deck can change plans. A deck label does not determine the best move in every position.

There is no general hand limit. A large hand may contain more answers, so disruption can break a prepared sequence. Hand size alone is not strength; a fresh randomized hand can sometimes help its recipient. Consider known cards, available resources, and the exact effect.

### Soft guidance: consistency, tempo, and style

The following are **heuristics, not legality rules**:

- **Roughly seven Energy cards in GLC** is our working average/starting point, not a measured universal average or hard cap. More or fewer can be correct. Adjust for costs, acceleration, search, recovery, Special Energy, and the deck's plan. This is not a required Standard ratio either.
- **Give both decks a reasonable chance to set up.** Include accessible Basics and enough draw/search to establish a board and engine. This is a deckbuilding/casual-play goal, not permission to fix draws, reorder decks, reveal Prizes, or prohibit legal disruption.
- **Use functional redundancy.** Different cards can provide overlapping routes to setup when a key piece is Prized or inaccessible. In singleton GLC, redundant functions must use differently named cards, not illegal copies.
- **Keep interaction and tempo.** Consistency slots compete with attackers, recovery, switching, and disruption. Boss's Orders can disrupt positioning or enable a timely Knock Out, but playing it uses the normal Supporter allowance instead of a draw Supporter; it does not replace an engine in every hand.
- **Avoid running out of steam.** Tempo means continued useful progress or forcing responses, not just maximum immediate damage. Plan follow-up attackers, Energy access, and recovery.
- **Bricking is a serious failure mode, not illegality.** An unusable hand or several turns of passing with little development can happen through draws, Prizing, or disruption even in a well-built deck. No honest shuffle guarantees a good opening.
- **Do not overdo consistency or any other category.** Search can lack targets, extra Supporters can clog a hand when only one can be played, too much Energy crowds out setup, and too many Pokémon or unplayable Evolutions can leave too little draw/search. Early setup and late recovery/closing cards have different useful windows.
- **Balance through actual play.** Consider openings, follow-up turns, post-Knock-Out recovery, late-game usefulness, Prizing, and matchups. One lucky win or unlucky brick does not establish the right ratio.
- **Style and experimentation matter.** Some archetypes have stronger support, power, or consistency, but an off-meta gimmick can still win. Novel interactions and fair wins with a supposedly "bad deck" are rewarding. A legal unusual deck is not invalid merely because it is suboptimal.

A tech card or surprise combination costs space in a 60-card list. Coverage, consistency, and personal style require tradeoffs; there is no universal ratio guaranteeing success.

## 12. Unknown decks, mind games, and match formats

### Information and inference

Players normally know their own list, but in a closed-list game do not know the opposing full list. Neither initially knows their own Prize identities. Public board state, discard, Lost Zone, and required reveals provide evidence. Searches can support deductions about Prizing without revealing a particular Prize's identity; memory may be fallible.

Decklist disclosure depends on the event/mode. Open lists reveal composition, not necessarily present hand contents, deck order, or Prize positions. Do not assume every event is closed-list.

Common successful cores form the **metagame**. A familiar opening Pokémon, Energy type, or search target suggests a possible archetype, not certainty. Shared engines, small list edits, and deliberately unusual cards can invalidate a prediction. A missing card might be Prized, undrawn, withheld, or absent from the list.

Update beliefs as cards become public. Plan for plausible answers, preserve alternatives where worthwhile, and avoid assuming an opponent's unseen hand contains exactly what would be convenient. A decision can be reasonable with the information available yet look poor in hindsight after a surprise reveal.

### Surprise and legal bluffing

An uncommon tech or novel combination can punish overcommitment to an expected matchup. Legal sequencing may resemble a known archetype while supporting a different plan. This does not authorize misrepresenting public rules, marked cards, hidden-information access, or cheating.

Choices about revealing an attacker, committing Energy, discarding resources, disrupting a hand, or changing win plans create mind games. They operate through incomplete information and legal play, not a guarantee that the opponent will misread the game.

### Best-of-one and best-of-three

- **Best-of-one:** one opening hand and game determine the result. Surprise and draw variance can have greater influence; no legal deck guarantees a playable or strong hand.
- **Best-of-three:** opponents can use earlier games to anticipate a gimmick, interrupt an engine, conserve an answer, or stall a known threat. More games offer more evidence of consistency and adaptation, but do not eliminate luck.
- Information learned in game one can inform game two without revealing where any card is now located.
- Best-of-three does not itself authorize sideboarding or changing the deck between games. Follow the chosen match rules.

## 13. Sources and unresolved findings

Primary references:

- [Official Pokémon TCG rulebook, 2026 edition (`30c`)](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/rulebook/30c_rulebook_en.pdf).
- [Official rulebook (`par`)](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/rulebook/par_rulebook_en.pdf): indexed setup, evolution, condition, and retreat passages.
- [Official rulebook (`tef`)](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/rulebook/tef_rulebook_en.pdf): indexed Checkup order and retreat passages.
- [Official rulebook (`pbl`)](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/rulebook/pbl_rulebook_en.pdf): indexed mandatory draw and evolution passages.
- [Official 2026 Standard rotation announcement](https://www.pokemon.com/us/news/2026-pokemon-tcg-standard-format-rotation-announcement): consult the applicable effective policy, not a permanently fixed list from this document.
- [Gym Leader Challenge rules](https://gymleaderchallenge.com/rules) and [FAQ/rulings](https://gymleaderchallenge.com/faq): format eligibility, bans, and rulings.
- [Official Play! Pokémon Penalty Guidelines](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-penalty-guidelines-en.pdf) and [Tournament Rules Handbook](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/play-pokemon/rules/play-pokemon-tournament-rules-handbook-en.pdf): policy and adjudication authority.

Unresolved findings must remain labeled until the Judge process supplies adequate evidence: devolution eligibility/cleanup, unusual condition-application timing, simultaneous game-end/replacement interactions, and penalty boundary cases. The older rulebook passages do not establish current rotation, current bans, or full 2026 rules compliance. A card image or prototype with a plausible name does not verify its printed mechanics.
