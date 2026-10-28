import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,dispatch} from '../src/engine.js';
import {species,retreatCost} from '../src/cards.js';
import {catalog,expandDeck} from '../src/decks.js';
import {cardStats} from '../src/card-stats.js';
const balloon=()=>({...catalog.find(c=>c.name==='Air Balloon').card});
const mon=i=>({...structuredClone(species[i]),speciesIndex:i,energies:[],energy:0,damage:0,playedTurn:0,evolvedThisTurn:false,under:[],tool:null});
function playing(){const s=newGame();s.phase='playing';s.round=3;s.players[0].active=mon(5);s.players[0].bench=[mon(2)];s.players[1].active=mon(4);s.players[0].hand=[balloon(),balloon()];s.selection=0;return s;}
function apply(s,action,payload){const r=dispatch(s,action,payload);assert.equal(r.error,undefined);return r.state;}
test('Air Balloon is available in decks and is a Pokemon Tool',()=>{assert.equal(balloon().subtype,'Pokémon Tool');assert.equal(expandDeck({counts:{'pokemon-2':4,'trainer-Air Balloon':4,'energy-Lightning':52}}).filter(c=>c.name==='Air Balloon').length,4);});
test('attach to Active or Bench; not discarded or counted as Energy',()=>{
 for(const target of ['active','bench']){const s=playing();const r=apply(s,'play',{target,slot:0});const attached=target==='active'?r.players[0].active:r.players[0].bench[0];assert.equal(attached.tool.name,'Air Balloon');assert.equal(attached.energy,0);assert.equal(r.players[0].discard.length,0);assert.equal(r.players[0].hand.length,1);assert.equal(s.players[0].active.tool,null);assert.equal(r.selection,null);}
});
test('reject occupied Tool, missing target, and setup attachment without consuming cards',()=>{
 const s=playing();assert.ok(dispatch(s,'trainer',{target:'other'}).error);assert.ok(dispatch(s,'trainer',{target:'bench',slot:4}).error);s.phase='setup';assert.ok(dispatch(s,'play',{target:'active'}).error);s.phase='playing';s.players[0].active.tool=balloon();assert.ok(dispatch(s,'trainer',{target:'active'}).error);assert.equal(s.players[0].hand.length,2);
});
test('retreat charges only discounted Energy and keeps Tool attached',()=>{
 let s=playing();s=apply(s,'trainer',{target:'active'});assert.equal(retreatCost(s.players[0].active),1);assert.ok(dispatch(s,'retreat').error);s.players[0].active.energy=1;s.players[0].active.energies=['Fire'];s=apply(s,'retreat');s=apply(s,'switch',{slot:0});assert.deepEqual(s.players[0].discard,[{kind:'energy',type:'Fire',name:'Fire Energy'}]);assert.equal(s.players[0].bench[0].tool.name,'Air Balloon');assert.equal(s.players[0].bench[0].energy,0);assert.ok(dispatch(s,'retreat').error);
});
test('retreat is free at base cost one or two, and icons show effective cost',()=>{
 for(const cost of [1,2]){let s=playing();s.players[0].active.retreat=cost;s=apply(s,'trainer',{target:'active'});assert.equal(retreatCost(s.players[0].active),0);assert.ok(cardStats(s.players[0].active).includes('Retreat: 0 Colorless Energy'));s=apply(s,'retreat');s=apply(s,'switch',{slot:0});assert.equal(s.players[0].discard.length,0);}
});
test('Tool survives Evolution, using the evolved Pokemon retreat cost',()=>{
 let s=playing();s.players[0].active=mon(2);s=apply(s,'trainer',{target:'active'});s.players[0].hand=[{kind:'pokemon',species:6}];s.selection=0;s=apply(s,'play',{target:'active'});assert.equal(s.players[0].active.name,'Raichu');assert.equal(s.players[0].active.tool.name,'Air Balloon');assert.equal(retreatCost(s.players[0].active),0);
});
test('Knocked Out Pokemon sends its Tool to Discard',()=>{
 let s=playing();s.players[0].active=mon(2);s.players[0].active.energies=['Lightning'];s.players[0].active.energy=1;s.players[1].active.tool=balloon();s.players[1].active.damage=60;s.players[1].bench=[mon(2)];s=apply(s,'attack');assert.equal(s.phase,'replacement');assert.equal(s.players[1].discard.filter(c=>c.name==='Air Balloon').length,1);
});
