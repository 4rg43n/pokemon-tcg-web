// Run with: node --test tests/history.test.mjs
import {test} from "node:test";
import assert from "node:assert/strict";
import {newGame,dispatch,pokemon} from "../src/engine.js?v=22";
import {pokemonCard as basic,energyCard as energy,trainerCard as trainer} from "../src/decks.js?v=22";
import {species} from "../src/cards.js?v=22";
import {encodeState,decodeState,viewFor,createRecorder,loadHistory} from "../src/history.js?v=22";

const clean=s=>({...structuredClone(s),log:[],selection:null});
function fakeStorage(initial={}){
 const entries=new Map(Object.entries(initial));
 return {entries,get length(){return entries.size;},key:i=>[...entries.keys()][i]??null,getItem:k=>entries.has(k)?entries.get(k):null,setItem:(k,v)=>{entries.set(k,String(v));},removeItem:k=>{entries.delete(k);}};
}
// Mirrors main.js act(): record only successful dispatches.
function step(rec,s,action,payload){const r=dispatch(s,action,payload);assert.equal(r.error,undefined,action+": "+r.error);rec.record(s,r.state,action,payload);return r.state;}
function setupBoth(rec,s){
 const picks=[];
 for(let n=0;n<2;n++){const p=s.players[s.turn],i=p.hand.findIndex(c=>c.kind==="pokemon"&&!species[c.species].stage);picks.push("P:"+p.hand[i].species);s=step(rec,s,"select",{index:i});s=step(rec,s,"play",{target:"active",slot:NaN});s=step(rec,s,"ready");}
 return {s,picks};
}
function started(storage=fakeStorage()){const rec=createRecorder(storage),s=newGame();rec.start(s);return {rec,s:setupBoth(rec,s).s};}
// Player 2's turn 6 with every zone and Pokémon field set to known values.
function craftedState(){
 const s=newGame();Object.assign(s,{phase:"playing",round:6,turn:1,selection:1});s.log.unshift("Player 1: Turn ended.");
 Object.assign(s.players[0],{hand:[basic(2),energy("Fire"),trainer("Potion")],deck:[energy("Fire"),basic(4),energy("Fire"),trainer("Quick Ball")],prizeCards:[energy("Lightning"),basic(4)],prizes:2,discard:[energy("Fire"),trainer("Potion"),basic(3),energy("Lightning")],
  active:{...pokemon(6),damage:40,energies:["Lightning","Lightning","Fire"],energy:3,playedTurn:1,evolvedThisTurn:true,under:[2]},bench:[{...pokemon(2),playedTurn:3,tool:trainer("Air Balloon")},pokemon(4)],attached:true,retreated:false,supporterUsed:true,mulligans:1});
 Object.assign(s.players[1],{hand:[trainer("Professor's Research"),energy("Fire"),basic(5)],deck:[trainer("Professor's Research"),basic(3),energy("Lightning"),energy("Fire"),basic(7)],prizeCards:[trainer("Professor's Research"),basic(5),energy("Fire")],prizes:3,discard:[energy("Fire")],
  active:{...pokemon(5),damage:10,energies:["Fire"],energy:1,playedTurn:2,abilityUsed:true},bench:[],attached:false,retreated:true,supporterUsed:false,mulligans:0});
 return s;
}
const craftedRecord=()=>({n:6,player:1,start:encodeState(craftedState()),actions:[{p:1,a:"end"}],log:["Player 2: Turn ended."]});

test("encodeState writes cards as codes and keeps only the Pokémon fields that change",()=>{
 const {players,...top}=encodeState(craftedState());
 assert.deepEqual(top,{v:1,round:6,turn:1,phase:"playing",winner:null});
 assert.deepEqual(players[0],{deck:["E:Fire","P:4","E:Fire","T:Quick Ball"],hand:["P:2","E:Fire","T:Potion"],prizeCards:["E:Lightning","P:4"],discard:["E:Fire","T:Potion","P:3","E:Lightning"],
  active:{s:6,d:40,e:["Lightning","Lightning","Fire"],t:1,ev:true,u:[2]},bench:[{s:2,t:3,o:"T:Air Balloon"},{s:4}],attached:true,retreated:false,supporterUsed:true,mulligans:1});
});

test("decodeState restores a freshly dealt game",()=>{
 const s=newGame();
 assert.deepEqual(decodeState(encodeState(s)),clean(s));
});

test("decodeState restores damage, energies, evolution stacks and turn flags",()=>{
 const s=craftedState();
 assert.deepEqual(decodeState(encodeState(s)),clean(s));
});

test("setup actions are recorded in turn 0 and the second Ready opens turn 1",()=>{
 const rec=createRecorder(fakeStorage()),dealt=newGame();rec.start(dealt);
 const {s,picks}=setupBoth(rec,structuredClone(dealt)),t=rec.turns();
 assert.equal(t.length,2);
 assert.equal(t[0].n,0);
 assert.deepEqual(decodeState(t[0].start),clean(dealt));
 assert.deepEqual(t[0].actions,[{p:0,a:"play",card:picks[0],target:"active"},{p:0,a:"ready"},{p:1,a:"play",card:picks[1],target:"active"},{p:1,a:"ready"}]);
 assert.deepEqual(t[0].log,[...s.log].reverse());
 assert.deepEqual({n:t[1].n,player:t[1].player,actions:t[1].actions,log:t[1].log},{n:1,player:0,actions:[],log:[]});
 assert.deepEqual(decodeState(t[1].start),clean(s));
});

test("select and deselect are not recorded",()=>{
 const rec=createRecorder(fakeStorage());let s=newGame();rec.start(s);
 s=step(rec,s,"select",{index:0});s=step(rec,s,"deselect");
 assert.deepEqual(rec.turns()[0].actions,[]);
});

test("play and trainer actions record the hand card and an integer slot",()=>{
 let {rec,s}=started();
 s.players[0].bench.push(pokemon(2));s.players[0].hand.push(energy("Fire"),trainer("Professor's Research"));
 s=step(rec,s,"select",{index:s.players[0].hand.length-2});s=step(rec,s,"play",{target:"bench",slot:0});
 s=step(rec,s,"select",{index:s.players[0].hand.length-1});s=step(rec,s,"trainer");
 assert.deepEqual(rec.turns()[1].actions,[{p:0,a:"play",card:"E:Fire",target:"bench",slot:0},{p:0,a:"trainer",card:"T:Professor's Research"}]);
});

test("Ball trainers record the discarded and found cards, not just their positions",()=>{
 let {rec,s}=started();const p=s.players[0];
 p.hand.push(trainer("Quick Ball"),energy("Fire"));p.deck.unshift(basic(2));
 const payload={discardIndices:[p.hand.length-1],searchIndex:0};
 s=step(rec,s,"select",{index:p.hand.length-2});s=step(rec,s,"trainer",payload);
 assert.deepEqual(rec.turns()[1].actions,[{p:0,a:"trainer",card:"T:Quick Ball",discardIndices:[payload.discardIndices[0]],searchIndex:0,discarded:["E:Fire"],found:"P:2"}]);
});

test("ending a turn opens the next turn from the state after the draw",()=>{
 let {rec,s}=started();
 s=step(rec,s,"end");
 const t=rec.turns();
 assert.equal(t.length,3);
 assert.deepEqual(t[1].actions,[{p:0,a:"end"}]);
 assert.deepEqual(t[1].log,["Player 1: Turn ended."]);
 assert.deepEqual([t[2].n,t[2].player],[2,1]);
 assert.deepEqual(decodeState(t[2].start),clean(s));
});

test("a knockout's promotion closes the attacker's turn and opens the defender's turn",()=>{
 let {rec,s}=started();s=step(rec,s,"end");
 const [p1,p2]=s.players;p1.bench.push(pokemon(2));p1.active.damage=p1.active.hp-10;p2.active.energies=["Fire","Fire","Fire"];p2.active.energy=3;
 const atk=p2.active.attacks.findIndex(a=>a.damage>0);
 s=step(rec,s,"attack",{index:atk});
 assert.equal(rec.turns().length,3);
 s=step(rec,s,"promote",{slot:0});
 const t=rec.turns();
 assert.equal(t.length,4);
 assert.deepEqual(t[2].actions,[{p:1,a:"attack",index:atk},{p:0,a:"promote",slot:0}]);
 assert.deepEqual([t[3].n,t[3].player],[3,0]);
 assert.deepEqual(decodeState(t[3].start),clean(s));
});

test("a knockout win saves the final state and opens no new turn",()=>{
 const store=fakeStorage();let {rec,s}=started(store);s=step(rec,s,"end");
 const [p1,p2]=s.players;p1.active.damage=p1.active.hp-10;p2.active.energies=["Fire","Fire","Fire"];p2.active.energy=3;
 s=step(rec,s,"attack",{index:p2.active.attacks.findIndex(a=>a.damage>0)});
 assert.equal(s.winner,1);
 assert.equal(rec.turns().length,3);
 assert.deepEqual(decodeState(rec.final()),clean(s));
 assert.deepEqual(JSON.parse(store.getItem("ptcg.game")),{v:1,turns:3,final:rec.final()});
});

test("a deck-out at the turn change saves the final state and opens no new turn",()=>{
 let {rec,s}=started();s.players[1].deck=[];
 s=step(rec,s,"end");
 assert.equal(s.winner,0);
 assert.equal(rec.turns().length,2);
 assert.deepEqual(decodeState(rec.final()),clean(s));
});

test("start() replaces a previous game's turn keys and leaves other keys alone",()=>{
 const store=fakeStorage({"ptcg.turn.0":"old","ptcg.turn.9":"old",other:"keep"});
 createRecorder(store).start(newGame());
 assert.deepEqual([...store.entries.keys()].sort(),["other","ptcg.game","ptcg.turn.0"]);
 assert.equal(store.getItem("other"),"keep");
 assert.deepEqual(JSON.parse(store.getItem("ptcg.game")),{v:1,turns:1,final:null});
 assert.equal(JSON.parse(store.getItem("ptcg.turn.0")).n,0);
});

test("each turn is saved under its own key, including the turn in progress, and loadHistory reads them back",()=>{
 const store=fakeStorage();let {rec,s}=started(store);s=step(rec,s,"end");
 s.players[1].hand.push(basic(3));s=step(rec,s,"select",{index:s.players[1].hand.length-1});s=step(rec,s,"play",{target:"bench",slot:0});
 assert.deepEqual([...store.entries.keys()].sort(),["ptcg.game","ptcg.turn.0","ptcg.turn.1","ptcg.turn.2"]);
 const loaded=loadHistory(store);
 assert.deepEqual(loaded.meta,{v:1,turns:3,final:null});
 assert.deepEqual(loaded.turns,rec.turns());
 assert.equal(loaded.turns[2].actions.length,1);
});

test("loadHistory returns null when no game is stored",()=>{
 assert.equal(loadHistory(fakeStorage()),null);
});

test("storage failures warn once and keep the history in memory",t=>{
 const full={...fakeStorage(),setItem(){throw new Error("QuotaExceededError");}};
 for(const storage of [full,null]){
  const warn=t.mock.method(console,"warn",()=>{});
  const {rec,s}=started(storage);step(rec,s,"end");
  assert.equal(warn.mock.callCount(),1);
  assert.equal(rec.turns().length,3);
  warn.mock.restore();
 }
});

test("a blocked localStorage global does not break recording or loading",t=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
 Object.defineProperty(globalThis,"localStorage",{configurable:true,get(){throw new Error("SecurityError");}});
 t.after(()=>{if(original)Object.defineProperty(globalThis,"localStorage",original);else delete globalThis.localStorage;});
 t.mock.method(console,"warn",()=>{});
 const rec=createRecorder();rec.start(newGame());
 assert.equal(rec.turns().length,1);
 assert.equal(loadHistory(),null);
});

test("viewFor gives the viewer their hand and deck-plus-prize counts but no card order",()=>{
 assert.deepEqual(viewFor(craftedRecord(),0).me,{hand:["P:2","E:Fire","T:Potion"],unknownPool:{"E:Fire":2,"P:4":2,"T:Quick Ball":1,"E:Lightning":1},deckCount:4,prizeCount:2,
  active:{s:6,d:40,e:["Lightning","Lightning","Fire"],t:1,ev:true,u:[2]},bench:[{s:2,t:3,o:"T:Air Balloon"},{s:4}],discard:["E:Fire","T:Potion","P:3","E:Lightning"],attached:true,retreated:false,supporterUsed:true,mulligans:1});
});

test("viewFor shows only public information about the opponent",()=>{
 const v=viewFor(craftedRecord(),0);
 assert.deepEqual(v.opponent,{handCount:3,deckCount:5,prizeCount:3,active:{s:5,d:10,e:["Fire"],t:2,ab:true},bench:[],discard:["E:Fire"],attached:false,retreated:true,supporterUsed:false,mulligans:0});
 // Professor's Research is only in Player 2's hidden zones.
 assert.equal(JSON.stringify(v).includes("Professor's Research"),false);
});

test("viewFor builds the view from the requested player's side",()=>{
 const v=viewFor(craftedRecord(),1);
 assert.deepEqual(v.me.hand,["T:Professor's Research","E:Fire","P:5"]);
 assert.deepEqual(v.me.unknownPool,{"T:Professor's Research":2,"P:3":1,"E:Lightning":1,"E:Fire":2,"P:7":1,"P:5":1});
 assert.equal(v.opponent.deckCount,4);
});

test("viewFor carries the turn header, actions and log without aliasing the record",()=>{
 const record=craftedRecord(),before=structuredClone(record),{me,opponent,...rest}=viewFor(record,0);
 assert.deepEqual(rest,{n:6,player:1,viewer:0,round:6,turn:1,phase:"playing",winner:null,actions:[{p:1,a:"end"}],log:["Player 2: Turn ended."]});
 me.bench.push({s:3});rest.actions.push({p:0,a:"end"});
 assert.deepEqual(record,before);
});
