import test from 'node:test';
import assert from 'node:assert/strict';
import {species} from '../src/cards.js';
import {catalog,validateDeck} from '../src/decks.js';
import {newGame,dispatch} from '../src/engine.js';
const pony=species.findIndex(c=>c.name==='Ponyta'),rapid=species.findIndex(c=>c.name==='Rapidash');
const mon=i=>({...structuredClone(species[i]),speciesIndex:i,energies:['Fire'],energy:1,damage:0,playedTurn:0,under:[],tool:null});
const apply=(s,a,p)=>{const r=dispatch(s,a,p);assert.equal(r.error,undefined);return r.state;};
function game(){const s=newGame();s.phase='playing';s.round=3;s.players[0].active=mon(pony);s.players[1].active=mon(pony);return s;}
test('both cards are in catalog and evolution prerequisite is checked',()=>{assert.ok(catalog.find(c=>c.card.species===pony));assert.ok(catalog.find(c=>c.card.species===rapid));assert.ok(validateDeck({counts:{[`pokemon-${rapid}`]:4,'pokemon-2':4,'energy-Fire':52}}).warnings.some(x=>x.includes('no Ponyta')));});
test('Collect draws one and ends the turn without damage',()=>{const s=game(),n=s.players[0].hand.length,deck=s.players[0].deck.length;const r=apply(s,'attack');assert.equal(r.players[0].hand.length,n+1);assert.equal(r.players[0].deck.length,deck-1);assert.equal(r.players[1].active.damage,0);assert.equal(r.turn,1);});
test('Ponyta evolves and Hurried Gait works once per Pokemon per turn on Active and Bench',()=>{let s=game();s.players[0].hand=[{kind:'pokemon',species:rapid}];s.selection=0;s=apply(s,'play',{target:'active'});assert.equal(s.players[0].active.name,'Rapidash');s.players[0].bench=[mon(rapid)];for(const target of ['active','bench']){const n=s.players[0].hand.length;s=apply(s,'ability',{target,slot:0});assert.equal(s.players[0].hand.length,n+1);assert.ok(dispatch(s,'ability',{target,slot:0}).error);}s=apply(s,'end');s=apply(s,'end');assert.equal(s.players[0].active.abilityUsed,false);s=apply(s,'ability',{target:'active'});});
