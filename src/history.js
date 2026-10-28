// Per-turn game history for AI review: compact true-state snapshots in localStorage, current game only.
import {pokemon} from "./engine.js?v=22";
import {pokemonCard,energyCard,trainerCard} from "./decks.js?v=22";
const GAME_KEY="ptcg.game",TURN_PREFIX="ptcg.turn.";
const cardCode=c=>c.kind==="pokemon"?"P:"+c.species:c.kind==="energy"?"E:"+c.type:"T:"+c.name;
function fromCode(id){const i=id.indexOf(":"),kind=id.slice(0,i),value=id.slice(i+1);return kind==="P"?pokemonCard(Number(value)):kind==="E"?energyCard(value):trainerCard(value);}
function encodeMon(m){const c={s:m.speciesIndex};if(m.damage)c.d=m.damage;if(m.energies.length)c.e=[...m.energies];if(m.playedTurn)c.t=m.playedTurn;if(m.evolvedThisTurn)c.ev=true;if(m.under.length)c.u=[...m.under];if(m.tool)c.o=cardCode(m.tool);if(m.abilityUsed!==undefined)c.ab=m.abilityUsed;return c;}
function decodeMon(c){const e=c.e?[...c.e]:[];return {...pokemon(c.s),damage:c.d??0,energies:e,energy:e.length,playedTurn:c.t??0,evolvedThisTurn:!!c.ev,under:c.u?[...c.u]:[],tool:c.o?fromCode(c.o):null,...(c.ab!==undefined&&{abilityUsed:c.ab})};}
export function encodeState(s){
 return {v:1,round:s.round,turn:s.turn,phase:s.phase,winner:s.winner,winReason:s.winReason,players:s.players.map(p=>({deck:p.deck.map(cardCode),hand:p.hand.map(cardCode),prizeCards:p.prizeCards.map(cardCode),discard:p.discard.map(cardCode),active:p.active&&encodeMon(p.active),bench:p.bench.map(encodeMon),attached:p.attached,retreated:p.retreated,supporterUsed:p.supporterUsed,mulligans:p.mulligans}))};
}
export function decodeState(snap){
 return {players:snap.players.map(p=>({hand:p.hand.map(fromCode),deck:p.deck.map(fromCode),prizeCards:p.prizeCards.map(fromCode),discard:p.discard.map(fromCode),active:p.active&&decodeMon(p.active),bench:p.bench.map(decodeMon),prizes:p.prizeCards.length,attached:p.attached,retreated:p.retreated,supporterUsed:p.supporterUsed,mulligans:p.mulligans})),turn:snap.turn,round:snap.round,phase:snap.phase,winner:snap.winner,winReason:snap.winReason??null,log:[],selection:null};
}
// What `viewer` knows at the start of the record's turn: own deck and prizes only as counts, opponent's hidden zones only as counts.
export function viewFor(record,viewer){
 const {start}=record,me=start.players[viewer],opp=start.players[1-viewer],unknownPool={};
 for(const c of [...me.deck,...me.prizeCards])unknownPool[c]=(unknownPool[c]??0)+1;
 const shown=p=>({deckCount:p.deck.length,prizeCount:p.prizeCards.length,active:p.active,bench:p.bench,discard:p.discard,attached:p.attached,retreated:p.retreated,supporterUsed:p.supporterUsed,mulligans:p.mulligans});
 return structuredClone({n:record.n,player:record.player,viewer,round:start.round,turn:start.turn,phase:start.phase,winner:start.winner,me:{hand:me.hand,unknownPool,...shown(me)},opponent:{handCount:opp.hand.length,...shown(opp)},actions:record.actions,log:record.log});
}
// Reading localStorage can itself throw (e.g. blocked site data), so fall back to memory-only.
function defaultStorage(){try{return globalThis.localStorage??null;}catch{return null;}}
export function createRecorder(storage=defaultStorage()){
 let turns=[],final=null,warned=false;
 const attempt=fn=>{try{fn();}catch(e){if(!warned){warned=true;console.warn("Turn history is not being saved to localStorage:",e);}}};
 const save=rec=>attempt(()=>storage.setItem(TURN_PREFIX+rec.n,JSON.stringify(rec)));
 const saveMeta=()=>attempt(()=>storage.setItem(GAME_KEY,JSON.stringify({v:1,turns:turns.length,final})));
 const open=(state,log)=>{const rec={n:state.phase==="setup"?0:state.round,player:state.turn,start:encodeState(state),actions:[],log};turns.push(rec);save(rec);saveMeta();};
 return {
  start(state){
   turns=[];final=null;
   attempt(()=>{const stale=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k.startsWith(TURN_PREFIX))stale.push(k);}stale.forEach(k=>storage.removeItem(k));});
   open(state,[...state.log].reverse());
  },
  record(before,after,action,payload={}){
   if(action==="select"||action==="deselect")return;
   const rec=turns[turns.length-1],entry={p:before.turn,a:action};
   const p=before.players[before.turn];
   if(action==="play"||action==="trainer"){const card=p.hand[before.selection];if(card)entry.card=cardCode(card);}
   for(const [k,v] of Object.entries(payload))if(v!==undefined&&!(typeof v==="number"&&!Number.isInteger(v)))entry[k]=structuredClone(v);
   // Hand and deck positions can't be resolved later (the deck is reshuffled), so keep the chosen cards themselves.
   if(Array.isArray(payload.discardIndices))entry.discarded=payload.discardIndices.map(i=>p.hand[i]&&cardCode(p.hand[i]));
   if(Number.isInteger(payload.searchIndex)&&p.deck[payload.searchIndex])entry.found=cardCode(p.deck[payload.searchIndex]);
   // The engine unshifts log lines, so this action's lines are the newest few; store them oldest first.
   rec.actions.push(entry);rec.log.push(...after.log.slice(0,after.log.length-before.log.length).reverse());save(rec);
   if(after.winner!==null){final=encodeState(after);saveMeta();}
   else if(after.phase!=="setup"&&(before.phase==="setup"||after.round!==before.round))open(after,[]);
  },
  turns:()=>turns,
  final:()=>final
 };
}
export function loadHistory(storage=defaultStorage()){
 try{
  const meta=JSON.parse(storage.getItem(GAME_KEY));if(!meta)return null;
  const turns=[];for(let i=0;i<storage.length;i++){const k=storage.key(i);if(k.startsWith(TURN_PREFIX))turns.push(JSON.parse(storage.getItem(k)));}
  return {meta,turns:turns.sort((a,b)=>a.n-b.n)};
 }catch{return null;}
}
