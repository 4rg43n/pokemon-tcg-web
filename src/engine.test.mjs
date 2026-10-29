import test from "node:test";
import assert from "node:assert/strict";
import {newGame, dispatch, pokemon} from "./engine.js";
import {catalog, energyCard, pokemonCard, trainerCard} from "./decks.js?v=60";
import {species} from "./cards.js?v=60";
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
 return (state.stadium?1:0)+state.players.reduce((total,p)=>total+p.hand.length+p.deck.length+p.discard.length+p.lostZone.length+p.prizeCards.length+[p.active,...p.bench].filter(Boolean).reduce((n,mon)=>n+1+mon.under.length+mon.energies.length+(mon.tool?1:0),0),0);
}
function speciesIndex(name){
 const index=species.findIndex(mon=>mon.name===name);
 assert.notEqual(index,-1,"Expected an existing species: "+name);
 return index;
}
function trainer(name){
 const entry=catalog.find(entry=>entry.card.kind==="trainer"&&entry.card.name===name);
 assert.ok(entry,"Expected an existing Trainer: "+name);
 return structuredClone(entry.card);
}
function rejectedTrainer(state,payload){
 const before=structuredClone(state),result=dispatch(state,"trainer",payload);
 assert.ok(result.error);
 assert.equal(result.state,state);
 assert.deepEqual(state,before,"Rejected effects must not consume or move cards.");
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

test("Poffin puts eligible Basics directly onto the Bench and conserves cards",()=>{
 let state=playing();
 const pikachu=speciesIndex("Pikachu"),charcadet=speciesIndex("Charcadet");
 const growlithe=speciesIndex("Growlithe"),raichu=speciesIndex("Raichu");
 state.players[0].hand=[trainer("Buddy-Buddy Poffin")];state.selection=0;
 state.players[0].deck=[pokemonCard(pikachu),pokemonCard(charcadet),pokemonCard(growlithe),pokemonCard(raichu)];
 const total=totalCards(state);
 for(const searchIndices of [[2],[3],[0,0],[0,1,2]])rejectedTrainer(state,{searchIndices});
 state=apply(state,"trainer",{searchIndices:[0,1]});
 assert.deepEqual(state.players[0].bench.map(mon=>mon.speciesIndex).sort((a,b)=>a-b),[pikachu,charcadet].sort((a,b)=>a-b));
 assert.ok(state.players[0].bench.every(mon=>mon.playedTurn===state.round));
 assert.equal(state.players[0].hand.length,0);
 assert.deepEqual(state.players[0].discard,[trainer("Buddy-Buddy Poffin")]);
 assert.equal(state.players[0].deck.length,2);
 assert.ok(state.players[0].deck.some(card=>card.species===growlithe));
 assert.ok(state.players[0].deck.some(card=>card.species===raichu));
 assert.equal(totalCards(state),total);
});

test("Poffin rejects a full Bench even when finding nothing and respects remaining slots",()=>{
 const state=playing(),basic=speciesIndex("Pikachu");
 state.players[0].hand=[trainer("Buddy-Buddy Poffin")];state.selection=0;
 state.players[0].deck=[pokemonCard(basic),pokemonCard(basic)];
 state.players[0].bench=Array.from({length:5},()=>pokemon(basic));
 rejectedTrainer(state,{searchIndices:[]});
 rejectedTrainer(state,{searchIndices:[0]});
 state.players[0].bench.pop();
 rejectedTrainer(state,{searchIndices:[0,1]});
 const total=totalCards(state),next=apply(state,"trainer",{searchIndices:[1]});
 assert.equal(next.players[0].bench.length,5);
 assert.equal(next.players[0].hand.length,0);
 assert.equal(totalCards(next),total);
});

test("Gloria can Bench three Basics but cannot be used with a full Bench",()=>{
 let state=playing();
 const basics=["Pikachu","Charcadet","Growlithe"].map(speciesIndex);
 state.players[0].hand=[trainer("Gloria")];state.selection=0;
 state.players[0].deck=basics.map(pokemonCard);
 const total=totalCards(state);
 state=apply(state,"trainer",{searchIndices:[0,1,2]});
 assert.deepEqual(state.players[0].bench.map(mon=>mon.speciesIndex).sort((a,b)=>a-b),basics.slice().sort((a,b)=>a-b));
 assert.equal(state.players[0].supporterUsed,true);
 assert.equal(state.players[0].hand.length,0);
 assert.equal(state.players[0].deck.length,0);
 assert.equal(totalCards(state),total);
 state=playing();state.players[0].hand=[trainer("Gloria")];state.selection=0;
 state.players[0].bench=Array.from({length:5},()=>pokemon(basics[0]));
 rejectedTrainer(state,{searchIndices:[]});
 state.players[0].bench.pop();
 state.players[0].deck=basics.map(pokemonCard);
 rejectedTrainer(state,{searchIndices:[0,1]});
});

test("Potion requires a damaged target and heals only that Pokémon without losing cards",()=>{
 for(const target of ["active","bench"]){
  let state=playing();state.players[0].bench=[pokemon(speciesIndex("Growlithe"))];
  state.players[0].hand=[trainer("Potion")];state.selection=0;
  const payload={target,slot:0};
  rejectedTrainer(state,{target:"bench",slot:4});
  rejectedTrainer(state,payload);
  const mon=target==="active"?state.players[0].active:state.players[0].bench[0];
  mon.damage=target==="active"?20:50;
  const total=totalCards(state);
  state=apply(state,"trainer",payload);
  assert.equal((target==="active"?state.players[0].active:state.players[0].bench[0]).damage,target==="active"?0:20);
  assert.equal((target==="active"?state.players[0].bench[0]:state.players[0].active).damage,0);
  assert.equal(state.players[0].hand.length,0);
  assert.deepEqual(state.players[0].discard,[trainer("Potion")]);
  assert.equal(state.turn,0);assert.equal(state.round,3);
  assert.equal(totalCards(state),total);
 }
});

test("Trainers' Mail searches only the top four cards and never finds another Mail",()=>{
 let state=playing();state.players[0].hand=[trainer("Trainers' Mail")];state.selection=0;
 const chosen=trainer("Air Balloon"),outside=trainer("Nest Ball");
 state.players[0].deck=[trainer("Trainers' Mail"),energyCard("Fire"),pokemonCard(speciesIndex("Pikachu")),chosen,outside];
 for(const searchIndices of [[0],[1],[2],[4],[-1],[1.5],[3,4]])rejectedTrainer(state,{searchIndices});
 const total=totalCards(state);
 state=apply(state,"trainer",{searchIndices:[3]});
 assert.deepEqual(state.players[0].hand,[chosen]);
 assert.deepEqual(state.players[0].discard,[trainer("Trainers' Mail")]);
 assert.equal(state.players[0].deck.length,4);
 assert.ok(state.players[0].deck.some(card=>card.name==="Trainers' Mail"));
 assert.ok(state.players[0].deck.some(card=>card.name===outside.name));
 assert.equal(totalCards(state),total);
});

test("Trainers' Mail permits no result when fewer than four cards remain",()=>{
 let state=playing();state.players[0].hand=[trainer("Trainers' Mail")];state.selection=0;
 state.players[0].deck=[trainer("Trainers' Mail"),energyCard("Fire")];
 rejectedTrainer(state,{searchIndices:[2]});
 const total=totalCards(state);
 state=apply(state,"trainer",{searchIndices:[]});
 assert.equal(state.players[0].hand.length,0);assert.equal(state.players[0].deck.length,2);
 assert.deepEqual(state.players[0].discard,[trainer("Trainers' Mail")]);
 assert.equal(totalCards(state),total);
});

test("Earthen Vessel requires exactly one other hand card as cost even for no result",()=>{
 for(const searchIndices of [[],[0,1]]){
  let state=playing();
  const cost=trainer("Potion"),vessel=trainer("Earthen Vessel"),kept=trainer("Air Balloon");
  state.players[0].hand=[cost,vessel,kept];state.selection=1;
  state.players[0].deck=[energyCard("Fire"),energyCard("Lightning"),pokemonCard(speciesIndex("Pikachu"))];
  for(const discardCostIndices of [undefined,[],[1],[0,2],[0,0],[-1],[3],[0.5]]){
   rejectedTrainer(state,{searchIndices,discardCostIndices});
  }
  rejectedTrainer(state,{searchIndices:[2],discardCostIndices:[0]});
  const total=totalCards(state);
  state=apply(state,"trainer",{searchIndices,discardCostIndices:[0]});
  assert.equal(state.players[0].hand.some(card=>card.name===cost.name||card.name===vessel.name),false);
  assert.ok(state.players[0].hand.some(card=>card.name===kept.name));
  assert.equal(state.players[0].hand.filter(card=>card.kind==="energy").length,searchIndices.length);
  assert.equal(state.players[0].discard.length,2);
  assert.ok(state.players[0].discard.some(card=>card.name===cost.name));
  assert.ok(state.players[0].discard.some(card=>card.name===vessel.name));
  assert.equal(state.players[0].deck.length,3-searchIndices.length);
  assert.equal(totalCards(state),total);
 }
 const state=playing();state.players[0].hand=[trainer("Earthen Vessel")];state.selection=0;
 rejectedTrainer(state,{searchIndices:[],discardCostIndices:[]});
});

test("Arven selects at most one Item and one Tool, not two of either type",()=>{
 let state=playing();state.players[0].hand=[trainer("Arven")];state.selection=0;
 const item=trainer("Potion"),tool=trainer("Air Balloon");
 state.players[0].deck=[item,trainer("Nest Ball"),tool,trainer("Float Stone"),trainer("Nemona"),trainer("Silent Lab"),energyCard("Fire")];
 for(const searchIndices of [[0,1],[2,3],[4],[5],[6],[0,2,3]])rejectedTrainer(state,{searchIndices});
 const total=totalCards(state);
 state=apply(state,"trainer",{searchIndices:[0,2]});
 assert.equal(state.players[0].hand.length,2);
 assert.ok(state.players[0].hand.some(card=>card.name===item.name));
 assert.ok(state.players[0].hand.some(card=>card.name===tool.name));
 assert.equal(state.players[0].deck.length,5);
 assert.deepEqual(state.players[0].discard,[trainer("Arven")]);
 assert.equal(state.players[0].supporterUsed,true);
 assert.equal(totalCards(state),total);
});

test("Arven permits finding only one type or no cards",()=>{
 for(const searchIndices of [[],[0],[1]]){
  let state=playing();state.players[0].hand=[trainer("Arven")];state.selection=0;
  state.players[0].deck=[trainer("Potion"),trainer("Air Balloon")];
  const total=totalCards(state);
  state=apply(state,"trainer",{searchIndices});
  assert.equal(state.players[0].hand.length,searchIndices.length);
  assert.equal(state.players[0].deck.length,2-searchIndices.length);
  assert.equal(state.players[0].supporterUsed,true);
  assert.equal(totalCards(state),total);
 }
});

test("Hisuian Heavy Ball swaps its original printing into the Prizes without duplication",()=>{
 let state=playing();
 const ball=trainer("Hisuian Heavy Ball"),basic=pokemonCard(speciesIndex("Pikachu"));
 state.players[0].hand=[trainer("Potion"),ball];state.selection=1;
 state.players[0].prizeCards=[energyCard("Fire"),basic,pokemonCard(speciesIndex("Raichu"))];
 state.players[0].prizes=3;
 rejectedTrainer(state,{searchIndices:[2]});
 const total=totalCards(state);
 state=apply(state,"trainer",{searchIndices:[1]});
 assert.deepEqual(state.players[0].hand,[trainer("Potion"),basic]);
 assert.equal(state.players[0].prizes,3);assert.equal(state.players[0].prizeCards.length,3);
 assert.deepEqual(state.players[0].prizeCards.find(card=>card.name===ball.name),ball);
 assert.equal(state.players[0].discard.length,0);
 assert.equal(state.players[0].prizeCards.some(card=>card.kind==="pokemon"&&card.species===basic.species),false);
 assert.equal(totalCards(state),total);
});

test("Hisuian Heavy Ball with no result is discarded and leaves every Prize intact",()=>{
 let state=playing();const ball=trainer("Hisuian Heavy Ball");
 state.players[0].hand=[ball];state.selection=0;
 const prizes=structuredClone(state.players[0].prizeCards),total=totalCards(state);
 state=apply(state,"trainer",{searchIndices:[]});
 assert.equal(state.players[0].hand.length,0);
 assert.deepEqual(state.players[0].discard,[ball]);
 assert.deepEqual(state.players[0].prizeCards,prizes);
 assert.equal(state.players[0].prizes,prizes.length);
 assert.equal(totalCards(state),total);
});

test("Welder consumes the selected Supporter when Fire Energy removal shifts its hand index",()=>{
 for(const trainerIndex of [0,1,2]){
  let state=playing();const welder=trainer("Welder"),kept=trainer("Potion");
  const hand=[energyCard("Fire"),energyCard("Fire")];hand.splice(trainerIndex,0,welder);hand.push(kept);
  state.players[0].hand=hand;state.selection=trainerIndex;
  state.players[0].bench=[pokemon(speciesIndex("Growlithe"))];
  const drawn=[energyCard("Lightning"),pokemonCard(speciesIndex("Eevee")),trainer("Air Balloon")];
  state.players[0].deck=structuredClone(drawn);
  const total=totalCards(state),discardIndices=hand.flatMap((card,index)=>card.kind==="energy"?[index]:[]);
  state=apply(state,"trainer",{target:"bench",slot:0,discardIndices});
  assert.deepEqual(state.players[0].hand,[kept,...drawn]);
  assert.deepEqual(state.players[0].discard,[welder]);
  assert.deepEqual(state.players[0].bench[0].energies,["Fire","Fire"]);
  assert.equal(state.players[0].bench[0].energy,2);
  assert.deepEqual(state.players[0].active.energies,[]);
  assert.equal(state.players[0].deck.length,0);assert.equal(state.players[0].supporterUsed,true);
  assert.equal(totalCards(state),total);
 }
});

test("Rare Candy consumes the correct Trainer with the evolution on either side in hand",()=>{
 const basic=speciesIndex("Charmander"),stage2=speciesIndex("Charizard ex");
 for(const evolutionIndex of [0,2]){
  let state=playing();const candy=trainer("Rare Candy"),kept=trainer("Potion"),evolution=pokemonCard(stage2);
  state.players[0].hand=evolutionIndex===0?[evolution,candy,kept]:[kept,candy,evolution];state.selection=1;
  state.players[0].active=pokemon(basic);state.players[0].active.playedTurn=1;
  state.players[0].active.damage=20;state.players[0].active.energies=["Fire"];state.players[0].active.energy=1;
  state.players[0].active.tool=trainer("Air Balloon");
  const total=totalCards(state);
  state=apply(state,"trainer",{target:"active",evolutionIndex});
  assert.equal(state.players[0].active.speciesIndex,stage2);
  assert.deepEqual(state.players[0].active.under,[basic]);
  assert.equal(state.players[0].active.damage,20);
  assert.deepEqual(state.players[0].active.energies,["Fire"]);
  assert.equal(state.players[0].active.tool.name,"Air Balloon");
  assert.equal(state.players[0].active.evolvedThisTurn,true);
  assert.deepEqual(state.players[0].hand,[kept]);
  assert.deepEqual(state.players[0].discard,[candy]);
  assert.equal(totalCards(state),total);
 }
});

test("each Stadium enforces one play per turn and replacement discards to its original owner",()=>{
 const names=["Magma Basin","PokéStop","Silent Lab"];
 for(let i=0;i<names.length;i++){
  let state=playing();const first=trainer(names[i]),replacement=trainer(names[(i+1)%names.length]);
  state.players[0].hand=[first,replacement,first];state.players[1].hand=[first,replacement];state.selection=0;
  const total=totalCards(state);
  state=apply(state,"trainer");
  assert.deepEqual(state.stadium,first);assert.equal(state.stadiumOwner,0);
  assert.equal(state.players[0].hand.length,2);assert.equal(state.players[0].discard.length,0);
  assert.equal(totalCards(state),total);
  state.selection=0;rejectedTrainer(state,{});
  state=decodeState(encodeState(state));
  assert.equal(state.stadium.name,first.name);assert.equal(state.stadiumOwner,0);
  assert.equal(totalCards(state),total);
  state.selection=0;rejectedTrainer(state,{});
  state=apply(state,"end");
  state.selection=0;rejectedTrainer(state,{});
  state.selection=1;state=apply(state,"trainer");
  assert.equal(state.stadium.name,replacement.name);assert.equal(state.stadiumOwner,1);
  assert.equal(state.players[0].discard.length,1);assert.equal(state.players[0].discard[0].name,first.name);
  assert.equal(state.players[1].discard.length,0);
  assert.equal(totalCards(state),total);
  state=apply(state,"end");
  state.selection=1;state=apply(state,"trainer");
  assert.equal(state.stadium.name,first.name);assert.equal(state.stadiumOwner,0);
  assert.equal(state.players[1].discard.length,1);assert.equal(state.players[1].discard[0].name,replacement.name);
  assert.equal(totalCards(state),total);
 }
});

test("Stadium removal after history restore discards to its owner, not the Field Blower player",()=>{
 let state=playing();state.players[0].hand=[trainer("Magma Basin")];state.selection=0;
 state.players[1].hand=[trainer("Field Blower")];
 const total=totalCards(state);
 state=apply(state,"trainer");state=apply(state,"end");state=decodeState(encodeState(state));
 state.selection=0;state=apply(state,"trainer");
 assert.equal(state.stadium,null);
 assert.equal(state.players[0].discard.length,1);assert.equal(state.players[0].discard[0].name,"Magma Basin");
 assert.equal(state.players[1].discard.length,1);assert.equal(state.players[1].discard[0].name,"Field Blower");
 assert.equal(totalCards(state),total);
});

test("manual Knock Out promotion preserves the interrupted turn's Stadium play limit through history",()=>{
 let state=playing();state.players[0].hand=[trainer("PokéStop"),trainer("Silent Lab")];state.selection=0;
 state.players[1].active.damage=60;state.players[1].bench=[pokemon(speciesIndex("Eevee"))];
 state=apply(state,"trainer");
 state=apply(state,"adjustDamage",{player:1,target:"active",counters:1,reason:"Counter effect"});
 assert.equal(state.phase,"replacement");
 state=decodeState(encodeState(state));state=apply(state,"promote",{slot:0});
 assert.equal(state.turn,0);assert.equal(state.round,3);
 state.selection=0;rejectedTrainer(state,{});
 assert.equal(state.stadium.name,"PokéStop");
});

test("normal Knock Out promotion starts a turn in which the incoming player can play a Stadium",()=>{
 let state=playing();
 state.players[0].active=pokemon(speciesIndex("Raichu"));
 state.players[0].active.energies=["Lightning","Lightning","Fire"];state.players[0].active.energy=3;
 state.players[1].bench=[pokemon(speciesIndex("Eevee"))];
 state.players[1].hand=[trainer("Silent Lab")];state.players[1].stadiumPlayed=true;
 state=apply(state,"attack",{index:0});
 assert.equal(state.phase,"replacement");
 state=decodeState(encodeState(state));state=apply(state,"promote",{slot:0});
 assert.equal(state.turn,1);assert.equal(state.round,4);
 state.selection=0;const total=totalCards(state);state=apply(state,"trainer");
 assert.equal(state.stadium.name,"Silent Lab");assert.equal(state.stadiumOwner,1);
 assert.equal(totalCards(state),total);
});
