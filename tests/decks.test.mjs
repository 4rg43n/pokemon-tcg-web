import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,defaultDeck,validateDeck,expandDeck} from '../src/decks.js';
import {newGame,dispatch} from '../src/engine.js';
const countsInGame=p=>[...p.hand,...p.deck,...p.prizeCards].reduce((counts,card)=>{const entry=catalog.find(c=>JSON.stringify(c.card)===JSON.stringify(card));assert.ok(entry);counts[entry.id]=(counts[entry.id]||0)+1;return counts;},{});
test('starter decks preserve the existing 60-card recipes',()=>{
 for(let i=0;i<2;i++){const deck=defaultDeck(i);assert.equal(expandDeck(deck).length,60);assert.deepEqual(validateDeck(deck).errors,[]);assert.ok(validateDeck(deck).warnings.some(x=>x.includes('four-copy')));const p=newGame([deck,deck]).players[0];assert.equal(p.hand.length,7);assert.equal(p.prizeCards.length,6);assert.equal(p.deck.length,47);assert.deepEqual(countsInGame(p),deck.counts);}
});
test('custom decks are dealt exactly, copied independently, and support setup',()=>{
 const decks=[{name:'Lightning',counts:{'pokemon-2':4,'energy-Lightning':56}},{name:'Fire',counts:{'pokemon-3':4,'energy-Fire':56}}];
 const game=newGame(decks);
 for(let i=0;i<2;i++)assert.deepEqual(countsInGame(game.players[i]),decks[i].counts);
 const index=game.players[0].hand.findIndex(c=>c.kind==='pokemon');
 const selected=dispatch(game,'select',{index}).state;
 const played=dispatch(selected,'play',{target:'active'});assert.equal(played.error,undefined);assert.equal(played.state.players[0].active.name,'Pikachu');
 assert.equal(dispatch(played.state,'ready').state.turn,1);
 assert.equal(decks[0].counts['pokemon-2'],4);
});
test('invalid decks fail before setup rather than looping on mulligans',()=>{
 for(const deck of [{counts:{'energy-Fire':60}},{counts:{'pokemon-2':1}},{counts:{'pokemon-2':-1,'energy-Fire':61}},{counts:{unknown:60}},null,{counts:{'pokemon-2':1.5}}]){
 assert.ok(validateDeck(deck).errors.length);assert.throws(()=>newGame([deck,defaultDeck(1)]));
 }
 assert.throws(()=>newGame([]));
});
test('unlimited Basic Energy and missing evolution warnings',()=>{
 assert.deepEqual(validateDeck({counts:{'pokemon-2':4,'energy-Lightning':56}}).warnings,[]);
 assert.ok(validateDeck({counts:{'pokemon-6':4,'pokemon-4':4,'energy-Lightning':52}}).warnings.some(x=>x.includes('no Pikachu')));
});
test('default new games and reset still work',()=>{
 const game=newGame();assert.equal(game.phase,'setup');assert.equal(game.players.length,2);assert.equal(dispatch(game,'reset').state.players[0].deck.length,47);
});
