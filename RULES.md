# Pokémon TCG rules and deckbuilding guide

Last updated: 2026-10-28.

## 1. Scope, authority, and rulings

This shared reference covers how to play, deck verification for **Standard and Gym Leader Challenge (GLC)**, fair play, and helpful deckbuilding/strategy guidance. Expanded is outside the current project scope. Requested software features, interface controls, and implementation scenarios belong in [SIMULATOR_REQUIREMENTS.md](SIMULATOR_REQUIREMENTS.md), not here.

Distinguish **rules**, **strategy/heuristics**, **provisional interpretations**, and **unresolved questions**. A prototype's current behavior is not evidence of an official rule. Explicit applicable card text, errata, format rules, and authoritative rulings can create exceptions to the ordinary rules below.

**Consult the designated Judge when a rule/interaction is unclear or a player suspects a violation.** Routine legal actions do not need a Judge's approval. Check the rulebook and existing rulings first; escalate when direct authority is missing. Related rulings and intent can support a case, but cannot override applicable explicit text. An extrapolated project interpretation must be labeled provisional, not presented as an official Pokémon ruling. Conflicting or insufficient evidence requires escalation rather than an invented definitive answer.

For each new finding, record the exact card printing or rules question, relevant facts, source URL and passage/ruling, applicable format/date, reasoning, and authority level. Check that a previous ruling remains applicable after errata or rule changes. Do not cite an earlier AI answer as official authority or pretend an unavailable prior link was consulted.

**Research boundary:** direct access to the linked Pokémon rulebook PDFs, penalty guidelines, and GLC rules page returned HTTP 403 during the earlier documentation pass. Rulebook research used search-indexed passages, not a complete review of the latest documents. Rescue Scarf's exact printing/text was checked separately against the attributed Bulbapedia card entry linked in sections 9 and 13. The Trainer research below checked the English Buddy-Buddy Poffin and Potion scans and third-party transcriptions; direct official card pages and Compendium ruling pages returned HTTP 403, so their cited passages are search-indexed evidence only. Earlier delegated Judge research failed in its environment before producing findings; no panel decision or full authoritative review was obtained. Open questions remain explicit; this is not an exhaustive or fully verified official rules manual.

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

Card-name limits apply to the **full printed card name**, across different artworks and set numbers, not to a Pokémon species. For example, `Pikachu` and `Pikachu ex` are distinct names, whereas different Professor's Research printings do not automatically grant separate copy allowances. For a GLC naming example only, **if otherwise eligible cards had the printed names `Pikachu` and `Team Rocket's Pikachu`, one of each would not violate singleton merely because both depict Pikachu**. Two different printings named `Pikachu` would violate it. This conditional example does not assert that a `Team Rocket's Pikachu` printing exists or is currently eligible; each card must separately pass the pool, type, Rule Box, and ban checks. The [GLC rules](https://gymleaderchallenge.com/rules), available here only through indexed text, say “Only one of each card with the same name allowed in a deck, except for Basic Energy.” Basic Energy is exempt from the ordinary copy limit; Special Energy is not generally exempt. Additional restrictions, such as ACE SPEC limits where applicable, still require checking.

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

**Parallel City — BREAKthrough 145/162.** Choose its orientation **before playing it**. The blue-facing player is limited to three Benched Pokémon and chooses their own excess Pokémon to discard; the opposite player normally retains five Bench spaces, but attacks from that player's Grass, Fire, or Water Pokémon do 20 less damage before Weakness/Resistance. Both halves apply at the same time. This reduces outgoing attack damage, not incoming damage or damage-counter placement. The [English scan](https://archives.bulbagarden.net/media/upload/6/6a/ParallelCityBREAKthrough145.jpg) and [transcription](https://bulbapedia.bulbagarden.net/wiki/Parallel_City_(BREAKthrough_145)) were retrieved by the Judge researcher. The [official page](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/xy8/145) was search-indexed; direct access returned 403. No free post-placement rotation is authorized by its printed pre-play choice; that is an application of the text, not a separately retrieved rotation ruling. This does not certify current Standard/GLC eligibility.

**Sky Field — Roaring Skies 89/108.** Both players may have eight Benched Pokémon. Its explicit leaving-play instruction makes each player discard to five, with **Sky Field's owner discarding first**—not necessarily the current player. See the retrieved [scan](https://archives.bulbagarden.net/media/upload/2/29/SkyFieldRoaringSkies89.jpg) and [transcription](https://bulbapedia.bulbagarden.net/wiki/Sky_Field_(Roaring_Skies_89)). Replacing it with another Bench-limiting card also requires that card's instructions; do not erase intermediate instructions or assume every combination has an official timing ruling.

Lost Zone cards are effectively unavailable under the ordinary rules discussed here. Do not apply an effect requiring a card in discard to a card in the Lost Zone. Only explicit applicable card text/rulings could authorize an exception; do not invent one or assert that no future card could ever provide one.

**Lost Zone movement requires an explicit applicable instruction.** An ordinary Knock Out, a typed reason, an inspection permission, or a desire to discard a card is not permission to put it in the Lost Zone. Resolve the actual played card/attack/Ability and its exact targets, costs, destinations, and timing. Effects may count or refer to Lost Zone cards without allowing recovery or movement.

**Lost Vacuum — Lost Origin 162/196.** Its checked [English scan](https://archives.bulbagarden.net/media/upload/6/66/LostVacuumLostOrigin162.jpg) and [transcription](https://bulbapedia.bulbagarden.net/wiki/Lost_Vacuum_(Lost_Origin_162)) require **another hand card** to go to the Lost Zone as cost, then one attached Pokémon Tool or the Stadium in play goes to its owner's Lost Zone. It cannot target an Energy, arbitrary Pokémon, loose card in discard, or itself as the cost. The indexed [Compendium ruling](https://compendium.pokegym.net/category/5-trainers/lost-vacuum) explicitly says it cannot be played without a Tool or Stadium target; direct Compendium access was unavailable. Lost Vacuum itself is normally discarded after play.

**Lost City — Lost Origin 161/196.** The retrieved [English transcription](https://bulbapedia.bulbagarden.net/wiki/Lost_City_(Lost_Origin_161)) says “Whenever a Pokémon (either yours or your opponent's) is Knocked Out” to put it in the Lost Zone instead of discard, and to discard attached cards. There is **no attack-only qualifier**: this replacement can apply to an actual counter/Checkup Knock Out as well, while the Stadium applies. The KO and its normal Prize award still occur. Non-KO Bench-limit discards do not trigger it.

Basic and underlying evolution cards make up the Pokémon, rather than being attached Energy/Tools. An indexed [Puppet Offering ruling](https://compendium.pokegym.net/category/4-abilities/puppet-offering) explicitly sends the underlying Shuppet with Banette to the Lost Zone; applying that stack distinction to Lost City is an **evidence-backed interpretation**, not a directly retrieved Lost City-specific evolution ruling. Do not universalize attachment disposal: [Shiftry's Tearing Gust](https://bulbapedia.bulbagarden.net/wiki/Shiftry_(Lost_Origin_13)) explicitly sends the Pokémon **and all attached cards** to the Lost Zone. Follow each actual effect.

Starting Pokémon are face down until setup is complete. There is no unrestricted right to flip hidden cards over. Looking at, revealing, shuffling, or rearranging Prizes or other hidden cards requires a rule or effect, and only the entitled player receives the permitted information. Follow instructions about returning cards face down and revealing to the opponent.

A deck search may let a player inspect permitted cards and infer that missing copies are Prized. It does not directly reveal a specific face-down Prize. Taking a Prize is a choice among hidden cards unless an effect changes that; it is not permission to preview all identities.

### Reading cards and inspecting zones

Either player may ask to read a public card, including an opponent's face-up Pokémon in play. Both players may inspect **either discard pile and either Lost Zone at any time**. Your own hand is available to you, not automatically to the opponent. Reading a card does not grant permission to see an otherwise hidden copy.

Access to hidden information is specific to the **player, zone, and scope** authorized by a rule or card effect. A card may permit inspection of your own **or your opponent's** hand, deck, or Prize cards. It does not authorize another zone, another player, extra cards, or public disclosure beyond its instructions. Looking at a permitted top card is not permission to search the entire deck or inspect Prizes.

There is no free deck search or reshuffle to learn what is Prized or avoid an unwanted next draw. After a search, follow its exact shuffle instructions; a limited peek does not itself grant a shuffle. Unauthorized inspection or manipulation is a matter for Judge review and the applicable penalty policy.

### Shuffling and cutting

A cut is not a substitute for adequate shuffling or a free action that can be taken at any time. Offer/perform a permitted opponent cut only **after the relevant cards have been legally shuffled**, without looking at their identities. An offer does not grant permission to shuffle a previously ordered deck.

The same restriction applies to Prize cards: **no cut without a preceding authorized Prize shuffle**. Prize cards remain hidden, and a deck-shuffle instruction does not authorize a Prize shuffle or Prize cut. Follow the specific effect and applicable Judge/tournament procedure; do not infer a universal right to cut Prizes merely because ordinary deck cutting is permitted.

## 4. Setup, turn order, and mulligans

1. Confirm both decks are legal for the chosen format, including the presence of a legal Basic Pokémon.
2. Flip a coin. **The winner chooses which player goes first**; winning does not automatically mean taking the first turn.
3. Shuffle each 60-card deck and draw seven cards.
4. A player with no Basic Pokémon reveals their hand, shuffles it back into the deck, and draws another seven. Repeat until the player can set up.
5. From a valid opening hand, place **one Basic Pokémon face down as Active** and optionally place **zero through the current Bench limit** of Basic Pokémon face down on the Bench (normally **0–5**). Ordinary Evolution cards cannot fill these opening slots; a non-Basic setup requires an explicit applicable card/rule exception.
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

- **One ordinary Energy CARD attachment from hand** to one of your Pokémon per turn, Active or Benched. This is one card, not one Energy unit. Additional attachments require an authorizing card effect; a card providing multiple Energy does not grant more ordinary attachments.
- **One Supporter per turn**, with the additional first-player first-turn restriction.
- **Any number of Items**, subject to their requirements and restrictions on play.
- **Any number of Pokémon Tools**, but normally **one attached Tool per Pokémon**. Attached Tools cannot be freely removed or reassigned; a rule/effect must permit it. Tools are a distinct modern Trainer category, not automatically Items.
- Normally **one Stadium from hand per turn**. Follow replacement and same-name restrictions; only one Stadium is in play overall.
- **One manual retreat per turn**, including free retreat. Switching through a card effect is not automatically a retreat.
- **No general hand limit** and no ordinary end-of-turn discard-to-limit step.
- **Abilities have no universal once-per-turn default.** The indexed official rulebook lists “Use Abilities (as many as you want)” ([`par` rulebook](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/rulebook/par_rulebook_en.pdf)). Follow each Ability's exact timing, conditions, costs, and usage limit: a limit may be per Pokémon, across a named Ability, or otherwise worded. A continuous Ability applies while its conditions hold; it is not a once-per-turn button. “As many as you want” does not override any card-text restriction.
- **Playing a Stadium and using its effect are different allowances.** Normally play only one Stadium **from hand** per turn. You cannot play one with the same name as the Stadium already in play, regardless of its owner. A legal different-name Stadium discards the old one and replaces its effects. You may first use an existing Stadium's activated effect, if legal under its text, and then play a different-name Stadium if your Stadium-play allowance remains unused. The new Stadium's effect follows its own printed timing, costs, and usage scope; replacement does not promise another use of an effect whose wording imposes a broader shared limit. A continuous passive effect applies while its conditions hold; it is not a once-per-turn activation. These ordinary play/replacement limits come from the indexed [`par` rulebook, “Play Trainer cards”](https://www.pokemon.com/static-assets/content-assets/cms2/pdf/trading-card-game/rulebook/par_rulebook_en.pdf); sequencing is an application of the separate play and effect-use allowances, not a new card-specific ruling.

Going first can give an evolution deck earlier access to its second turn. Going second allows earlier Supporter use and an immediate attack, potentially an early win or "donk" if the opponent loses their only Pokémon. Neither choice is universally preferable; matchup, deck plan, and card exceptions matter.

### Trainer play conditions, optional steps, and hidden searches

**Being an Item does not make a card freely discardable from hand.** Before playing a Trainer, check its timing, restrictions, required costs, and publicly determinable prerequisites/targets. Do not play it when the public state makes its required effect impossible. A cost is not an optional effect: wording such as “You can use this card only if you discard…” must be satisfied before the authorized search. The indexed [Compendium ruling 925](https://compendium.pokegym.net/ruling/925/) asks about Life Herb on an undamaged Pokémon with no Special Conditions and answers, in part, “No, you cannot play a card if it is obvious that you cannot do what the card is…”; the full page was not retrievable in this pass.

**“You may” makes the specified instruction optional, not every other instruction or play requirement.** Read what that clause actually governs. It does not waive costs, a required legal target, a first-turn prohibition, or a prerequisite elsewhere in the card text. Likewise, “up to 2” is not “exactly 2.” Resolve the legal card's mandatory instructions and permitted choices; do not turn optional wording into a universal permission to play any Trainer for no effect.

**A legal search of a hidden deck for a specified kind of card can fail.** The player may find fewer qualifying cards, or none, even when they privately know the deck has no qualifying targets; private knowledge does not make the deck a public zone. This is different from failing a public prerequisite or refusing to pay a required cost. After legally committing costs and searching, a failed search does not refund those costs or cancel the instructed shuffle. Do not generalize this to every search: the indexed [Computer Search ruling](https://compendium.pokegym.net/category/5-trainers/computer-search/) says that searching for a Pokémon, Trainer, or another particular type can voluntarily fail because deck contents are unknown, but an unrestricted search for **any card** cannot fail in a nonempty deck. Exact text and any publicly established impossibility still matter.

**Buddy-Buddy Poffin — Temporal Forces 144/162 (English, regulation mark H).** The [checked English scan](https://archives.bulbagarden.net/media/upload/6/68/Buddy-BuddyPoffinTemporalForces144.jpg) reads: “Search your deck for up to 2 Basic Pokémon with 70 HP or less and put them onto your Bench. Then, shuffle your deck.” The [Bulbapedia printing/transcription](https://bulbapedia.bulbagarden.net/wiki/Buddy-Buddy_Poffin_(Temporal_Forces_144)) agrees; the [official printing page](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/sv05/144) supplied indexed text but direct retrieval was blocked.

- With a **full Bench**, and no other effect changing the applicable rules, do not play Poffin: the public destination has no space for any searched Pokémon. Choosing zero or pointing to the final shuffle does not bypass that prerequisite.
- With **one free Bench space** and a nonempty deck, it can be played; put at most **one** qualifying Basic onto the Bench. Two spaces are not required merely because the text says “up to 2.”
- With two or more spaces, choose up to two qualifying Basics. A legal hidden search can yield zero, including when the player privately knows none qualify. Follow the shuffle instruction even after finding none; do not reveal unrelated deck identities to prove failure.

These Poffin examples apply the checked card text and the indexed general play/search principles above. No Poffin-specific official ruling or Judge-panel finding was retrieved, and the printing's identity/mark is not a certification of current Standard or GLC eligibility.

**Potion — Sword & Shield 177/202 (English).** The [checked English scan](https://archives.bulbagarden.net/media/upload/a/a3/PotionSwordShield177.jpg) reads: “Heal 30 damage from 1 of your Pokémon.” See the [official printing page](https://www.pokemon.com/us/pokemon-tcg/pokemon-cards/series/swsh1/177) (indexed text; direct access blocked) and [Bulbapedia's printing/text history](https://bulbapedia.bulbagarden.net/wiki/Potion_(Base_Set_94)). Under ordinary conditions Potion needs one of **your damaged Pokémon** whose damage it can heal; an undamaged Pokémon is not a legal way to discard it. It can heal a Pokémon with only 10 or 20 damage, removing all that damage without requiring the full printed 30. This is **not** a choice to heal only 10 when 30 or more healable damage is present: perform the printed healing as far as possible. The [Compendium Potion page](https://compendium.pokegym.net/category/5-trainers/potion-trainer) indexes the question about choosing less than 30, but its complete answer was not retrievable here; no complete ruling quotation is claimed. Effects preventing or modifying healing require their own text to be considered.


## 6. Energy, attacking, retreat, and switching

An Energy **card** is not the same thing as the Energy units it currently provides. Special Energy may provide multiple units, types, or conditional amounts. One manual attachment still means one card.

- Meet colored attack requirements with compatible provided Energy. Colorless requirements can be paid with any applicable Energy type.
- Attacking normally requires attached Energy but does not consume it unless the attack says to discard or otherwise remove it.
- Retreat discards attached Energy cards providing the required units. Choose a legal payment from the Active Pokémon's attachments.
- For a retreat cost of two, one card currently providing two applicable Energy can pay the cost. Discard the entire card and all Energy it provides; cards cannot be partially discarded.
- Apply current cost modifiers and Energy restrictions before deciding whether the payment is sufficient.

**Attack type follows the attacking Pokémon's printed TCG type, not its attached Energy or attack cost.** A Fire Pokémon paying a Colorless cost with Lightning Energy still deals Fire-type attack damage; attaching Fire Energy does not make a Lightning Pokémon's attacks Fire-type. Apply explicit type-changing effects only when their text says so. This is why Parallel City's red half checks the attacker, not the payment. Damage-counter placement is not type-based attack damage.

### Attack damage versus placing damage counters

These are distinct instructions, even though both can increase the total damage recorded on a Pokémon:

- **Attack damage** follows the attack's damage calculation and applicable modifiers, including Weakness/Resistance and damage prevention where relevant.
- **Place damage counters** means place the specified number of counters directly. One counter represents 10 damage. This is an effect, not ordinary attack damage, even when an attack is the source of the instruction. Do not automatically apply Weakness, Resistance, or effects that prevent only attack damage.
- Conditions and other card effects can place counters outside an attack. Effects that prevent effects/counter placement are not interchangeable with effects that prevent damage; follow the wording or consult the Judge.
- Damage counters track the accumulated damage taken; placing a counter is not declaring another attack or consuming a turn by itself. Removing counters/healing still requires the appropriate rule, effect, or authorized correction.

A Pokémon is Knocked Out when its **remaining HP is zero or less** (recorded damage reaches or exceeds its current HP), whether from attack damage, counter placement, a combination, or a reduction in current HP. The cause matters to card triggers: counter placement is not attack damage. Check all applicable prevention, replacement, and triggered effects and their actual timing; do not assume the normal discard destination always applies.

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

When remaining HP is zero or less, resolve a Knock Out. Normally discard the Pokémon, all underlying evolution cards, and all attachments to the owner's discard pile. Consider **all applicable replacement/triggered effects**, not just a selected Tool, before assigning destinations; resolve conflicting or unclear interactions with the Judge.

The opposing player normally takes **one of their own Prize cards** for each opposing Pokémon Knocked Out, including Knock Outs from Checkup or other effects. Card rules can change the award; many Pokémon ex award two. Read the actual rule box and applicable modifiers rather than inferring every award from a name suffix. Taking a Prize moves that hidden card to hand, not a card from the deck.

### Rescue Scarf: exact printing and limited trigger

**Rescue Scarf, Dragons Exalted 115/124** reads: “If the Pokémon this card is attached to is Knocked Out by damage from an attack, put that Pokémon into your hand. (Discard all cards attached to that Pokémon.)” Source: [Bulbapedia's attributed card-text entry](https://bulbapedia.bulbagarden.net/wiki/Rescue_Scarf_(Dragons_Exalted_115)), with its [English card scan](https://archives.bulbagarden.net/media/upload/3/31/RescueScarfDragonsExalted115.jpg). This is a checked card-database transcription, not a new official interaction ruling.

The destination in this text is **hand for the Pokémon**, **discard for attached cards**, including Rescue Scarf and Energy—not a return of every attachment to hand. The trigger requires a Knock Out **by damage from an attack**. Placing damage counters, even by an attack, is an effect rather than attack damage and does not satisfy that trigger; neither do Poison/Burn counters. The text does not require that the attack belong to the opponent. Other applicable effects can affect resolution; exact evolution-stack or competing replacement/trigger questions require the relevant ruling rather than an invented ordering.

Returning the Pokémon instead of discarding it does **not undo the Knock Out** or by itself prevent the normal Prize award. A separate applicable Prize modifier is needed to change that award.

### Promotion timing

If an Active Pokémon is Knocked Out **during a turn**, resolve the Knock Out, applicable effects, Prizes, and required promotion before proceeding to Pokémon Checkup. If the turn continues after an Ability/effect Knock Out, resume that same interrupted turn after promotion—no extra draw or turn allowance. If an attack ended the turn, promotion still precedes Checkup.

If an Active Pokémon is Knocked Out **during Pokémon Checkup**, finish the required Checkup resolutions, then handle the Knock Out, Prizes, and promotion before the next player's turn-start draw. An empty Active Spot with an available Benched replacement is a mandatory promotion state, not permission to take unrelated actions or an automatic loss. Simultaneous cases still require the applicable ordering ruling.


Three ordinary win conditions:

1. **Take all your Prize cards.** Six start the game, but multi-Prize Knock Outs can reduce how many Pokémon must be defeated. Officially applied penalties can alter the relevant threshold as discussed below.
2. **Leave the opponent with no Pokémon in play.** An empty Active Spot pending promotion is not a loss if a Benched Pokémon can be promoted. Promotion is not a new turn and does not grant an extra draw.
3. **The opponent cannot draw their mandatory turn-start card.** An empty deck during another action is not itself an immediate deck-out loss.

An ordinary effect that draws more cards than remain draws as many as possible unless its text or a cost requirement changes play/resolution. A short draw during a turn does not itself cause deck-out. Milling the final card threatens the next mandatory draw; recovery or another win may intervene.

**Judge consultation required:** simultaneous Knock Outs, both players meeting victory conditions together, and complex replacement/trigger ordering need applicable official rulings. Do not decide these cases arbitrarily or award a winner simply because one player's condition was checked first.

## 10. Fair play, errors, and penalties

Win **fairly within the rules**. Intentional cheating is not tolerated. Legal bluffing, surprise cards, an off-meta deck, and bad luck are not cheating.

Distinguish accidental procedural/rules errors, illegal decks, repeated errors, and intentional cheating. Pause a disputed game and consult the Judge about the facts, authorized correction, and applicable penalty. Do not invent a convenient redraw or reshuffle to conceal an error. An attempted move rejected before it occurs is not automatically a tournament infraction or proof of intent.

### Shared responsibility for a valid board state

Both players must help maintain a valid game state, not only watch their own side. Announce actions and choices clearly, allow required responses/inspection, and track damage counters, attachments, conditions, available spaces, once-per-turn actions, Prize awards, and the turn/Checkup sequence accurately.

Players normally carry out card instructions themselves; automatic software resolution is a convenience, not the source of legality. Check that an effect is authorized, use its correct targets and scope, and complete mandatory consequences such as Knock Outs and promotions. Do not silently leave an impossible board state or exploit an unnoticed error.

If either player notices a suspected illegal action, inconsistent counter total, unauthorized hidden-information access, or unresolved interaction, stop progression and call the Judge. Preserve the relevant state and explain what happened; do not secretly repair it, reveal additional hidden cards, or accuse a player of intentional cheating without establishing the facts. Corrections and sanctions follow applicable policy, not a negotiated advantage.

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
- [Rescue Scarf, Dragons Exalted 115/124: Bulbapedia card entry and transcription](https://bulbapedia.bulbagarden.net/wiki/Rescue_Scarf_(Dragons_Exalted_115)) and [English scan](https://archives.bulbagarden.net/media/upload/3/31/RescueScarfDragonsExalted115.jpg): exact attack-damage Knock Out trigger, Pokémon-to-hand instruction, and attachment-discard instruction; this third-party card source does not establish every interaction ruling.
- Trainer evidence checked on 2026-10-28: [Buddy-Buddy Poffin TEF 144/162 scan](https://archives.bulbagarden.net/media/upload/6/68/Buddy-BuddyPoffinTemporalForces144.jpg) and [Potion SWSH 177/202 scan](https://archives.bulbagarden.net/media/upload/a/a3/PotionSwordShield177.jpg); exact English text, not current-format eligibility. Section 5 links the associated database pages, the indexed general no-effect/search rulings, and the inaccessible Potion ruling with their access limits. No Poffin-specific ruling or newly convened Judge panel is asserted.

Unresolved findings must remain labeled until the Judge process supplies adequate evidence: devolution eligibility/cleanup, unusual condition-application timing, simultaneous game-end/replacement interactions, and penalty boundary cases. The older rulebook passages do not establish current rotation, current bans, or full 2026 rules compliance. A card image or prototype with a plausible name does not verify its printed mechanics.
