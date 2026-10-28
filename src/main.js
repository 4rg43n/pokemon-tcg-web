import {cardStats} from "./card-stats.js?v=18";
import {newGame,dispatch,cardInfo} from "./engine.js?v=18";
import {mountDeckBuilder} from "./deck-builder.js?v=18";
let state=newGame(),preview=null,matchDecks=null;
const $=s=>document.querySelector(s),board=$("#board"),status=$("#status"),error=$("#error"),log=$("#log");
const escape=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const sprite=id=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
function cardHtml(data,opts={}){
const {small=false,selected=false,back=false,empty=false,attrs=""}=opts;
if(empty)return `<div class="tcg-card empty">${escape(data||"Empty")}</div>`;
if(back)return '<div class="tcg-card back"><span>Pokémon</span></div>';
if(data.kind==="energy")return `<div class="tcg-card energy ${small?"small":""} ${selected?"selected":""}" ${attrs}><div class="energy-symbol">⚡</div><strong>${escape(data.type||"Basic")} Energy</strong></div>`;
if(data.kind==="trainer")return `<div class="tcg-card trainer ${small?"small":""} ${selected?"selected":""}" ${attrs}><span class="card-type">TRAINER</span><strong>${escape(data.name)}</strong><small>${escape(data.subtype||"Item")}</small></div>`;
const c=data.kind==="pokemon"&&data.species!==undefined?cardInfo(data):data;
return `<div class="tcg-card pokemon ${small?"small":""} ${selected?"selected":""}" ${attrs}><div class="card-top"><strong>${escape(c.name)}</strong><span>${c.hp} HP</span></div><img src="${c.printing?`https://images.pokemontcg.io/${c.printing.split("-")[0]}/${c.printing.split("-")[1]}.png`:sprite(c.id)}" alt="" loading="lazy"><div class="card-bottom"><span>${escape((c.energies||[]).map(x=>x==="Fire"?"🔥":"⚡").join("")||"—")}</span><span>${Math.max(0,c.hp-(c.damage||0))} HP</span></div>${cardStats(c)}</div>`;
}
function side(p,i){
const own=i===state.turn;
const bench=Array.from({length:5},(_,n)=>`<div class="slot" data-target="${own?"bench":"other"}" data-slot="${n}">${p.bench[n]?cardHtml(p.bench[n],{small:true}):cardHtml("Bench",{empty:true})}</div>`).join("");
const prizes=Array.from({length:6},(_,n)=>`<div class="prize">${n<p.prizes?cardHtml(null,{back:true}):'<div class="prize-taken"></div>'}</div>`).join("");
return `<section class="side ${i===1?"opponent":"self"} ${own?"current":""}"><div class="prize-area"><div class="zone-label">Prizes · ${p.prizes}</div><div class="prizes">${prizes}</div></div><div class="field"><div class="player-label">Player ${i+1} ${own?"• CURRENT TURN":""}</div><div class="bench-row">${bench}</div><div class="active-row"><div class="slot active-slot" data-target="${own?"active":"other"}">${p.active?cardHtml(p.active):cardHtml("Choose Active",{empty:true})}</div></div></div><div class="pile-area"><div class="pile" data-pile="deck" data-player="${i}"><div class="zone-label">Deck · ${p.deck.length}</div>${cardHtml(null,{back:true})}</div><div class="pile" data-pile="discard" data-player="${i}"><div class="zone-label">Discard · ${p.discard.length}</div>${p.discard.length?cardHtml(p.discard[p.discard.length-1],{small:true}):cardHtml("Discard",{empty:true})}</div></div></section>`;
}
function render(){
const p=state.players[state.turn];
status.textContent=state.phase==="replacement"?`Player ${state.turn+1}: tap a Benched Pokémon to replace the Knocked Out Active`:state.phase==="retreat"?`Player ${state.turn+1}: tap a Benched Pokémon to retreat into`:state.phase==="setup"?`Setup: Player ${state.turn+1} — choose Active, optionally Bench, then Ready`:state.winner===null?`Player ${state.turn+1}'s turn · Turn ${state.round}`:`Player ${state.winner+1} wins!`;
board.innerHTML=`<div class="mat">${side(state.players[1],1)}<div class="divider"></div>${side(state.players[0],0)}<div class="hand"><div class="zone-label">Player ${state.turn+1}'s hand · ${p.hand.length} cards</div><div class="hand-cards">${p.hand.map((c,i)=>cardHtml(c,{small:true,selected:i===state.selection,attrs:`data-hand="${i}"`})).join("")}</div><p class="hint">${state.phase==="setup"?"Choose a Basic Pokémon, tap the empty Active slot, optionally fill your Bench, then press Ready." :state.phase==="replacement"?"Tap a Benched Pokémon to promote it.":state.phase==="retreat"?"Tap a Benched Pokémon to switch it with your Active.":"Tap a hand card, then a Bench slot or Pokémon to play it. Tap a card again to inspect."}</p></div></div>`;
log.replaceChildren(...state.log.slice(0,15).map(x=>{const li=document.createElement("li");li.textContent=x;return li;}));
document.querySelectorAll("button[data-action=attack],button[data-action=end]").forEach(b=>b.disabled=state.phase!=="playing"||state.winner!==null);
const attack=document.querySelector("button[data-action=attack]");attack.textContent=p.active?.attacks?.length>1?"Choose Attack":"Attack";
const retreat=document.querySelector("button[data-action=retreat]");retreat.textContent=`Retreat (${p.active?.retreat??1} Energy)`;retreat.hidden=state.phase!=="playing";retreat.disabled=state.phase!=="playing"||!state.players[state.turn].bench.length||state.players[state.turn].retreated||!p.active||p.active.energy<p.active.retreat;
const playTrainer=document.querySelector("button[data-action=trainer]");playTrainer.hidden=state.phase!=="playing"||p.hand[state.selection]?.kind!=="trainer";
const ready=document.querySelector("button[data-action=ready]");ready.hidden=state.phase!=="setup";ready.disabled=state.phase!=="setup"||!state.players[state.turn].active;
}
function act(action,payload){const r=action==="reset"?{state:newGame(matchDecks)}:dispatch(state,action,payload);state=r.state;error.textContent=r.error||"";render();}
board.addEventListener("click",e=>{
const hand=e.target.closest("[data-hand]");
if(hand){const idx=Number(hand.dataset.hand);if(state.selection===idx){showPreview(state.players[state.turn].hand[idx]);}else act("select",{index:idx});return;}
const target=e.target.closest("[data-target]");
if(target){if((state.phase==="replacement"||state.phase==="retreat")&&target.dataset.target==="bench"){act(state.phase==="replacement"?"promote":"switch",{slot:Number(target.dataset.slot)});return;}
if(state.phase==="replacement"||state.phase==="retreat"){error.textContent="Tap one of your Benched Pokémon.";return;}
if(state.selection!==null){if(target.dataset.target==="other"){error.textContent="Play cards on the current player's side.";return;}act("play",{target:target.dataset.target,slot:Number(target.dataset.slot)});}
else{const i=target.closest(".side").classList.contains("opponent")?1:0;const p=state.players[i],c=target.classList.contains("active-slot")?p.active:p.bench[Number(target.dataset.slot)];if(c)showPreview(c);}return;}
const pile=e.target.closest("[data-pile]");if(pile){const p=state.players[Number(pile.dataset.player)],cards=p[pile.dataset.pile];showPile(pile.dataset.pile,cards);return;}
if(state.selection!==null)act("deselect");
});
function showPreview(c){const d=c.kind==="pokemon"&&c.species!==undefined?cardInfo(c):c;preview={type:"card",card:d};renderModal();}
function showPile(type,cards){preview={type:"pile",name:type,cards};renderModal();}
function renderModal(){const modal=$("#modal");if(!preview){modal.hidden=true;return;}modal.hidden=false;
if(preview.type==="card"){const c=preview.card;modal.querySelector(".modal-content").innerHTML=cardHtml(c)+`<p>${escape(c.name||"")}${c.attacks?.length?" · "+c.attacks.map(a=>a.name+" ("+a.cost.join(" + ")+"): "+a.damage+" damage").join(", "):""}</p>${c.hp?'<p class="stat-legend">★ = Colorless Energy for retreat · ? = data not yet recorded · — = no Weakness or Resistance. These stats are informational; Weakness and Resistance damage rules are not implemented.</p>':""}`;}
else modal.querySelector(".modal-content").innerHTML=`<h2>${escape(preview.name)} · ${preview.cards.length} cards</h2><div class="pile-list">${preview.name==="deck"?"Deck contents are hidden during play.":preview.cards.length?preview.cards.map(c=>cardHtml(c,{small:true})).join(""):"No cards yet."}</div>`;
}
function showAttacks(){const moves=state.players[state.turn].active.attacks;preview={type:"attacks"};const modal=$("#modal");modal.hidden=false;modal.querySelector(".modal-content").innerHTML="<h2>Choose an attack</h2>"+moves.map((a,i)=>`<button type="button" data-attack="${i}" style="display:block;margin:12px 0;padding:12px;width:100%;text-align:left">${escape(a.name)} — ${escape(a.cost.join(" + "))} — ${a.damage} damage</button>`).join("");}
$("#modal").addEventListener("click",e=>{const attack=e.target.closest("[data-attack]");if(attack){act("attack",{index:Number(attack.dataset.attack)});$("#modal").hidden=true;preview=null;return;}});
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal"||e.target.closest(".close-modal")){$("#modal").hidden=true;preview=null;}});
document.querySelectorAll("button[data-action]").forEach(b=>b.addEventListener("click",()=>{if(b.dataset.action==="attack"&&state.players[state.turn].active?.attacks?.length>1){showAttacks();return;}if(b.dataset.action==="trainer"){const card=state.players[state.turn].hand[state.selection];if(card?.name==="Potion"){error.textContent="Tap a damaged Pokémon to use Potion.";return;}act("trainer");}else act(b.dataset.action);$("#modal").hidden=true;preview=null;}));
render();

const deckBuilder=mountDeckBuilder({start(decks){matchDecks=structuredClone(decks);state=newGame(matchDecks);error.textContent="";preview=null;$("#modal").hidden=true;render();},inspect:showPreview,onClose:started=>started?showGame():showMenu()});
$("#open-decks").addEventListener("click",()=>deckBuilder.open());

function hideModal(){preview=null;$("#modal").hidden=true;}
function showMenu(){
 hideModal();$("main").hidden=true;$("#deck-builder").hidden=true;$("#main-menu").hidden=false;
 $("#menu-play").textContent="";
 const title=document.createElement("strong");title.textContent=state.winner!==null?"View finished game":state.phase==="setup"?"Play":"Resume Game";
 const hint=document.createElement("span");hint.textContent="Return to the current playmat";
 $("#menu-play").append(title,hint);$("#menu-play").focus();window.scrollTo(0,0);
}
function showGame(){hideModal();$("#main-menu").hidden=true;$("#deck-builder").hidden=true;$("main").hidden=false;render();$("#open-menu").focus();window.scrollTo(0,0);}
function openBuilder(){hideModal();$("#main-menu").hidden=true;deckBuilder.open();window.scrollTo(0,0);}
$("#menu-play").disabled=false;$("#menu-decks").disabled=false;
$("#menu-message").textContent="Your match stays in memory while you visit the menu. Save decks to keep them after reloading.";
$("#menu-play").addEventListener("click",showGame);
$("#menu-decks").addEventListener("click",openBuilder);
$("#open-menu").addEventListener("click",showMenu);
showMenu();
