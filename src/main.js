import {newGame,dispatch} from "./engine.js";
let state=newGame();
const board=document.querySelector("#board"),status=document.querySelector("#status"),error=document.querySelector("#error"),log=document.querySelector("#log");
const safe=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const card=(label,kind="empty",extra="")=>`<div class="card ${kind}"><span class="name">${safe(label)}</span>${extra?`<small>${safe(extra)}</small>`:""}</div>`;
function side(p,i){
const opponent=i===1,bench=[...p.bench];while(bench.length<5)bench.push(null);
const prizes=Array.from({length:6},(_,n)=>`<div class="card tiny ${n<p.prizes?"back":"empty"}">${n<p.prizes?"★":""}</div>`).join("");
const active=card(p.active.name,"pokemon active-card",`${Math.max(0,p.active.hp-p.active.damage)}/${p.active.hp} HP · ⚡ ${p.active.energy}`);
const benchHtml=bench.map(x=>x?card(x.name,"pokemon",`${x.hp-x.damage} HP`):card("Bench")).join("");
return `<section class="side ${opponent?"opponent":"self"} ${state.turn===i?"current":""}"><div class="prize-area"><p class="zone-label">Prizes · ${p.prizes}</p><div class="prizes">${prizes}</div></div><div class="field"><div class="player-label">Player ${i+1} · ${opponent?"Armarouge ex":"Pikachu ex"}</div><div class="bench-zone"><p class="zone-label">Bench</p><div class="bench-row">${benchHtml}</div></div><div class="active-row"><div><p class="zone-label">Active Pokémon</p>${active}</div></div></div><div class="pile-area"><div><p class="zone-label">Deck · ${p.deck.length}</p>${card("Deck","back tiny")}</div><div><p class="zone-label">Discard · ${p.discard?.length||0}</p>${card("Discard","empty tiny")}</div></div></section>`;
}
function render(){
status.textContent=state.winner===null?`Player ${state.turn+1}'s turn · Turn ${state.round}`:`Player ${state.winner+1} wins!`;
board.innerHTML=`<div class="mat">${side(state.players[1],1)}<div class="divider"></div>${side(state.players[0],0)}<div class="hand"><p class="zone-label">Current player's hand · ${state.players[state.turn].hand.length} cards</p><div class="hand-cards">${state.players[state.turn].hand.map(x=>`<span class="hand-chip">${safe(x)}</span>`).join("")}</div></div></div>`;
log.replaceChildren(...state.log.slice(0,15).map(x=>{const li=document.createElement("li");li.textContent=x;return li;}));
document.querySelectorAll("button:not([data-action=reset])").forEach(b=>b.disabled=state.winner!==null);
}
document.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{const result=dispatch(state,b.dataset.action);state=result.state;error.textContent=result.error||"";render();}));render();