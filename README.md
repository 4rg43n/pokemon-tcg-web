# pokemon-tcg-web
Pokemon tcg ai test

https://4rg43n.github.io/pokemon-tcg-web/

## Deck builder (v16)

Choose **Build Decks** to edit a separate deck for each player. Search or filter
supported cards, inspect a card by tapping its name, and use +/− to adjust copies.
A deck needs exactly 60 cards and at least one Basic Pokémon before it can be
saved or used. Evolution prerequisites and more than four copies of a non-Energy
card produce warnings; prototype play permits these warnings, including the
existing starter decks. These are educational decks, not certified official
format decklists. The card pool and simplified effects remain unchanged.

**Save both decks** stores both completed decks on the current browser only.
**Start new game with these decks** asks before replacing the current match.
**Back to menu** preserves the match and keeps edits in memory until reload.
**New Game** restarts with the decks chosen for the current match. On a fresh
page load, open the builder and start a match to use saved decks.

To check the engine and deck validation, run `node --test tests/decks.test.mjs`.
Serve the repository with `python -m http.server 8765` for local browser testing.
All browser module and stylesheet cache keys are v22.

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
