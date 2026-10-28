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
All browser module and stylesheet cache keys are v18.

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
