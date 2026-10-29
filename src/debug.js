// Debug test-scenario commands. Each takes (state, me, args) and returns {state, message} or {error}; the caller's state is never mutated.
// `me` is the player using the debug menu; the opponent is always the other player.
import {knockOut,next} from "./engine.js?v=66";
import {catalog,energyCard,pokemonCard} from "./decks.js?v=70";
function shuffle(cards){for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
// Same discards as a knockout: the Pokémon, its evolution stack, Energy and Tool.
function discardMon(player,mon){player.discard.push(pokemonCard(mon.speciesIndex),...mon.under.map(pokemonCard),...mon.energies.map(energyCard));if(mon.tool)player.discard.push(mon.tool);}
// Pokémon references look like "0:active" or "1:bench:2".
export function pokemonAt(state,ref){const [i,zone,slot]=String(ref).split(":"),p=state.players[Number(i)];return zone==="active"?p?.active:p?.bench[Number(slot)];}
export function pokemonRefs(state){return state.players.flatMap((p,i)=>[...(p.active?[{ref:i+":active",label:`Player ${i+1} Active: ${p.active.name}`}]:[]),...p.bench.map((m,n)=>({ref:`${i}:bench:${n}`,label:`Player ${i+1} Bench ${n+1}: ${m.name}`}))]);}
const playing=(s,me)=>s.winner!==null?"The game is over.":s.phase==="setup"?"Finish setup first.":s.turn!==me?`Use this during Player ${me+1}'s turn.`:s.phase!=="playing"?"Finish the current Pokémon switch first.":null;
const run=(state,check,fn)=>{if(check)return {error:check};const s=structuredClone(state);const message=fn(s);if(typeof message==="object")return message;s.selection=null;s.log.unshift("[Debug] "+message);return {state:s,message};};
export const commands={
 prizesToOne:(state,me)=>run(state,state.winner!==null?"The game is over.":null,s=>{const p=s.players[me];if(p.prizeCards.length<=1)return {error:"Already at 1 Prize card or fewer."};p.deck.push(...p.prizeCards.splice(1));shuffle(p.deck);p.prizes=p.prizeCards.length;return `Player ${me+1} now has 1 Prize card left.`;}),
 emptyOpponentDeck:(state,me)=>run(state,state.winner!==null?"The game is over.":null,s=>{const o=s.players[1-me],n=o.deck.length;o.discard.push(...o.deck.splice(0));return `Moved Player ${2-me}'s ${n}-card deck to their discard pile.`;}),
 knockOutOpponentActive:(state,me)=>run(state,playing(state,me)||(!state.players[1-me].active&&"The opponent has no Active Pokémon."),s=>{const o=s.players[1-me];o.active.damage=o.active.hp;return `Knocked out Player ${2-me}'s ${o.active.name}.`+knockOut(s);}),
 // Blocked mid-replacement: a player with no Active and no Bench could never promote.
 clearOpponentBench:(state,me)=>run(state,state.winner!==null?"The game is over.":state.phase==="replacement"?"Finish the current Pokémon switch first.":null,s=>{const o=s.players[1-me];if(!o.bench.length)return {error:"The opponent's Bench is already empty."};const n=o.bench.length;for(const mon of o.bench.splice(0))discardMon(o,mon);return `Discarded Player ${2-me}'s ${n} Benched Pokémon.`;}),
 skipTurn:(state,me)=>run(state,playing(state,me),s=>{next(s);return `Skipped to Player ${s.turn+1}'s turn.`;}),
 resetTurnFlags:(state,me)=>run(state,state.winner!==null?"The game is over.":null,s=>{const p=s.players[me];p.attached=p.retreated=p.supporterUsed=false;for(const mon of [p.active,...p.bench])if(mon)mon.abilityUsed=false;return `Reset Player ${me+1}'s once-per-turn actions.`;}),
 addCardToHand:(state,me,{id})=>run(state,state.winner!==null?"The game is over.":null,s=>{const entry=catalog.find(c=>c.id===id);if(!entry)return {error:"Choose a card."};s.players[me].hand.push(structuredClone(entry.card));return `Added ${entry.name} to Player ${me+1}'s hand.`;}),
 addEnergy:(state,me,{ref,type})=>run(state,state.winner!==null?"The game is over.":null,s=>{const mon=pokemonAt(s,ref);if(!mon)return {error:"Choose a Pokémon."};mon.energies.push(type);mon.energy=mon.energies.length;return `Attached ${type} Energy to ${mon.name}.`;}),
 // Damage stops 10 short of HP so a Pokémon is never left Knocked Out outside the normal rules; use the knockout command instead.
 setDamage:(state,me,{ref,damage})=>run(state,state.winner!==null?"The game is over.":null,s=>{const mon=pokemonAt(s,ref);if(!mon)return {error:"Choose a Pokémon."};if(!Number.isInteger(damage)||damage<0)return {error:"Enter a whole number of damage."};mon.damage=Math.min(damage,mon.hp-10);return `Set ${mon.name}'s damage to ${mon.damage}.`;}),
 heal:(state,me,{ref})=>run(state,state.winner!==null?"The game is over.":null,s=>{const mon=pokemonAt(s,ref);if(!mon)return {error:"Choose a Pokémon."};mon.damage=0;return `Healed all damage from ${mon.name}.`;}),
};
