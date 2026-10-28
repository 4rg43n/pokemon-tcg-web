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
**Back to game** preserves the match and keeps edits in memory until reload.
**New Game** restarts with the decks chosen for the current match. On a fresh
page load, open the builder and start a match to use saved decks.

To check the engine and deck validation, run `node --test tests/decks.test.mjs`.
Serve the repository with `python -m http.server 8765` for local browser testing.
All browser module and stylesheet cache keys are v16.
