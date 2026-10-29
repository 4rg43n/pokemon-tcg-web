import test from "node:test";
import assert from "node:assert/strict";
import {newGame, dispatch, pokemon} from "./engine.js";
import {energyCard, pokemonCard, trainerCard} from "./decks.js";
import {encodeState, decodeState} from "./history.js";

function playing(){
 const state=newGame();
 state.phase="playing";state.turn=0;state.round=3;
 for(const p of state.players){
  p.active=pokemon(2);p.active.playedTurn=1;p.bench=[];p.hand=[];
  p.deck=[energyCard("Fire"),energyCard("Lightning")];
  p.discard=[];p.lostZone=[];p.prizeCards=Array.from({length:6},()=>energyCard("Fire"));p.prizes=6;
 }
 return state;
}
function apply(state,action,payload){
 const result=dispatch(state,action,payload);
 assert.equal(result.error,undefined,result.error);
 return result.state;
}
function totalCards(state){
 return state.players.reduce((total,p)=>total+p.hand.length+p.deck.length+p.discard.length+p.lostZone.length+p.prizeCards.length+[p.active,...p.bench].filter(Boolean).reduce((n,mon)=>n+1+mon.under.length+mon.energies.length+(mon.tool?1:0),0),0);
}

test("setup draws the first player's mandatory card exactly once",()=>{
 let state=newGame();
 state.players[0].active=pokemon(2);state.players[1].active=pokemon(3);
 const before=state.players[0].deck.length;
 state=apply(state,"ready");
 assert.equal(state.players[0].hand.length,7);
 state=apply(state,"ready");
 assert.equal(state.phase,"playing");assert.equal(state.turn,0);
 assert.equal(state.players[0].hand.length,8);assert.equal(state.players[0].deck.length,before-1);
 assert.ok(dispatch(state,"ready").error);
});

test("first player's opening Supporter is blocked but second player's is allowed",()=>{
 let state=playing();state.round=1;state.players[0].hand=[trainerCard("Professor's Research")];state.selection=0;
 const blocked=dispatch(state,"trainer");
 assert.ok(blocked.error);assert.equal(blocked.state,state);
 state.turn=1;state.round=2;state.players[1].hand=[trainerCard("Professor's Research")];
 state=apply(state,"trainer");
 assert.equal(state.players[1].hand.length,2);assert.equal(state.players[1].supporterUsed,true);
 assert.equal(state.winner,null,"a short effect draw is not a deck-out loss");
});

test("second player cannot evolve on their first turn; later evolution retains the stack",()=>{
 let state=playing();state.turn=1;state.round=2;
 state.players[1].hand=[pokemonCard(6)];state.selection=0;
 state.players[1].active.damage=20;state.players[1].active.energies=["Lightning"];
 state.players[1].active.energy=1;state.players[1].active.tool=trainerCard("Air Balloon");
 assert.ok(dispatch(state,"play",{target:"active"}).error);
 state.round=4;state=apply(state,"play",{target:"active"});
 const evolved=state.players[1].active;
 assert.equal(evolved.name,"Raichu");assert.equal(evolved.damage,20);
 assert.deepEqual(evolved.energies,["Lightning"]);assert.deepEqual(evolved.under,[2]);
 assert.equal(evolved.tool.name,"Air Balloon");assert.equal(evolved.playedTurn,4);
});

test("setup rejects Energy and occupied Basic drops do not append a Pokémon",()=>{
 let state=playing();state.phase="setup";state.players[0].hand=[energyCard("Fire")];state.selection=0;
 assert.ok(dispatch(state,"play",{target:"active"}).error);
 state.phase="playing";state.players[0].hand=[pokemonCard(2)];state.players[0].bench=[pokemon(4)];
 const blocked=dispatch(state,"play",{target:"bench",slot:0});
 assert.ok(blocked.error);assert.equal(blocked.state,state);
 state=apply(state,"play",{target:"bench",slot:1});
 assert.equal(state.players[0].bench.length,2);assert.equal(state.players[0].hand.length,0);
});

test("manual counter placement/removal changes damage without attacking or ending turn",()=>{
 let state=playing();const originalDeck=structuredClone(state.players[1].deck);
 const payload={player:1,target:"active",counters:2,reason:"Resolving a declared card effect"};
 state=apply(state,"adjustDamage",payload);
 assert.equal(state.players[1].active.damage,20);assert.equal(state.turn,0);assert.equal(state.round,3);
 assert.deepEqual(state.players[1].deck,originalDeck);
 state=apply(state,"adjustDamage",{...payload,counters:-1});
 assert.equal(state.players[1].active.damage,10);
 const rejected=dispatch(state,"adjustDamage",{...payload,counters:-2});
 assert.ok(rejected.error);assert.equal(rejected.state,state);
 assert.ok(dispatch(state,"adjustDamage",{...payload,reason:""}).error);
});

test("manual benched Knock Out moves the full stack and awards a Prize without a new turn",()=>{
 let state=playing();
 const mon=pokemon(8);mon.under=[3];mon.energies=["Fire","Fire"];mon.energy=2;mon.tool=trainerCard("Air Balloon");mon.damage=130;
 state.players[1].bench=[mon];const total=totalCards(state);
 state=apply(state,"adjustDamage",{player:1,target:"bench",slot:0,counters:1,reason:"Counter-placement effect"});
 assert.equal(state.players[1].bench.length,0);assert.equal(state.players[1].discard.length,5);
 assert.equal(state.players[0].prizes,5);assert.equal(state.players[0].hand.length,1);
 assert.equal(state.phase,"playing");assert.equal(state.turn,0);assert.equal(state.round,3);
 assert.equal(totalCards(state),total);
});

test("manual Active Knock Out promotion returns to the interrupted turn with no draw",()=>{
 let state=playing();state.players[1].active.damage=60;state.players[1].bench=[pokemon(4)];
 state.players[0].attached=true;state.players[1].supporterUsed=true;
 state.players[1].bench[0].abilityUsed=true;
 state.players[1].lostZone=[trainerCard("Potion")];
 const deck=structuredClone(state.players[1].deck),hand=structuredClone(state.players[1].hand);
 state=apply(state,"adjustDamage",{player:1,target:"active",counters:1,reason:"Manual counter effect"});
 assert.equal(state.phase,"replacement");assert.equal(state.turn,1);assert.equal(state.resumeTurn,0);
 state=decodeState(encodeState(state));
 assert.equal(state.resumeTurn,0);assert.deepEqual(state.players[1].lostZone,[trainerCard("Potion")]);
 state=apply(state,"promote",{slot:0});
 assert.equal(state.turn,0);assert.equal(state.round,3);assert.equal(state.resumeTurn,undefined);
 assert.deepEqual(state.players[1].deck,deck);assert.deepEqual(state.players[1].hand,hand);
 assert.equal(state.players[0].attached,true);assert.equal(state.players[1].supporterUsed,true);
 assert.equal(state.players[1].active.abilityUsed,true);
});

test("manual Knock Outs resolve no-Pokémon and last-Prize wins",()=>{
 let state=playing();state.players[0].active.damage=60;
 state=apply(state,"adjustDamage",{player:0,target:"active",counters:1,reason:"Counter effect"});
 assert.equal(state.winner,1);
 state=playing();state.players[1].active.damage=60;state.players[1].bench=[pokemon(4)];
 state.players[0].prizeCards=[energyCard("Fire")];state.players[0].prizes=1;
 state=apply(state,"adjustDamage",{player:1,target:"active",counters:1,reason:"Counter effect"});
 assert.equal(state.winner,0);assert.equal(state.players[0].prizes,0);assert.equal(state.resumeTurn,undefined);
});

test("manual inspection declares access without moving cards or revealing identities in logs",()=>{
 const state=playing();
 assert.ok(dispatch(state,"inspectZone",{player:1,zone:"deck",reason:""}).error);
 assert.ok(dispatch(state,"inspectZone",{player:1,zone:"unknown",reason:"A card"}).error);
 for(const player of [0,1])for(const zone of ["hand","deck","discard","lostZone","prizeCards"]){
  const next=apply(state,"inspectZone",{player,zone,reason:"Declared effect permission"});
  assert.deepEqual(next.players,state.players);assert.equal(next.turn,state.turn);assert.equal(next.round,state.round);
  assert.equal(next.log.length,state.log.length+1);
  assert.ok(!next.log[0].includes("Lightning Energy"));
 }
});

test("passing draws for the incoming player and deck-out happens only on their mandatory draw",()=>{
 let state=playing();state.players[0].deck=[];state.players[1].deck=[energyCard("Lightning")];
 state=apply(state,"end");
 assert.equal(state.turn,1);assert.equal(state.players[1].hand.length,1);
 assert.equal(state.players[1].deck.length,0);assert.equal(state.winner,null);
 state=apply(state,"end");
 assert.equal(state.turn,0);assert.equal(state.winner,1);
});

test("a non-damaging draw attack ends the turn without causing short-effect-draw deck-out",()=>{
 let state=playing();state.players[0].active=pokemon(9);
 state.players[0].active.energies=["Fire"];state.players[0].active.energy=1;
 state.players[0].deck=[];
 state=apply(state,"attack",{index:0});
 assert.equal(state.turn,1);assert.equal(state.round,4);assert.equal(state.winner,null);
 assert.equal(state.players[1].active.damage,0);
});

test("an attack Knock Out requires promotion before the next turn's single draw",()=>{
 let state=playing();state.players[0].active=pokemon(6);
 state.players[0].active.energies=["Lightning","Lightning","Fire"];state.players[0].active.energy=3;
 state.players[1].bench=[pokemon(4)];
 const deckCount=state.players[1].deck.length;
 state=apply(state,"attack",{index:0});
 assert.equal(state.phase,"replacement");assert.equal(state.turn,1);assert.equal(state.round,3);
 assert.equal(state.players[1].hand.length,0);assert.equal(state.players[1].deck.length,deckCount);
 assert.equal(state.players[1].active,null);assert.equal(state.players[0].prizes,5);
 assert.ok(dispatch(state,"end").error);
 state=apply(state,"promote",{slot:0});
 assert.equal(state.phase,"playing");assert.equal(state.round,4);
 assert.equal(state.players[1].hand.length,1);assert.equal(state.players[1].deck.length,deckCount-1);
});
