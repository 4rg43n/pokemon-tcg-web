import {retreatCost,species,energyTypes,canPay} from "./cards.js?v=53";
import {catalog} from "./decks.js?v=59";
import {commands as debugCommands,pokemonRefs} from "./debug.js?v=59";
import {cardStats} from "./card-stats.js?v=27";
import {newGame,dispatch,cardInfo} from "./engine.js?v=59";
import {mountDeckBuilder} from "./deck-builder.js?v=59";
import {createRecorder} from "./history.js?v=27";
import {createPlanner} from "./planning/planner.js?v=59";
import {renderPlanGraph} from "./planning/plan-graph.js?v=47";
import {update as coachUpdate,configure as coachConfigure} from "./coach_ui.js?v=4";
import {describeCard,cardTooltip} from "./card-text.js?v=1";
coachConfigure({species,canPay,retreatCost,dispatch});
let state=newGame(),preview=null,matchDecks=null;
const turnHistory=createRecorder();turnHistory.start(state);
const planner=createPlanner();let aiEnabled=false,aiBusy=false;
const $=s=>document.querySelector(s),board=$("#board"),status=$("#status"),error=$("#error"),log=$("#log");
const escape=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const sprite=id=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
function cardHtml(data,opts={}){
const {small=false,selected=false,back=false,empty=false,attrs=""}=opts;
if(empty)return `<div class="tcg-card empty">${escape(data||"Empty")}</div>`;
if(back)return '<div class="tcg-card back"><span>Pokémon</span></div>';
if(data.external&&data.image)return `<div class="tcg-card printed ${small?"small":""} ${selected?"selected":""}" ${attrs} title="${escape(cardTooltip(data))}"><img src="${escape(data.image)}" alt="${escape(data.name+" "+data.set+" "+data.number)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('image-unavailable')"><span class="print-fallback">${escape(data.name)}<small>${escape(data.set+" "+data.number)}</small></span></div>`;
if(data.kind==="energy")return `<div class="tcg-card energy type-${escape(String(data.type||"colorless").toLowerCase())} ${small?"small":""} ${selected?"selected":""}" ${attrs} title="${escape(cardTooltip(data))}"><div class="energy-symbol">${data.type==="Fire"?"🔥":data.type==="Lightning"?"⚡":data.type==="Water"?"💧":"★"}</div><strong>${escape(data.type||"Basic")} Energy</strong></div>`;
if(data.kind==="trainer")return `<div class="tcg-card trainer trainer-${escape(String(data.subtype||"Item").toLowerCase().replace(/[^a-z]+/g,"-"))} ${small?"small":""} ${selected?"selected":""}" ${attrs} title="${escape(cardTooltip(data))}"><span class="card-type">TRAINER</span><strong>${escape(data.name)}</strong><small>${escape(data.subtype||"Item")}</small>${data.image?`<img src="${escape(data.image)}" alt="${escape(data.name)}" loading="lazy">`:""}${data.name==="Air Balloon"?'<span class="tool-effect">🎈 Retreat costs 2 less</span>':""}</div>`;
const c=data.kind==="pokemon"&&data.species!==undefined?cardInfo(data):data;
if(c.external&&c.image)return `<div class="tcg-card printed pokemon ${small?"small":""} ${selected?"selected":""}" ${attrs} title="${escape(cardTooltip(c))}"><img src="${escape(c.image)}" alt="${escape(c.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('image-unavailable')"><span class="print-fallback">${escape(c.name)}</span>${c.damage?'<span class="print-damage">'+c.damage+' damage</span>':""}</div>`;
return `<div class="tcg-card pokemon type-${escape(String(c.type||"colorless").toLowerCase())} ${small?"small":""} ${selected?"selected":""}" ${attrs} title="${escape(cardTooltip(c))}"><div class="card-top"><strong>${escape(c.name)}</strong><span>${c.hp} HP</span></div><img src="${c.image|| (c.printing?`https://images.pokemontcg.io/${c.printing.split("-")[0]}/${c.printing.split("-")[1]}.png`:sprite(c.id))}" alt="" loading="lazy"><div class="card-bottom"><span>${escape((c.energies||[]).map(energyType=>energyType==="Fire"?"🔥":"⚡").join("")||"—")}</span><span>${Math.max(0,c.hp-(c.damage||0))} HP</span></div>${c.tool?`<div class="attached-tool" title="Air Balloon: retreat costs 2 less">🎈 Air Balloon</div>`:""}${cardStats(c)}</div>`;
}
function side(p,i){
const own=i===state.turn;
const bench=Array.from({length:5},(_,n)=>`<div class="slot" data-target="${own?"bench":"other"}" data-slot="${n}">${p.bench[n]?cardHtml(p.bench[n],{small:true}):cardHtml("Bench",{empty:true})}</div>`).join("");
const prizes=Array.from({length:6},(_,n)=>`<div class="prize">${n<p.prizes?cardHtml(null,{back:true}):'<div class="prize-taken"></div>'}</div>`).join("");
return `<section class="side ${i===1?"opponent":"self"} ${own?"current":""}"><div class="prize-area"><div class="zone-label">Prizes · ${p.prizes}</div><div class="prizes">${prizes}</div></div><div class="field"><div class="player-label">Player ${i+1} ${own?"• CURRENT TURN":""}</div><div class="bench-row">${bench}</div><div class="active-row"><div class="slot active-slot" data-target="${own?"active":"other"}">${p.active?cardHtml(p.active):cardHtml("Choose Active",{empty:true})}</div></div></div><div class="pile-area"><div class="pile" data-pile="deck" data-player="${i}"><div class="zone-label">Deck · ${p.deck.length}</div>${cardHtml(null,{back:true})}</div><div class="pile" data-pile="discard" data-player="${i}"><div class="zone-label">Discard · ${p.discard.length}</div>${p.discard.length?cardHtml(p.discard[p.discard.length-1],{small:true}):cardHtml("Discard",{empty:true})}</div></div></section>`;
}
function render(){
const botTurn=aiEnabled&&state.turn===1;
const p=state.players[state.turn];
status.textContent=state.phase==="replacement"?`Player ${state.turn+1}: tap a Benched Pokémon to replace the Knocked Out Active`:state.phase==="retreat"?`Player ${state.turn+1}: tap a Benched Pokémon to retreat into`:state.phase==="setup"?`Setup: Player ${state.turn+1} — choose Active, optionally Bench, then Ready`:state.winner===null?`Player ${state.turn+1}'s turn · Turn ${state.round}`:`Player ${state.winner+1} won by ${state.winReason}`;
board.innerHTML=`<div class="mat">${side(state.players[1],1)}<div class="divider"></div>${side(state.players[0],0)}<div class="hand"><div class="zone-label">${botTurn?"AI Player 2 · "+p.hand.length+" hidden cards":"Player "+(state.turn+1)+" hand · "+p.hand.length+" cards"}</div><div class="hand-cards">${botTurn?p.hand.map(()=>cardHtml(null,{back:true})).join(""):p.hand.map((c,i)=>cardHtml(c,{small:true,selected:i===state.selection,attrs:`data-hand="${i}"`})).join("")}</div><p class="hint">${state.phase==="setup"?"Choose a Basic Pokémon, tap the empty Active slot, optionally fill your Bench, then press Ready." :state.phase==="replacement"?"Tap a Benched Pokémon to promote it.":state.phase==="retreat"?"Tap a Benched Pokémon to switch it with your Active.":"Tap a hand card, then a Bench slot or Pokémon to play it. Tap a card again to inspect."}</p></div></div>`;
log.replaceChildren(...state.log.map(x=>{const li=document.createElement("li");li.textContent=x;return li;}));
document.querySelectorAll("button[data-action]").forEach(b=>b.disabled=botTurn||state.winner!==null);
document.querySelectorAll("button[data-action=attack],button[data-action=end]").forEach(b=>b.disabled=botTurn||state.phase!=="playing"||state.winner!==null);
const attack=document.querySelector("button[data-action=attack]");attack.textContent=p.active?.attacks?.length>1?"Choose Attack":"Attack";
const retreat=document.querySelector("button[data-action=retreat]");retreat.textContent=`Retreat (${retreatCost(p.active)} Energy)`;retreat.hidden=state.phase!=="playing";retreat.disabled=botTurn||state.phase!=="playing"||!state.players[state.turn].bench.length||state.players[state.turn].retreated||!p.active||p.active.energy<retreatCost(p.active);
const playTrainer=document.querySelector("button[data-action=trainer]");playTrainer.hidden=state.phase!=="playing"||p.hand[state.selection]?.kind!=="trainer";
const aiButton=document.querySelector("#ai-toggle");aiButton.textContent=aiEnabled?"AI Player 2: ON":"AI Player 2: OFF";
renderPlanGraph(document.querySelector("#ai-graph"),planner);
const panel=document.querySelector("#ai-plans");if(panel)panel.textContent=JSON.stringify({active:planner.active,archived:planner.archive.slice(-3)},null,2);
const ready=document.querySelector("button[data-action=ready]");ready.hidden=state.phase!=="setup";ready.disabled=botTurn||state.phase!=="setup"||!state.players[state.turn].active;
}
function act(action,payload,fromAI=false){if(aiEnabled&&state.turn===1&&!fromAI&&action!=="reset")return {state,error:"AI Player 2 controls this turn."};const prev=state,result=action==="reset"?{state:newGame(matchDecks)}:dispatch(state,action,payload);if(!result.error){if(action==="reset"){planner.reset();turnHistory.start(result.state);}else{turnHistory.record(state,result.state,action,payload);planner.onChange(state,result.state,action);}}state=result.state;error.textContent=result.error||"";render();if(!fromAI){coachUpdate({prev,state,action,error:result.error||""});queueAI();}return result;}
function queueAI(){if(!aiEnabled||aiBusy||state.turn!==1||state.winner!==null)return;aiBusy=true;setTimeout(()=>{try{for(let n=0;n<24&&aiEnabled&&state.turn===1&&state.winner===null;n++){const step=planner.next(state);if(!step){if(state.phase==="setup"&&!state.players[1].active){const idx=state.players[1].hand.findIndex(c=>c.kind==="pokemon"&&!species[c.species]?.stage);if(idx>=0){state=dispatch(state,"select",{index:idx}).state;state=dispatch(state,"play",{target:"active"}).state;continue;}}if(state.phase==="setup"&&state.players[1].active){state=dispatch(state,"ready").state;continue;}if(state.phase==="playing"){state=dispatch(state,"end").state;continue;}break;}if(step.select!==undefined){const sel=dispatch(state,"select",{index:step.select});if(sel.error)break;state=sel.state;}const before=state;const r=act(step.action,step.payload||{},true);if(r.error){planner.reset();error.textContent="AI skipped an invalid action: "+r.error;if(state.phase==="setup"&&state.players[1].active){state=dispatch(state,"ready").state;}else if(state.phase==="playing"){state=dispatch(state,"end").state;}break;}planner.applied(step,state);if(state===before)break;}render();coachUpdate({state,action:"ai"});}catch(e){error.textContent="AI error: "+e.message;if(state.turn===1&&state.phase==="playing")state=dispatch(state,"end").state;}finally{aiBusy=false;}},180);}
document.querySelector("#ai-toggle").addEventListener("click",()=>{aiEnabled=!aiEnabled;render();queueAI();});
document.querySelector("#ai-export").addEventListener("click",()=>{const blob=new Blob([planner.export()],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="pokemon-ai-plans.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
board.addEventListener("click",e=>{if(aiEnabled&&state.turn===1){error.textContent="AI Player 2 controls this turn.";return;}
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
function useAbilityFromPreview(){
 const p=state.players[state.turn],c=preview?.card;
 const slot=p.bench.indexOf(c),target=p.active===c?"active":slot>=0?"bench":null;
 if(target){
 if(c.ability.name==="Snack Seek"){
  if(!p.deck.length){error.textContent="No cards left to look at.";return;}
  const panel=$("#modal .modal-content");panel.innerHTML="<h2>Snack Seek</h2><p>Top card of your deck</p>"+cardHtml(p.deck[0]);
  for(const discard of [false,true]){const button=document.createElement("button");button.textContent=discard?"Discard card":"Keep on top";button.onclick=()=>{act("ability",{target,slot,discard});preview=null;$("#modal").hidden=true;};panel.append(button);}return;
 }
 act("ability",{target,slot});preview=null;$("#modal").hidden=true;
}
}
function renderModal(){const modal=$("#modal");if(!preview){modal.hidden=true;return;}modal.hidden=false;
if(preview.type==="debug"){renderDebug();return;}
if(preview.type==="card"){const c=preview.card,description=describeCard(c);modal.querySelector(".modal-content").innerHTML=`<div class="card-view">${cardHtml(c)}<div class="card-info"><h2>${escape(c.name||"Card")}</h2><p class="card-heading">${escape(description.heading)}</p>${description.sections.map(section=>`<h3>${escape(section.title)}</h3>${section.lines.map(line=>`<p>${escape(line)}</p>`).join("")}`).join("")}${c.hp?'<p class="stat-legend">Weakness and Resistance are shown for reference; this prototype does not apply them to damage yet.</p>':""}</div></div>`;}
if(preview.type==="card"&&preview.card.ability){
 const c=preview.card,p=state.players[state.turn],own=c===p.active||p.bench.includes(c);
 const text=document.createElement("p");text.textContent=c.ability.name+": "+c.ability.text;modal.querySelector(".modal-content").append(text);
 if(own&&state.phase==="playing"){const button=document.createElement("button");button.textContent="Use "+c.ability.name;button.disabled=!!c.abilityUsed||state.winner!==null;button.onclick=useAbilityFromPreview;modal.querySelector(".modal-content").append(button);}
}
else if(preview.type!=="card") modal.querySelector(".modal-content").innerHTML=`<h2>${escape(preview.name)} · ${preview.cards.length} cards</h2><div class="pile-list">${preview.name==="deck"?"Deck contents are hidden during play.":preview.cards.length?preview.cards.map(c=>cardHtml(c,{small:true})).join(""):"No cards yet."}</div>`;
}
function showFireTrainerChoices(card){
 const p=state.players[state.turn],panel=$("#modal .modal-content");
 preview={type:"fire-trainer"};$("#modal").hidden=false;
 panel.innerHTML="<h2>"+escape(card.name)+"</h2><p>Select eligible cards and targets to use this Trainer.</p>";
 const search=["Buddy-Buddy Poffin","Evolution Incense","Level Ball","Poké Pad","Trainers' Mail","Earthen Vessel","Arven","Gloria","Hisuian Heavy Ball"].includes(card.name);
 const recover=["Night Stretcher","Rescue Stretcher","Lana's Aid"].includes(card.name);
 const welder=card.name==="Welder";
 const switchBoth=["Guzma","Escape Rope"].includes(card.name);
 const candy=card.name==="Rare Candy";
 const pool=search?(card.name==="Hisuian Heavy Ball"?p.prizeCards:p.deck):recover?p.discard:welder?p.hand:[];
 const eligible=c=>search?(card.name==="Buddy-Buddy Poffin"?c.kind==="pokemon"&&!species[c.species]?.stage&&species[c.species]?.hp<=70:card.name==="Evolution Incense"?c.kind==="pokemon"&&!!species[c.species]?.stage:card.name==="Level Ball"?c.kind==="pokemon"&&species[c.species]?.hp<=90:card.name==="Arven"?c.kind==="trainer"&&(c.subtype==="Item"||c.subtype==="Pokémon Tool"):card.name==="Trainers' Mail"?c.kind==="trainer":card.name==="Earthen Vessel"?c.kind==="energy":card.name==="Gloria"||card.name==="Hisuian Heavy Ball"?c.kind==="pokemon"&&!species[c.species]?.stage:true):recover?c.kind==="pokemon"||c.kind==="energy":welder?c.kind==="energy"&&c.type==="Fire":false;
 const checks=[];
 pool.forEach((c,i)=>{if(welder&&i===state.selection||!eligible(c))return;const label=document.createElement("label"),check=document.createElement("input");check.type="checkbox";label.style.display="block";label.append(check,document.createTextNode(" "+(c.kind==="pokemon"?species[c.species]?.name:c.name||c.type)));panel.append(label);checks.push({check,i});});
 const needsTarget=welder||switchBoth||candy||["Blacksmith","Raihan","Scoop Up Net","Float Stone","Muscle Band","Vitality Band","Bird Keeper"].includes(card.name);
 const target=document.createElement("select");target.setAttribute("aria-label","Target Pokémon");
 if(needsTarget){target.innerHTML='<option value="active">Active</option>'+p.bench.map((c,i)=>'<option value="bench-'+i+'">Bench '+(i+1)+': '+escape(c.name)+'</option>').join("");panel.append(target);}
 let opponent=null,evolution=null;
 if(switchBoth){opponent=document.createElement("select");opponent.setAttribute("aria-label","Opponent Benched Pokémon");opponent.innerHTML=state.players[1-state.turn].bench.map((c,i)=>'<option value="'+i+'">Opponent Bench '+(i+1)+': '+escape(c.name)+'</option>').join("");panel.append(opponent);}
 if(candy){evolution=document.createElement("select");evolution.setAttribute("aria-label","Stage 2 in hand");evolution.innerHTML=p.hand.map((c,i)=>({c,i})).filter(({c})=>c.kind==="pokemon"&&species[c.species]?.stage===2).map(({c,i})=>'<option value="'+i+'">'+escape(species[c.species].name)+'</option>').join("");panel.append(evolution);}
 const status=document.createElement("p"),done=document.createElement("button");done.textContent="Play "+card.name;
 done.onclick=()=>{const selected=checks.filter(x=>x.check.checked).map(x=>x.i),value=needsTarget?target.value:"active";
 const payload={searchIndices:selected,discardIndices:selected,target:value.startsWith("bench-")?"bench":"active",slot:value.startsWith("bench-")?Number(value.slice(6)):undefined,opponentSlot:opponent?Number(opponent.value):undefined,evolutionIndex:evolution?Number(evolution.value):undefined};
 if((card.name==="Bird Keeper"||switchBoth)&&value==="active"){status.textContent="Choose a Benched Pokémon.";return;}
 const result=dispatch(state,"trainer",payload);if(result.error){status.textContent=result.error;return;}
 turnHistory.record(state,result.state,"trainer",payload);const prev=state;state=result.state;render();coachUpdate({prev,state,action:"trainer"});error.textContent="";preview=null;$("#modal").hidden=true;};
 panel.append(status,done);
}
function showNestBallSearch(){
 const p=state.players[state.turn],panel=$("#modal .modal-content");
 preview={type:"nest-search"};$("#modal").hidden=false;
 panel.innerHTML="<h2>Nest Ball</h2><p>Search your deck for a Basic Pokémon, put it directly on your Bench, then shuffle your deck. This does not add it to your hand.</p>";
 const select=document.createElement("select");select.setAttribute("aria-label","Basic Pokémon to Bench");
 select.innerHTML='<option value="">Do not find a Pokémon</option>'+p.deck.map((c,i)=>({c,i})).filter(({c})=>c.kind==="pokemon"&&!species[c.species]?.stage).map(({c,i})=>'<option value="'+i+'">'+escape(species[c.species].name)+'</option>').join("");
 panel.append(select);const status=document.createElement("p"),done=document.createElement("button");done.textContent="Play Nest Ball";
 done.onclick=()=>{const payload={searchIndex:select.value===""?null:Number(select.value)},result=dispatch(state,"trainer",payload);if(result.error){status.textContent=result.error;return;}turnHistory.record(state,result.state,"trainer",payload);const prev=state;state=result.state;render();coachUpdate({prev,state,action:"trainer"});error.textContent="";preview=null;$("#modal").hidden=true;};
 panel.append(status,done);
}
function showBallSearch(){
 const p=state.players[state.turn],idx=state.selection,card=p.hand[idx],required=card.name==="Quick Ball"?1:2;
 preview={type:"ball-search"};$("#modal").hidden=false;const panel=$("#modal .modal-content");panel.innerHTML="<h2>"+escape(card.name)+"</h2><p>Discard "+required+" other card(s), then choose a Pokémon to reveal and add to your hand.</p>";
 const checks=[];
 p.hand.forEach((c,i)=>{if(i===idx)return;const label=document.createElement("label"),check=document.createElement("input");check.type="checkbox";label.style.display="block";label.append(check,document.createTextNode(c.kind==="pokemon"?species[c.species].name:c.name));panel.append(label);checks.push({check,index:i});});
 const select=document.createElement("select");select.setAttribute("aria-label","Pokémon to find");select.innerHTML='<option value="">Finish without finding a Pokémon</option>'+p.deck.map((c,i)=>({c,i})).filter(({c})=>c.kind==="pokemon"&&(card.name==="Ultra Ball"||!species[c.species].stage)).map(({c,i})=>'<option value="'+i+'">'+escape(species[c.species].name)+'</option>').join('');panel.append(select);
 const status=document.createElement("p"),done=document.createElement("button");done.textContent="Play "+card.name;done.onclick=()=>{const payload={discardIndices:checks.filter(x=>x.check.checked).map(x=>x.index),searchIndex:select.value===""?null:Number(select.value)},result=dispatch(state,"trainer",payload);if(result.error){status.textContent=result.error;return;}turnHistory.record(state,result.state,"trainer",payload);const prev=state;state=result.state;render();coachUpdate({prev,state,action:"trainer"});error.textContent="";preview=null;$("#modal").hidden=true;};panel.append(status,done);
}
function chooseAttack(index){
 const p=state.players[state.turn],move=p.active.attacks[index];
 if(move.effect!=="pickAndStick"){act("attack",{index});$("#modal").hidden=true;preview=null;return;}
 preview={type:"energy-choice"};$("#modal").hidden=false;
 const panel=$("#modal .modal-content");panel.innerHTML="<h2>Pick and Stick</h2><p>Choose up to 2 Basic Energy cards and where to attach each. This attack ends your turn.</p>";
 const fields=[];
 p.discard.forEach((card,i)=>{if(card.kind!=="energy")return;const label=document.createElement("label");label.style.display="block";label.textContent=card.name+" ";const select=document.createElement("select");
 select.innerHTML='<option value="">Leave in discard</option><option value="active">Active: '+escape(p.active.name)+'</option>'+p.bench.map((c,n)=>'<option value="'+n+'">Bench '+(n+1)+': '+escape(c.name)+'</option>').join('');label.append(select);panel.append(label);fields.push({select,index:i});});
 const done=document.createElement("button");done.textContent="Use Pick and Stick";done.onclick=()=>{const attachments=fields.filter(x=>x.select.value!=="").map(x=>({index:x.index,target:x.select.value==="active"?"active":"bench",slot:Number(x.select.value)}));const result=dispatch(state,"attack",{index,attachments});if(result.error){error.textContent=result.error;return;}turnHistory.record(state,result.state,"attack",{index,attachments});const prev=state;state=result.state;error.textContent="";render();coachUpdate({prev,state,action:"attack"});preview=null;$("#modal").hidden=true;};panel.append(done);
}
function showAttacks(){const moves=state.players[state.turn].active.attacks;preview={type:"attacks"};const modal=$("#modal");modal.hidden=false;modal.querySelector(".modal-content").innerHTML="<h2>Choose an attack</h2>"+moves.map((a,i)=>`<button type="button" data-attack="${i}" style="display:block;margin:12px 0;padding:12px;width:100%;text-align:left">${escape(a.name)} — ${escape(a.cost.join(" + "))} — ${a.damage} damage</button>`).join("");}
$("#modal").addEventListener("click",e=>{const attack=e.target.closest("[data-attack]");if(attack){chooseAttack(Number(attack.dataset.attack));return;}});
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal"||e.target.closest(".close-modal")){$("#modal").hidden=true;preview=null;}});
document.querySelectorAll("button[data-action]").forEach(b=>b.addEventListener("click",()=>{if(aiEnabled&&state.turn===1){error.textContent="AI Player 2 controls this turn.";return;}if(b.dataset.action==="attack"){if(state.players[state.turn].active?.attacks?.length>1)showAttacks();else chooseAttack(0);return;}if(b.dataset.action==="trainer"){const card=state.players[state.turn].hand[state.selection];if(card?.name==="Quick Ball"||card?.name==="Ultra Ball"){showBallSearch();return;}if(card?.name==="Nest Ball"){showNestBallSearch();return;}if(["Buddy-Buddy Poffin","Evolution Incense","Level Ball","Poké Pad","Trainers' Mail","Earthen Vessel","Arven","Gloria","Hisuian Heavy Ball","Night Stretcher","Rescue Stretcher","Lana's Aid","Welder","Float Stone","Muscle Band","Vitality Band","Bird Keeper","Blacksmith","Raihan","Guzma","Escape Rope","Rare Candy","Scoop Up Net"].includes(card?.name)){showFireTrainerChoices(card);return;}if(card?.name==="Potion"||card?.name==="Air Balloon"){error.textContent=card.name==="Air Balloon"?"Tap your Active or a Benched Pokémon to attach Air Balloon.":"Tap a damaged Pokémon to use Potion.";return;}act("trainer");}else act(b.dataset.action);$("#modal").hidden=true;preview=null;}));
render();

coachUpdate({state,action:"init"});
const deckBuilder=mountDeckBuilder({start(decks){matchDecks=structuredClone(decks);state=newGame(matchDecks);turnHistory.start(state);planner.reset();error.textContent="";preview=null;$("#modal").hidden=true;render();coachUpdate({state,action:"reset"});},inspect:showPreview,onClose:started=>started?showGame():showMenu()});
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

// Debug menu. "Me" is Player 1 when the AI plays Player 2, otherwise whoever's turn it is; the opponent is the other player.
const debugMe=()=>aiEnabled?0:state.turn;
const debugScenarios=[["prizesToOne","Set my Prizes to 1"],["emptyOpponentDeck","Empty opponent's deck"],["knockOutOpponentActive","Knock out opponent's Active"],["clearOpponentBench","Clear opponent's Bench"],["skipTurn","Skip to opponent's turn"],["resetTurnFlags","Reset my once-per-turn actions"]];
function openDebug(){preview={type:"debug",view:"menu",message:""};renderModal();}
function debugCards(cards,numbered){return cards.length?`<div class="pile-list">${cards.map((c,i)=>numbered?`<div class="debug-card"><small>#${i+1}</small>${cardHtml(c,{small:true})}</div>`:cardHtml(c,{small:true})).join("")}</div>`:"<p>No cards.</p>";}
function debugPlan(){
 const plan=planner.active;
 if(!plan)return "<p>No active plan. The AI builds one when it takes Player 2's turn.</p>";
 const list=(items,fmt)=>items.length?`<ol>${items.map(x=>`<li>${escape(fmt(x))}</li>`).join("")}</ol>`:"<p>None.</p>";
 return `<p><strong>${escape(plan.goal)}</strong> · ${escape(plan.id)} · round ${plan.round} · ${escape(plan.status)}</p><h3>Next actions</h3>${list(plan.actions,a=>a.action+" — "+a.why)}<h3>Completed</h3>${list(plan.completed,a=>a.action+(a.round?" (round "+a.round+")":""))}<details><summary>Raw plan JSON</summary><pre class="debug-json">${escape(JSON.stringify(plan,null,2))}</pre></details>`;
}
function renderDebug(){
 const content=$("#modal .modal-content"),me=debugMe(),opp=state.players[1-me],view=preview.view;
 const back='<button type="button" data-debug="menu">← Debug menu</button>',note=preview.message?`<p class="debug-message">${escape(preview.message)}</p>`:"";
 if(view==="deck"){content.innerHTML=`${back}<h2>Player ${2-me}'s deck · ${opp.deck.length} cards (top first)</h2>${debugCards(opp.deck,true)}`;return;}
 if(view==="hand"){content.innerHTML=`${back}<h2>Player ${2-me}'s hand · ${opp.hand.length} cards</h2>${debugCards(opp.hand,false)}`;return;}
 if(view==="plan"){content.innerHTML=`${back}<h2>AI current plan</h2>${debugPlan()}`;return;}
 const options=items=>items.map(([v,l])=>`<option value="${escape(v)}">${escape(l)}</option>`).join("");
 const mons=pokemonRefs(state).map(x=>[x.ref,x.label]);
 content.innerHTML=`<h2>Debug · acting as Player ${me+1}</h2>${note}
<h3>View</h3><div class="debug-row"><button type="button" data-debug="deck">Show opponent deck</button><button type="button" data-debug="hand">Show opponent hand</button><button type="button" data-debug="plan">Show AI current plan</button></div>
<h3>Test scenarios</h3><div class="debug-row">${debugScenarios.map(([id,label])=>`<button type="button" data-debug="${id}">${escape(label)}</button>`).join("")}</div>
<h3>Put a card in my hand</h3><div class="debug-row"><select id="debug-card">${options(catalog.map(c=>[c.id,c.name]))}</select><button type="button" data-debug="addCardToHand">Add to hand</button></div>
<h3>Edit a Pokémon</h3>${mons.length?`<div class="debug-row"><select id="debug-mon">${options(mons)}</select></div><div class="debug-row"><select id="debug-energy">${options(energyTypes.map(t=>[t,t+" Energy"]))}</select><button type="button" data-debug="addEnergy">Add Energy</button></div><div class="debug-row"><input id="debug-damage" type="number" min="0" step="10" value="0" aria-label="Damage"><button type="button" data-debug="setDamage">Set damage</button><button type="button" data-debug="heal">Heal</button></div>`:"<p>No Pokémon in play yet.</p>"}`;
}
// Applies a scenario like a real move: recorded in turn history, seen by the AI planner, then the AI may act.
function runDebug(name){
 const val=id=>$("#"+id)?.value,args=name==="addCardToHand"?{id:val("debug-card")}:name==="addEnergy"?{ref:val("debug-mon"),type:val("debug-energy")}:name==="setDamage"?{ref:val("debug-mon"),damage:Number(val("debug-damage"))}:name==="heal"?{ref:val("debug-mon")}:{};
 const prev=state,r=debugCommands[name](state,debugMe(),args);
 if(r.error){preview.message=r.error;renderDebug();return;}
 turnHistory.record(prev,r.state,"debug",{command:name,...args});planner.onChange(prev,r.state,"debug");
 state=r.state;error.textContent="";preview.message=r.message;render();renderDebug();queueAI();
}
$("#modal").addEventListener("click",e=>{const b=e.target.closest("[data-debug]");if(!b||preview?.type!=="debug")return;const name=b.dataset.debug;if(["menu","deck","hand","plan"].includes(name)){preview.view=name;preview.message="";renderDebug();}else runDebug(name);});
$("#open-debug").addEventListener("click",openDebug);
