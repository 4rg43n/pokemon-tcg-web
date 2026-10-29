import {retreatCost,species,energyTypes,canPay} from "./cards.js?v=66";
import {catalog} from "./decks.js?v=70";
import {commands as debugCommands,pokemonRefs} from "./debug.js?v=70";
import {cardStats} from "./card-stats.js?v=66";
import {newGame,dispatch,cardInfo} from "./engine.js?v=82";
import {mountDeckBuilder} from "./deck-builder.js?v=70";
import {createRecorder} from "./history.js?v=66";
import {createPlanner} from "./planning/planner.js?v=66";
import {renderPlanGraph} from "./planning/plan-graph.js?v=66";
import {update as coachUpdate,configure as coachConfigure} from "./coach_ui.js?v=66";
import {typeSymbol} from "./type-symbols.js?v=66";
import {describeCard,cardTooltip} from "./card-text.js?v=66";
coachConfigure({species,canPay,retreatCost,dispatch});
const $=s=>document.querySelector(s);
const board=$("#board"),status=$("#status"),error=$("#error"),log=$("#log"),modal=$("#modal"),panel=$("#modal .modal-content");
const escape=s=>String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const sprite=id=>`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
let state=newGame(),matchDecks=null,screen="menu",acknowledged=null;
let preview=null,revision=0,dragging=null,lastFocus=null;
let hoveredCard=null;
const turnHistory=createRecorder();turnHistory.start(state);
const planner=createPlanner();let aiEnabled=true,aiBusy=false;
const humanTurn=()=>!aiEnabled||state.turn!==1;
const handoff=()=>humanTurn()&&acknowledged!==state.turn;
const gameVisible=()=>screen==="game"&&!document.hidden;
const canHuman=(inModal=false)=>gameVisible()&&humanTurn()&&!handoff()&&state.winner===null&&(inModal||!preview);
const canReadOwnHand=player=>gameVisible()&&player===state.turn&&humanTurn()&&acknowledged===player;
const zoneAccessAllowed=token=>!token.protected||(token.ownHand?canReadOwnHand(token.player):canHuman(true));
const canReferee=()=>canHuman(true)&&state.phase==="playing";
const validToken=token=>!!token&&token===preview&&token.revision===revision&&token.actor===state.turn;
const cardName=c=>c?.kind==="pokemon"&&c.species!==undefined?species[c.species].name:c?.name||`${c?.type||"Basic"} Energy`;
const displayCard=c=>c?.kind==="pokemon"&&c.species!==undefined?cardInfo(c):c;
const costHtml=cost=>cost.map(type=>`<span class="cost-type">${typeSymbol(type)}<span>${escape(type)}</span></span>`).join(" + ");
const zoneName=zone=>({hand:"Hand",deck:"Deck",discard:"Discard",lostZone:"Lost Zone",prizeCards:"Prizes"}[zone]);
const playerLabel=i=>`Player ${i+1}`;
function syncCoachPrivacy(){
 const root=$("#coach");if(!root)return;
 const visible=gameVisible()&&humanTurn()&&!handoff();root.hidden=!visible;
 if(!visible)root.querySelector(".coach-bubble")?.replaceChildren();
}
function updateCoach(event){coachUpdate(event);syncCoachPrivacy();}
function setError(message){error.textContent=message;const local=panel.querySelector(".modal-error");if(local)local.textContent=message;}
function aiAllowed(){return aiEnabled&&state.turn===1&&!preview&&state.winner===null;}
function queueAI(){
 if(!aiAllowed()||aiBusy)return;aiBusy=true;
 setTimeout(()=>{
  try{
   for(let n=0;n<24&&aiAllowed();n++){
    const step=planner.next(state);
    if(!step){
     if(state.phase==="setup"&&!state.players[1].active){
      const index=state.players[1].hand.findIndex(c=>c.kind==="pokemon"&&!species[c.species]?.stage);
      if(index>=0){if(!act("select",{index},{source:"ai"})||!act("play",{target:"active"},{source:"ai"}))break;continue;}
     }
     if(state.phase==="setup"&&state.players[1].active){if(!act("ready",{},{source:"ai"}))break;continue;}
     if(state.phase==="playing"){if(!act("end",{},{source:"ai"}))break;continue;}
     break;
    }
    if(step.select!==undefined&&!act("select",{index:step.select},{source:"ai"}))break;
    const before=state;
    if(!act(step.action,step.payload||{},{source:"ai"})){
     planner.reset();const message="AI skipped an invalid action: "+error.textContent;
     if(state.phase==="setup"&&state.players[1].active)act("ready",{},{source:"ai"});
     else if(state.phase==="playing")act("end",{},{source:"ai"});
     setError(message);break;
    }
    planner.applied(step,state);if(state===before)break;
   }
   render();updateCoach({state,action:"ai"});
  }catch(e){
   const message="AI error: "+e.message;
   if(state.turn===1&&state.phase==="playing")act("end",{},{source:"ai"});
   setError(message);
  }finally{aiBusy=false;}
 },180);
}
function clearModal(){preview=null;modal.hidden=true;panel.replaceChildren();if(lastFocus?.isConnected)lastFocus.focus();lastFocus=null;}
function closeModal(){
 // A revealed search cannot be abandoned as a free peek: reserve its costs
 // until this atomic action pays them, resolves the search, and shuffles.
 if(preview?.ballCost&&validToken(preview)){
  const token=preview;
  if(!act("trainer",{discardIndices:token.ballCost,searchIndex:null},{source:"settle",token}))return false;
  $("#action-notice").textContent="Closed search resolved without finding a Pokémon. Discard costs were paid and the deck shuffled.";
 }else if(preview?.trainerPayload&&validToken(preview)){
  const token=preview;
  if(!act(token.settleAction||"trainer",token.trainerPayload,{source:"settle",token}))return false;
  $("#action-notice").textContent="Closed search resolved without finding a card. Committed costs and the card effect were resolved.";
 }else if(preview?.snackPayload&&validToken(preview)){
  const token=preview;
  if(!act("ability",token.snackPayload,{source:"settle",token}))return false;
  $("#action-notice").textContent="Snack Seek resolved by keeping the top card. The Ability was used.";
 }else clearModal();
 renderControls();queueAI();return true;
}
function openModal(type,data={},html=""){
 lastFocus=document.activeElement;preview={type,...data,actor:state.turn,revision};modal.hidden=false;
 panel.innerHTML=html+'<p class="modal-error" role="alert"></p>';renderControls();$(".close-modal").focus();return preview;
}
function modalHuman(token){if(!validToken(token)||!canHuman(true)){setError("This choice expired. Close it and inspect again during your turn.");return false;}return true;}
function actionButton(text,callback,{disabled=false,parent=panel}={}){const token=preview,b=document.createElement("button");b.type="button";b.textContent=text;b.disabled=disabled;b.addEventListener("click",()=>{if(validToken(token))callback();});parent.append(b);return b;}
function inputLabel(text,{parent=panel,placeholder="",type="text"}={}){const label=document.createElement("label");label.className="modal-label";label.textContent=text;const input=document.createElement("input");input.type=type;input.placeholder=placeholder;label.append(input);parent.append(label);return input;}
function act(action,payload={},options={}){
 const {source="human",token}=options;
 if(source==="human"&&(!canHuman(!!token)||(token&&!validToken(token)))){setError("Only the acknowledged current player can make this choice.");return false;}
 if(source==="ai"&&!aiAllowed()){setError("AI action canceled: the playmat is not available.");return false;}
 if(source==="referee"&&(!canReferee()||!validToken(token))){setError("Counters can only change during the current player's turn after handoff.");return false;}
 if(source==="settle"&&(!validToken(token)||(!token.ballCost&&!token.snackPayload&&!token.trainerPayload)||!humanTurn()))return false;
 let result;
 try{result=action==="reset"?{state:newGame(options.decks??matchDecks)}:dispatch(state,action,payload);}catch(cause){setError(cause.message||String(cause));return false;}
 if(result.error){setError(result.error);if(source!=="ai")updateCoach({prev:state,state,action,error:result.error});return false;}
 if(action==="reset"){planner.reset();turnHistory.start(result.state);}else{turnHistory.record(state,result.state,action,payload);planner.onChange(state,result.state,action);}
 const prev=state,oldTurn=state.turn;state=result.state;revision++;dragging=null;clearModal();
 if(action==="reset"||oldTurn!==state.turn)acknowledged=null;
 setError("");$("#action-notice").textContent="";render();if(source!=="ai"){updateCoach({prev,state,action,error:""});queueAI();}return true;
}
function cardHtml(data,opts={}){
 const {small=false,selected=false,back=false,empty=false,attrs:sourceAttrs=""}=opts;
 if(empty)return `<div class="tcg-card empty">${escape(data||"Empty")}</div>`;
 if(back)return '<div class="tcg-card back" aria-label="Face-down card"><span>Pokémon</span></div>';
 const printed=displayCard(data);
 const attrs=sourceAttrs+` title="${escape(cardTooltip(printed))}"`;
 if(printed.external&&printed.image){
  const label=[printed.name,printed.set,printed.number].filter(Boolean).join(" · ");
  return `<div class="tcg-card printed ${printed.kind==="pokemon"?"pokemon":""} ${small?"small":""} ${selected?"selected":""}" ${attrs}><img src="${escape(printed.image)}" alt="${escape(label)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('image-unavailable')"><span class="print-fallback">${escape(printed.name)}<small>${escape([printed.set,printed.number].filter(Boolean).join(" "))}</small></span>${printed.damage?`<span class="print-damage">${printed.damage} damage</span>`:""}</div>`;
 }
 if(data.kind==="energy")return `<div class="tcg-card energy type-${escape(String(data.type||"colorless").toLowerCase())} ${small?"small":""} ${selected?"selected":""}" ${attrs}><div class="energy-symbol">${typeSymbol(data.type)}</div><strong>${escape(data.type||"Basic")} Energy</strong></div>`;
 if(data.kind==="trainer")return `<div class="tcg-card trainer trainer-${escape(String(data.subtype||"Item").toLowerCase().replace(/[^a-z]+/g,"-"))} ${small?"small":""} ${selected?"selected":""}" ${attrs}><span class="card-type">TRAINER</span><strong>${escape(data.name)}</strong><small>${escape(data.subtype||"Item")}</small>${data.image?`<img src="${escape(data.image)}" alt="" loading="lazy">`:""}${data.name==="Air Balloon"?'<span class="tool-effect">Retreat costs 2 less</span>':data.name==="Float Stone"?'<span class="tool-effect">No retreat cost</span>':""}</div>`;
 const c=printed;
 return `<div class="tcg-card pokemon type-${escape(String(c.type||"colorless").toLowerCase())} ${small?"small":""} ${selected?"selected":""}" ${attrs}><div class="card-top"><strong>${escape(c.name)}</strong><span>${typeSymbol(c.type)} ${c.hp} HP</span></div><img src="${escape(c.image||(c.printing?`https://images.pokemontcg.io/${c.printing.split("-")[0]}/${c.printing.split("-")[1]}.png`:sprite(c.id)))}" alt="" loading="lazy"><div class="card-bottom"><span class="attached-energies">${(c.energies||[]).map(type=>typeSymbol(type)).join("")||"—"}</span><span>${Math.max(0,c.hp-(c.damage||0))} HP</span></div><span class="damage-total">${c.damage||0} damage · ${(c.damage||0)/10} counters</span>${c.tool?`<div class="attached-tool">${escape(c.tool.name||"Air Balloon")}${c.tool.name==="Float Stone"?" · no retreat cost":c.tool.name==="Air Balloon"?" · retreat −2":""}</div>`:""}${cardStats(c)}</div>`;
}
function fieldVisible(player){return state.phase!=="setup"||(player===state.turn&&humanTurn()&&!handoff()&&gameVisible());}
function placementAllowed(card,player,target,slot){
 if(!card||player!==state.turn||!canHuman()||!["setup","playing"].includes(state.phase))return false;
 const p=state.players[player],mon=target==="active"?p.active:p.bench[slot];
 if(card.kind==="pokemon"){
  const def=species[card.species];
  if(!def.stage)return target==="active"?state.phase==="setup"&&!p.active:!!p.active&&!mon&&p.bench.length<5;
  return state.phase==="playing"&&state.round>2&&mon?.name===def.evolvesFrom&&mon.playedTurn!==state.round&&!mon.evolvedThisTurn;
 }
 if(state.phase!=="playing")return false;
 if(card.kind==="energy")return !!mon&&!p.attached;
 if(card.name==="Potion")return !!mon&&mon.damage>0;
 if(["Air Balloon","Float Stone","Muscle Band","Vitality Band"].includes(card.name))return !!mon&&!mon.tool;
 return false;
}
function fieldSlot(p,player,target,slot){
 const c=target==="active"?p.active:p.bench[slot],visible=fieldVisible(player),selected=state.players[state.turn].hand[dragging?.index??state.selection];
 const highlight=placementAllowed(selected,player,target,slot)?" playable":"";
 const label=`Player ${player+1} ${target==="active"?"Active":`Bench ${slot+1}`}`;
 return `<div class="field-position"><div class="slot ${target==="active"?"active-slot":""}${highlight}" role="button" tabindex="0" aria-label="${escape(label+(c&&visible?`: ${c.name}`:""))}" data-player="${player}" data-target="${target}" ${target==="bench"?`data-slot="${slot}"`:""}>${c?(visible?cardHtml(c,{small:target==="bench"}):cardHtml(null,{back:true})):cardHtml(target==="active"?"Choose Active":"Bench",{empty:true})}</div>${c&&visible?`<button class="field-inspect" type="button" data-inspect-field="${target}" data-player="${player}" data-slot="${slot??0}" aria-label="Inspect ${escape(label)}">Inspect</button>`:""}</div>`;
}
function pileButton(player,zone,count){return `<button type="button" class="pile zone-button" data-zone="${zone}" data-player="${player}" aria-label="Inspect Player ${player+1} ${zoneName(zone)} (${count} cards)"><span class="zone-label">${zoneName(zone)} · ${count}</span>${zone==="deck"||zone==="prizeCards"?cardHtml(null,{back:true}):'<span class="pile-icon" aria-hidden="true">▤</span>'}</button>`;}
function side(p,i){
 return `<section class="side ${i===1?"opponent":"self"} ${i===state.turn?"current":""}" aria-label="Player ${i+1} play area"><div class="prize-area">${pileButton(i,"prizeCards",p.prizes)}<button type="button" class="zone-link" data-zone="hand" data-player="${i}">Hand · ${p.hand.length}</button></div><div class="field"><div class="player-label">${playerLabel(i)} ${i===state.turn?"· CURRENT TURN":""}${state.phase==="setup"&&!fieldVisible(i)?" · face-down setup":""}</div><div class="bench-row">${Array.from({length:5},(_,slot)=>fieldSlot(p,i,"bench",slot)).join("")}</div><div class="active-row">${fieldSlot(p,i,"active")}</div></div><div class="pile-area">${pileButton(i,"deck",p.deck.length)}${pileButton(i,"discard",p.discard.length)}${pileButton(i,"lostZone",(p.lostZone||[]).length)}</div></section>`;
}
function renderPlans(){
 renderPlanGraph($("#ai-graph"),planner);
 $("#ai-plans").textContent=JSON.stringify({active:planner.active,archived:planner.archive.slice(-3)},null,2);
}
function render(){
 const p=state.players[state.turn],visible=humanTurn()&&!handoff()&&gameVisible();
 status.textContent=state.winner!==null?`Player ${state.winner+1} won by ${state.winReason}`:state.phase==="replacement"?`${playerLabel(state.turn)}: promote a Benched Pokémon`:state.phase==="retreat"?`${playerLabel(state.turn)}: complete retreat`:state.phase==="setup"?`Setup: ${playerLabel(state.turn)} — choose Active and Bench, then Ready`:`${playerLabel(state.turn)} · Turn ${state.round}`;
 $("#privacy-status").textContent="Keep private cards out of the other player's view. Both players maintain a valid board; consult a Judge for disputes or uncertainty.";
 board.innerHTML=`<div class="mat">${side(state.players[1],1)}<div class="divider"><section class="stadium-zone" aria-label="Stadium in play"><span class="zone-label">STADIUM · SHARED PLAY AREA</span>${state.stadium?cardHtml(state.stadium,{small:true}):'<div class="stadium-empty">No Stadium in play</div>'}${state.stadium?`<strong>${escape(state.stadium.name)}</strong>`:""}</section></div>${side(state.players[0],0)}<section id="handoff" ${handoff()?"":"hidden"}><h2>Pass to Player ${state.turn+1}</h2><p>Other players: look away before this player reveals their private hand.</p><button type="button" id="accept-handoff">I am Player ${state.turn+1} — reveal my hand</button></section><div class="hand"><div class="zone-label">Player ${state.turn+1}'s hand · ${p.hand.length} cards · ${visible?"private to current human":"hidden"}</div><div class="hand-cards">${visible?p.hand.map((c,i)=>cardHtml(c,{small:true,selected:i===state.selection,attrs:`data-hand="${i}" role="button" tabindex="0" draggable="${canHuman()}" aria-label="${escape(cardName(c))}; select, then tap a highlighted target; select again to inspect"`})).join(""):'<p class="privacy-note">Private cards are not shown to spectators or during handoff.</p>'}</div><p class="hint">${visible?(state.phase==="setup"?"Select a Basic Pokémon and tap an empty Active/Bench slot. Ready finishes your setup.":state.phase==="replacement"||state.phase==="retreat"?"Tap one of your Benched Pokémon.":"Select or drag a hand card to a highlighted own slot. Select again to inspect. Keyboard: Tab and Enter/Space. Public Inspect buttons never play a card."):"Public face-up cards, Discards, and Lost Zones remain inspectable."}</p></div></div>`;
 if(hoveredCard)board.querySelector(hoveredCard)?.classList.add("hovered");
 const visibleLog=state.phase==="setup"?["Setup Pokémon identities stay private until both players are Ready."]:state.log;
 log.replaceChildren(...visibleLog.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
 renderPlans();renderControls();syncCoachPrivacy();
}
function renderControls(){
 const p=state.players[state.turn],allowed=canHuman(),playing=allowed&&state.phase==="playing";
 for(const b of document.querySelectorAll("button[data-action]"))b.disabled=!playing;
 const ready=$('[data-action="ready"]');ready.hidden=state.phase!=="setup";ready.disabled=!allowed||state.phase!=="setup"||!p.active;
 const retreat=$('[data-action="retreat"]');retreat.hidden=state.phase!=="playing";retreat.innerHTML=`Retreat (${retreatCost(p.active)} ${typeSymbol("Colorless")} Colorless Energy)`;retreat.disabled=!playing||!p.bench.length||p.retreated||!p.active||p.active.energy<retreatCost(p.active);
 const trainer=$('[data-action="trainer"]');trainer.hidden=p.hand[state.selection]?.kind!=="trainer"||!humanTurn();trainer.disabled=!playing;
 $('[data-action="attack"]').textContent=p.active?.attacks?.length>1?"Choose Attack":"Attack";
 $("#ai-toggle").textContent=aiEnabled?"AI Player 2: ON":"AI Player 2: OFF";
 $("#ai-toggle").disabled=!!preview;
 let stadiumButton=$("#stadium-action");
 if(!stadiumButton){stadiumButton=document.createElement("button");stadiumButton.id="stadium-action";stadiumButton.type="button";stadiumButton.addEventListener("click",showStadiumAction);$("#ai-toggle").after(stadiumButton);}
 stadiumButton.hidden=!["Stormy Mountains","Tropical Beach","PokéStop"].includes(state.stadium?.name);
 stadiumButton.textContent="Use "+(state.stadium?.name||"Stadium");stadiumButton.disabled=!playing;
}
function playSelected(player,target,slot){
 if(!canHuman())return;
 if(player!==state.turn){setError("Play cards only on your own side.");return;}
 const card=state.players[state.turn].hand[state.selection];if(!card)return;
 const mon=target==="active"?state.players[player].active:state.players[player].bench[slot];
 if(card.kind==="pokemon"&&!species[card.species].stage&&mon){setError("A Basic Pokémon needs an empty slot; it cannot replace an occupied Pokémon.");return;}
 if(card.kind==="trainer"){
  if(card.name==="Quick Ball"||card.name==="Ultra Ball"){showBallSearch();return;}
  if(card.name==="Nest Ball"){showNestBallSearch();return;}
  if(["Gladion","Clay","Cynthia & Caitlin"].includes(card.name)){showSupporterPrinting(card);return;}
  if(card.name==="Peonia"){showPeonia(card);return;}
  if(card.name==="Professor's Letter"){showProfessorsLetter(card);return;}
  if(["Energy Retrieval","Fire Crystal"].includes(card.name)){showEnergyRecovery(card);return;}
  if(card.name==="Field Blower"){showFieldBlower(card);return;}
  if(["Pal Pad","VS Seeker"].includes(card.name)){showSupporterRecovery(card);return;}
  if(card.name==="Lusamine"){showLusamine(card);return;}
  if(["Max Potion","Devolution Spray"].includes(card.name)){showTargetTrainer(card);return;}
  if(["Acro Bike","Special Charge","Super Rod","Tag Call","Counter Catcher","Lana's Fishing Rod"].includes(card.name)){showRemainingTrainer(card);return;}
  if(["Pokégear 3.0","Battle Compressor","Trainers' Mail"].includes(card.name)){showPrintedSearch(card);return;}
  if(choiceTrainers.includes(card.name)&&!["Float Stone","Muscle Band","Vitality Band"].includes(card.name)){showFireTrainerChoices(card);return;}
  act("trainer",["Potion","Air Balloon","Float Stone","Muscle Band","Vitality Band"].includes(card.name)?{target,slot}:{});return;
 }
 act("play",{target,slot});
}
function hoverKey(card){
 if(card.dataset.hand!==undefined)return `.hand-cards [data-hand="${card.dataset.hand}"]`;
 const slot=card.closest("[data-target]");
 return slot?`[data-target="${slot.dataset.target}"][data-player="${slot.dataset.player}"]${slot.dataset.slot===undefined?"":`[data-slot="${slot.dataset.slot}"]`} .tcg-card:not(.empty)`:null;
}
board.addEventListener("pointerover",e=>{const card=e.target.closest(".hand-cards [data-hand]")||e.target.closest("[data-target]")?.querySelector(".tcg-card:not(.empty)");hoveredCard=card?hoverKey(card):null;board.querySelectorAll(".hovered").forEach(el=>{if(el!==card)el.classList.remove("hovered");});});
board.addEventListener("pointerleave",()=>{hoveredCard=null;board.querySelectorAll(".hovered").forEach(el=>el.classList.remove("hovered"));});
function inspectField(player,target,slot){
 if(!fieldVisible(player))return;
 const c=target==="active"?state.players[player].active:state.players[player].bench[slot];if(c)showPreview(c,{field:{player,target,slot}});
}
board.addEventListener("click",e=>{
 if(e.target.closest("#accept-handoff")){if(!preview&&gameVisible()&&humanTurn()){acknowledged=state.turn;updateCoach({state,action:"handoff"});render();}return;}
 const zone=e.target.closest("[data-zone]");if(zone){showZone(Number(zone.dataset.player),zone.dataset.zone);return;}
 const inspect=e.target.closest("[data-inspect-field]");if(inspect){inspectField(Number(inspect.dataset.player),inspect.dataset.inspectField,Number(inspect.dataset.slot));return;}
 const hand=e.target.closest("[data-hand]");if(hand){if(!canHuman())return;const index=Number(hand.dataset.hand);if(state.selection===index)showPreview(state.players[state.turn].hand[index],{private:true});else act("select",{index});return;}
 const slot=e.target.closest("[data-target]");if(!slot)return;
 const player=Number(slot.dataset.player),target=slot.dataset.target,n=Number(slot.dataset.slot);
 if(canHuman()&&player===state.turn){
  if((state.phase==="replacement"||state.phase==="retreat")&&target==="bench"){act(state.phase==="replacement"?"promote":"switch",{slot:n});return;}
  if(state.selection!==null){playSelected(player,target,n);return;}
 }
 inspectField(player,target,n);
});
board.addEventListener("keydown",e=>{
 if(e.key==="Escape"&&canHuman()&&state.selection!==null){e.preventDefault();act("deselect");return;}
 const el=e.target.closest('[role="button"]');if(el&&(e.key==="Enter"||e.key===" ")){e.preventDefault();el.click();}
});
function highlightDrag(){for(const slot of board.querySelectorAll("[data-target]"))slot.classList.toggle("playable",placementAllowed(state.players[state.turn].hand[dragging?.index??state.selection],Number(slot.dataset.player),slot.dataset.target,Number(slot.dataset.slot)));}
board.addEventListener("dragstart",e=>{const hand=e.target.closest("[data-hand]");if(!hand||!canHuman()){e.preventDefault();return;}dragging={index:Number(hand.dataset.hand),revision,actor:state.turn};e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(dragging.index));highlightDrag();});
board.addEventListener("dragover",e=>{const slot=e.target.closest("[data-target]");if(slot&&dragging&&canHuman()){e.preventDefault();e.dataTransfer.dropEffect=placementAllowed(state.players[state.turn].hand[dragging.index],Number(slot.dataset.player),slot.dataset.target,Number(slot.dataset.slot))?"move":"none";}});
board.addEventListener("drop",e=>{
 e.preventDefault();const slot=e.target.closest("[data-target]"),drag=dragging;dragging=null;if(!slot||!drag||drag.revision!==revision||drag.actor!==state.turn||!canHuman()){highlightDrag();return;}
 const player=Number(slot.dataset.player),target=slot.dataset.target,n=Number(slot.dataset.slot),card=state.players[state.turn].hand[drag.index];
 if(!placementAllowed(card,player,target,n)){setError(player!==state.turn?"Drop only on your own side.":"That is not an available target for this card.");highlightDrag();return;}
 if(state.selection!==drag.index&&!act("select",{index:drag.index}))return;playSelected(player,target,n);
});
board.addEventListener("dragend",()=>{dragging=null;highlightDrag();});
function renderCardDetails(token,c,{back}={}){
 if(token.type==="zone"&&!zoneEntries(token)?.some(entry=>entry.c===c)){clearModal();renderControls();return;}
 const d=displayCard(c),description=describeCard(d);panel.innerHTML=`<div class="card-view">${cardHtml(c)}<div class="card-info"><h2>${escape(cardName(c))}</h2><p class="card-heading">${escape(description.heading)}</p>${description.sections.map(section=>`<h3>${escape(section.title)}</h3>${section.lines.map(line=>`<p>${escape(line)}</p>`).join("")}`).join("")}${d.hp?'<p class="stat-legend">Weakness and Resistance are informational; their damage rules are not implemented. Damage counters represent 10 damage each.</p>':""}</div></div><p class="modal-error" role="alert"></p>`;
 if(token.type==="zone"&&token.authorized){const note=document.createElement("p");note.id="inspection-scope";note.textContent=`Authorized scope: ${inspectionScopeText(token.scope,token.zone)}. Details do not expand this permission.`;panel.append(note);}
 if(back){const button=actionButton("Back to cards",()=>{if(validToken(token))back();});if(token.type==="zone"){button.id="inspection-back";button.focus();}}
 if(token.field){
  const {player,target,slot}=token.field;
  const summary=document.createElement("p");summary.className="field-card-state";
  summary.textContent=`Current HP: ${Math.max(0,d.hp-(d.damage||0))}/${d.hp}. Damage: ${d.damage||0} (${(d.damage||0)/10} counters). Attached Energy: ${(d.energies||[]).join(", ")||"none"}. Attached Tool: ${d.tool?.name||"none"}.`;
  panel.append(summary);
  if(player===state.turn&&d.ability&&canHuman(true)&&state.phase==="playing")actionButton(`Use ${d.ability.name}`,()=>useAbility(token),{disabled:!!d.abilityUsed||state.winner!==null});
  if(canReferee()){
   const note=document.createElement("p");note.textContent=`Manual counter placement/removal, not attack damage: ${d.damage||0} damage (${(d.damage||0)/10} counters). Resolve uncertain rulings with a Judge; players are responsible for legality.`;panel.append(note);
   const reason=inputLabel("Card/rule and reason for counter change",{placeholder:"Explain the authorized effect or correction"});reason.id="counter-reason";
   for(const counters of [-1,1]){const button=actionButton(counters===1?"Place 1 counter (+10)":"Remove 1 counter (−10)",()=>{if(!validToken(token)||!canReferee())return;if(!reason.value.trim()){setError("Enter the authorizing card/rule and reason.");return;}act("adjustDamage",{player,target,...(target==="bench"?{slot}:{}),counters,reason:reason.value.trim()},{source:"referee",token});},{disabled:counters<0&&!d.damage});button.dataset.counterChange=String(counters);button.setAttribute("aria-label",counters===1?"Place one damage counter (+10 damage)":"Remove one damage counter (minus 10 damage)");}
  }
 }
}
function showPreview(card,options={}){if(options.private&&!canHuman())return;const token=openModal("card",{...options,card});renderCardDetails(token,card);}
function validInspectionScope(scope,zone,size){
 if(!scope||!Number.isInteger(scope.count)||scope.count<0||scope.count>size)return false;
 if(scope.kind==="entire")return scope.count===size;
 if(scope.kind==="top"||scope.kind==="bottom")return zone==="deck"&&scope.count>0;
 if(scope.kind!=="positions"||!["hand","prizeCards"].includes(zone)||!Array.isArray(scope.positions))return false;
 return scope.count>0&&scope.count===scope.positions.length&&new Set(scope.positions).size===scope.count&&scope.positions.every(index=>Number.isInteger(index)&&index>=0&&index<size);
}
function inspectionScopeText(scope,zone){
 if(scope.kind==="entire")return `Entire ${zoneName(zone)} (${scope.count} cards)`;
 if(scope.kind==="positions")return `${zoneName(zone)} positions ${scope.positions.map(index=>index+1).join(", ")} (${scope.count} cards)`;
 return `${scope.kind==="top"?"Top":"Bottom"} ${scope.count} Deck card${scope.count===1?"":"s"} (in deck order)`;
}
function zoneEntries(token){
 if(!validToken(token)||!zoneAccessAllowed(token))return null;
 const cards=state.players[token.player]?.[token.zone];if(!Array.isArray(cards))return null;
 let indices;
 if(token.protected&&!token.ownHand){
  if(!token.authorized||token.zoneSize!==cards.length||!validInspectionScope(token.scope,token.zone,cards.length))return null;
  const {scope}=token;
  if(scope.kind==="positions")indices=scope.positions;
  else if(scope.kind==="top")indices=Array.from({length:scope.count},(_,index)=>index);
  else if(scope.kind==="bottom")indices=Array.from({length:scope.count},(_,index)=>cards.length-scope.count+index);
 }
 const entries=indices?indices.map(index=>({c:cards[index],index})):cards.map((c,index)=>({c,index}));
 if((token.zone==="deck"||token.zone==="prizeCards")&&(!token.authorized||token.scope.kind==="entire"))entries.sort((a,b)=>Number(eligible(b.c))-Number(eligible(a.c))||cardName(a.c).localeCompare(cardName(b.c)));
 return entries;
}
function renderZoneCards(token){
 const entries=zoneEntries(token);if(!entries){clearModal();renderControls();return;}
 const scoped=token.authorized,scopeText=scoped?inspectionScopeText(token.scope,token.zone):"";
 panel.innerHTML=`<h2>Player ${token.player+1} ${zoneName(token.zone)} · ${entries.length} cards</h2>${token.ownHand?"<p>Your own hand · read-only inspection.</p>":""}${scoped?`<p id="inspection-scope" class="permission-note">${escape(scopeText)}. Manual permission declared — players are responsible for legality. Access ends when this dialog closes or control changes. Ordered peeks retain deck order; selected positions retain their position labels; entire Deck/Prize searches are alphabetical. Inspection never moves, reorders, or shuffles cards.</p>`:""}<div class="inspection-grid" aria-label="Authorized inspection cards"></div><p class="modal-error" role="alert"></p>`;
 const grid=panel.querySelector(".inspection-grid");
 for(const {c,index} of entries){
  const position=scoped&&token.scope.kind!=="entire"?`${token.zone==="prizeCards"?"Prize":zoneName(token.zone)} position ${index+1}`:"";
  const b=document.createElement("button");b.type="button";b.className="inspect-card";b.setAttribute("aria-label",`${position?position+": ":""}Inspect ${cardName(c)}`);b.innerHTML=(position?`<span>${escape(position)}</span>`:"")+cardHtml(c,{small:true});
  b.dataset.inspectionPosition=String(index+1);
  b.addEventListener("click",()=>{if(zoneEntries(token)?.some(entry=>entry.index===index&&entry.c===c))renderCardDetails(token,c,{back:()=>{renderZoneCards(token);panel.querySelector(`[data-inspection-position="${index+1}"]`)?.focus();}});});grid.append(b);
 }
 if(!entries.length)grid.textContent="No cards in this authorized scope.";
}
function showStadiumAction(){
 if(!canHuman()||state.phase!=="playing"||!state.stadium)return;
 if(["Tropical Beach","PokéStop"].includes(state.stadium.name)){act("stadium");return;}
 if(state.stadium.name!=="Stormy Mountains")return;
 const failure=dispatch(state,"stadium",{searchIndex:null}).error;if(failure){setError(failure);return;}
 const p=state.players[state.turn],token=openModal("stadium",{trainerPayload:{searchIndex:null},settleAction:"stadium"},"<h2>Stormy Mountains</h2><p>Search your Deck for a Basic Lightning or Dragon Pokémon to Bench, then shuffle. Closing resolves without finding a Pokémon and uses this turn's activation.</p><div class=\"print-search-grid\"></div>");
 const select=document.createElement("select");select.setAttribute("aria-label","Basic Lightning or Dragon Pokémon");select.innerHTML='<option value="">Do not find a Pokémon</option>';
 const grid=panel.querySelector(".print-search-grid");
 p.deck.forEach((card,index)=>{
  const eligible=card.kind==="pokemon"&&!species[card.species]?.stage&&["Lightning","Dragon"].includes(species[card.species]?.type);
  const tile=document.createElement("div");tile.className="print-search-tile";tile.innerHTML=cardHtml(card,{small:true});
  if(eligible){const option=document.createElement("option");option.value=String(index);option.textContent=cardName(card);select.append(option);actionButton("Choose "+cardName(card),()=>{if(modalHuman(token))select.value=String(index);},{parent:tile});}
  grid.append(tile);
 });
 panel.append(select);actionButton("Use Stormy Mountains",()=>{if(modalHuman(token))act("stadium",{searchIndex:select.value===""?null:Number(select.value)},{token});});
}
function showZone(player,zone){
 if(!Number.isInteger(player)||player<0||player>=state.players.length||!["hand","deck","discard","lostZone","prizeCards"].includes(zone))return;
 const publicZone=zone==="discard"||zone==="lostZone",ownHand=zone==="hand"&&canReadOwnHand(player);
 if(publicZone||ownHand){const token=openModal("zone",{player,zone,protected:!publicZone,ownHand});renderZoneCards(token);return;}
 const allowed=canHuman(),zoneSize=state.players[player][zone].length;
 const token=openModal("authorization",{player,zone,zoneSize},`<h2>Player ${player+1} ${zoneName(zone)} · protected zone</h2><p>Hidden cards may be inspected only when a card or rule authorizes this particular access and scope, including effects targeting an opponent's zone. A manual declaration is not proof of legality; consult a Judge if disputed or uncertain.</p>`);
 if(!allowed){const text=document.createElement("p");text.className="permission-note";text.textContent="Only the acknowledged current player may declare permission. Close this dialog and complete the handoff first.";panel.append(text);return;}
 const form=document.createElement("form");form.id="inspection-form";form.setAttribute("aria-label","Declare authorized hidden-zone inspection");form.addEventListener("submit",event=>event.preventDefault());panel.append(form);
 const card=inputLabel("Authorizing card or rule",{parent:form,placeholder:"Name the card or rule granting this access"});card.id="inspection-authority";
 const reason=inputLabel("Reason for permitted inspection",{parent:form,placeholder:"Why may you inspect this player's zone?"});reason.id="inspection-reason";
 const scopeLabel=document.createElement("label");scopeLabel.className="modal-label";scopeLabel.textContent="Authorized inspection scope";
 const scopeSelect=document.createElement("select");scopeSelect.id="inspection-scope-choice";scopeSelect.innerHTML='<option value="">Choose the exact authorized scope</option>'+(zone==="deck"?'<option value="top">Top N Deck cards only</option><option value="bottom">Bottom N Deck cards only</option>':'<option value="positions">Selected face-down positions only</option>')+'<option value="entire">Entire zone — only if explicitly authorized</option>';scopeLabel.append(scopeSelect);form.append(scopeLabel);
 const countArea=document.createElement("div");countArea.hidden=true;form.append(countArea);
 const count=inputLabel("Number of authorized Deck cards",{parent:countArea,type:"number"});count.id="inspection-count";count.min="1";count.max=String(zoneSize);count.step="1";count.value="1";count.disabled=true;
 const positionsArea=document.createElement("fieldset");positionsArea.id="inspection-positions";positionsArea.hidden=true;positionsArea.disabled=true;const legend=document.createElement("legend");legend.textContent="Choose only authorized face-down positions (no identity previews)";positionsArea.append(legend);
 const positions=[];
 if(zone!=="deck")for(let index=0;index<zoneSize;index++){
  const label=document.createElement("label");label.className="modal-label";const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.name="inspection-position";checkbox.value=String(index+1);checkbox.setAttribute("aria-label",`${zone==="prizeCards"?"Prize":"Hand"} position ${index+1}`);label.append(checkbox,document.createTextNode(`${zone==="prizeCards"?"Prize":"Hand"} position ${index+1} · face-down`));positionsArea.append(label);positions.push({checkbox,index});
 }
 form.append(positionsArea);
 scopeSelect.addEventListener("change",()=>{const ordered=scopeSelect.value==="top"||scopeSelect.value==="bottom";countArea.hidden=!ordered;count.disabled=!ordered;positionsArea.hidden=scopeSelect.value!=="positions";positionsArea.disabled=positionsArea.hidden;});
 const note=document.createElement("p");note.textContent="Only the chosen scope will be revealed. Card/rule, reason, and scope are recorded publicly; inspected card identities are not. Do not include private card identities in the declaration. No cards are moved or shuffled.";form.append(note);
 const submit=actionButton("Declare scope and inspect privately",()=>{
  if(!modalHuman(token))return;if(!card.value.trim()||!reason.value.trim()){setError("Name the authorizing card/rule and explain the permitted access.");return;}
  const kind=scopeSelect.value,chosen=positions.filter(({checkbox})=>checkbox.checked).map(({index})=>index);
  const scope=kind==="positions"?{kind,positions:chosen,count:chosen.length}:{kind,count:kind==="entire"?zoneSize:Number(count.value)};
  if(token.zoneSize!==state.players[player][zone].length||!validInspectionScope(scope,zone,zoneSize)){setError("Choose an explicit scope, a whole-number count within the current Deck, or at least one valid face-down position. Reopen inspection if the zone changed.");return;}
  if(act("inspectZone",{player,zone,reason:`Card/rule: ${card.value.trim()}; reason: ${reason.value.trim()}; scope: ${inspectionScopeText(scope,zone)}`},{token})){
   const access=openModal("zone",{player,zone,protected:true,authorized:true,scope,zoneSize});renderZoneCards(access);
  }
 },{parent:form});submit.id="inspection-authorize";
}
function useAbility(token){
 if(!modalHuman(token)||!token.field)return;
 const {target,slot,player}=token.field,c=target==="active"?state.players[player].active:state.players[player].bench[slot];
 if(player!==state.turn||!c?.ability)return;
 if(c.ability.name==="Call Signal"){
  panel.innerHTML="<h2>Magneton · Call Signal</h2><p>Search your deck for up to three Supporter cards, put them into your hand, and shuffle your deck. Magneton is then Knocked Out, and your opponent takes a Prize card.</p><p class='modal-error' role='alert'></p>";
  const grid=document.createElement("div");grid.className="search-deck-gallery";const selected=new Set();
  state.players[state.turn].deck.forEach((card,i)=>{
   const allowed=card.kind==="trainer"&&card.subtype==="Supporter";const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(allowed?"":" search-ineligible");tile.disabled=!allowed;tile.innerHTML=cardHtml(card,{small:true})+"<span>"+escape(cardName(card))+"</span>";
   tile.onclick=()=>{if(selected.has(i)){selected.delete(i);tile.classList.remove("chosen");return;}if(selected.size>=3){setError("Choose at most three Supporters.");return;}selected.add(i);tile.classList.add("chosen");};grid.append(tile);
  });panel.append(grid);
  actionButton("Use Call Signal (Knock Out Magneton)",()=>act("ability",{target,slot,searchIndices:[...selected]},{token}));return;
 }
 if(c.ability.name!=="Snack Seek"){act("ability",{target,slot},{token});return;}
 if(c.abilityUsed){setError("This Ability has already been used this turn.");return;}
 const top=state.players[state.turn].deck[0];if(!top){setError("No cards left to inspect.");return;}
 token.snackPayload={target,slot,discard:false};
 panel.innerHTML='<h2>Snack Seek · authorized top-card inspection</h2>'+cardHtml(top)+'<p>Privately choose whether to keep the top card or discard it. This does not authorize inspecting the rest of the deck. Closing keeps the card on top and uses this Ability.</p><p class="modal-error" role="alert"></p>';
 for(const discard of [false,true])actionButton(discard?"Discard top card":"Keep on top",()=>{if(modalHuman(token))act("ability",{target,slot,discard},{token});});
}
const choiceTrainers=["Buddy-Buddy Poffin","Evolution Incense","Level Ball","Poké Pad","Trainers' Mail","Earthen Vessel","Arven","Gloria","Hisuian Heavy Ball","Night Stretcher","Rescue Stretcher","Lana's Aid","Welder","Float Stone","Muscle Band","Vitality Band","Bird Keeper","Blacksmith","Raihan","Guzma","Escape Rope","Rare Candy","Scoop Up Net"];
function showSupporterPrinting(card){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn],name=card.name;
 const token=openModal("supporter-printing",{card},`<h2>${escape(name)}</h2><p>${name==="Gladion"?"Look at your face-down Prize cards. Choose one to put in your hand; Gladion replaces it and the remaining Prizes are shuffled.":name==="Clay"?"Discard the top seven cards of your deck and put all Item cards discarded this way into your hand.":"Put a Supporter other than Cynthia & Caitlin from your discard pile into your hand. You may also discard another card from your hand to draw three."}</p>`);
 if(name==="Clay"){actionButton("Play Clay",()=>act("trainer",{}, {token}));return;}
 if(name==="Gladion"){
  const grid=document.createElement("div");grid.className="search-deck-gallery";let selected=null;
  p.prizeCards.forEach((c,i)=>{const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile";tile.innerHTML=cardHtml(c,{small:true})+"<span>Prize "+(i+1)+"</span>";tile.onclick=()=>{selected=i;grid.querySelectorAll(".chosen").forEach(x=>x.classList.remove("chosen"));tile.classList.add("chosen");};grid.append(tile);});panel.append(grid);
  actionButton("Exchange selected Prize",()=>{if(selected===null){setError("Choose a Prize card.");return;}act("trainer",{prizeIndex:selected},{token});});return;
 }
 const supporter=document.createElement("select");supporter.setAttribute("aria-label","Supporter to recover");
 supporter.innerHTML='<option value="">Do not recover a Supporter</option>';
 p.discard.forEach((c,i)=>{if(c.kind==="trainer"&&c.subtype==="Supporter"&&c.name!=="Cynthia & Caitlin"){const opt=document.createElement("option");opt.value=i;opt.textContent=c.name;supporter.append(opt);}});
 const cost=document.createElement("select");cost.setAttribute("aria-label","Discard a hand card to draw three");cost.innerHTML='<option value="">Do not discard or draw</option>';
 p.hand.forEach((c,i)=>{if(i===state.selection)return;const opt=document.createElement("option");opt.value=i;opt.textContent=cardName(c);cost.append(opt);});
 const label1=document.createElement("p");label1.textContent="Supporter from discard:";const label2=document.createElement("p");label2.textContent="Optional hand discard to draw 3:";
 panel.append(label1,supporter,label2,cost);
 actionButton("Play Cynthia & Caitlin",()=>act("trainer",{discardIndex:supporter.value===""?null:Number(supporter.value),discardCostIndex:cost.value===""?null:Number(cost.value)},{token}));
}
function showTargetTrainer(card){
 const p=state.players[state.turn],token=openModal("target-trainer",{card},"<h2>"+escape(card.name)+"</h2><p>Choose your Pokémon.</p>");
 const grid=document.createElement("div");grid.className="search-deck-gallery";
 [{mon:p.active,target:"active"},...p.bench.map((mon,slot)=>({mon,target:"bench",slot}))].filter(x=>x.mon).forEach(x=>{
 const allowed=card.name==="Max Potion"?x.mon.damage>0:!!x.mon.under?.length;
 const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(allowed?"":" search-ineligible");tile.disabled=!allowed;tile.innerHTML=cardHtml({kind:"pokemon",species:x.mon.speciesIndex},{small:true})+"<span>"+escape(x.mon.name)+"</span>";tile.onclick=()=>act("trainer",{target:x.target,slot:x.slot},{token});grid.append(tile);
 });panel.append(grid);
}
function showPeonia(card){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn],token=openModal("peonia",{card},"<h2>Peonia</h2><p>Select up to three face-down Prize cards, then select the same number of other cards from your hand to put face down as new Prize cards.</p>");
 const prizes=new Set(),hand=new Set(),heading=(text)=>{const h=document.createElement("h3");h.textContent=text;panel.append(h);};
 const makeGrid=(cards,selected,limit,valid,label)=>{const grid=document.createElement("div");grid.className="search-deck-gallery";cards.forEach((c,i)=>{const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile";tile.disabled=!valid(i);tile.innerHTML=label(c,i);tile.onclick=()=>{if(selected.has(i)){selected.delete(i);tile.classList.remove("chosen");}else if(selected.size<limit()){selected.add(i);tile.classList.add("chosen");}else setError("Too many cards selected.");};grid.append(tile);});panel.append(grid);};
 heading("Prize cards");makeGrid(p.prizeCards,prizes,()=>3,()=>true,(_,i)=>"<span>Face-down Prize "+(i+1)+"</span>");
 heading("Cards from hand");makeGrid(p.hand,hand,()=>prizes.size,i=>i!==state.selection,(c)=>cardHtml(c,{small:true})+"<span>"+escape(cardName(c))+"</span>");
 actionButton("Play Peonia",()=>{if(hand.size!==prizes.size){setError("Select the same number of Prize and hand cards.");return;}act("trainer",{prizeIndices:[...prizes],handIndices:[...hand]},{token});});
}
function showProfessorsLetter(card){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn],token=openModal("professors-letter",{card},"<h2>Professor's Letter</h2><p>Choose up to two Basic Energy cards from your deck, then shuffle.</p>");
 const selected=new Set(),grid=document.createElement("div");grid.className="search-deck-gallery";
 p.deck.forEach((c,i)=>{const ok=c.kind==="energy"&&["Fire","Water","Grass","Lightning","Psychic","Fighting","Darkness","Metal","Fairy"].includes(c.type);const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(ok?"":" search-ineligible");tile.disabled=!ok;tile.innerHTML=cardHtml(c,{small:true})+"<span>"+escape(cardName(c))+"</span>";tile.onclick=()=>{if(selected.has(i)){selected.delete(i);tile.classList.remove("chosen");}else if(selected.size<2){selected.add(i);tile.classList.add("chosen");}else setError("Choose at most two Basic Energy cards.");};grid.append(tile);});panel.append(grid);
 actionButton("Play Professor's Letter",()=>act("trainer",{searchIndices:[...selected]},{token}));
}
function showEnergyRecovery(card){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn],crystal=card.name==="Fire Crystal",max=crystal?3:2;
 const token=openModal("energy-recovery",{card},"<h2>"+escape(card.name)+"</h2><p>"+(crystal?"Choose exactly three Fire Energy cards.":"Choose up to two Basic Energy cards.")+"</p>");
 const selected=new Set(),grid=document.createElement("div");grid.className="search-deck-gallery";
 p.discard.forEach((c,i)=>{const ok=c.kind==="energy"&&(crystal?c.type==="Fire":["Fire","Water","Grass","Lightning","Psychic","Fighting","Darkness","Metal","Colorless","Dragon","Fairy"].includes(c.type));const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(ok?"":" search-ineligible");tile.disabled=!ok;tile.innerHTML=cardHtml(c,{small:true})+"<span>"+escape(cardName(c))+"</span>";tile.onclick=()=>{if(selected.has(i)){selected.delete(i);tile.classList.remove("chosen");}else if(selected.size<max){selected.add(i);tile.classList.add("chosen");}else setError("Choose at most "+max+" cards.");};grid.append(tile);});panel.append(grid);
 actionButton("Play "+card.name,()=>{if(crystal&&selected.size!==3){setError("Fire Crystal requires three Fire Energy cards.");return;}act("trainer",{discardIndices:[...selected]},{token});});
}
function showFieldBlower(card){
 if(!canHuman()||state.phase!=="playing")return;
 const token=openModal("field-blower",{card},"<h2>Field Blower</h2><p>Choose up to two Pokémon Tools or Stadium cards in play to discard.</p>");
 const choices=[];
 for(let player=0;player<2;player++){
  const p=state.players[player];
  if(p.active?.tool)choices.push({kind:"tool",player,target:"active",card:p.active.tool});
  p.bench.forEach((mon,slot)=>{if(mon.tool)choices.push({kind:"tool",player,target:"bench",slot,card:mon.tool});});
 }
 if(state.stadium)choices.push({kind:"stadium",card:state.stadium});
 const chosen=new Set(),grid=document.createElement("div");grid.className="search-deck-gallery";
 choices.forEach((entry,i)=>{const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile";tile.innerHTML=cardHtml(entry.card,{small:true})+"<span>"+escape(entry.card.name)+" · "+(entry.kind==="stadium"?"Stadium":"Player "+(entry.player+1))+"</span>";tile.onclick=()=>{if(chosen.has(i)){chosen.delete(i);tile.classList.remove("chosen");}else if(chosen.size<2){chosen.add(i);tile.classList.add("chosen");}else setError("Choose at most two cards.");};grid.append(tile);});panel.append(grid);
 actionButton("Play Field Blower",()=>act("trainer",{targets:[...chosen].map(i=>{const {card,...target}=choices[i];return target;})},{token}));
}
function showSupporterRecovery(card){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn],pad=card.name==="Pal Pad";
 const token=openModal("supporter-recovery",{card},"<h2>"+escape(card.name)+"</h2><p>"+(pad?"Choose up to two Supporter cards to shuffle into your deck.":"Choose one Supporter card to return to your hand.")+"</p>");
 const chosen=new Set(),grid=document.createElement("div");grid.className="search-deck-gallery";
 p.discard.forEach((c,i)=>{
  const ok=c.kind==="trainer"&&c.subtype==="Supporter",tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(ok?"":" search-ineligible");tile.disabled=!ok;tile.innerHTML=cardHtml(c,{small:true})+"<span>"+escape(cardName(c))+"</span>";
  tile.onclick=()=>{if(chosen.has(i)){chosen.delete(i);tile.classList.remove("chosen");}else if(chosen.size<(pad?2:1)){chosen.add(i);tile.classList.add("chosen");}else setError("Too many cards selected.");};grid.append(tile);
 });panel.append(grid);
 actionButton("Play "+card.name,()=>{if(!pad&&chosen.size!==1){setError("Select one Supporter.");return;}act("trainer",pad?{discardIndices:[...chosen]}:{discardIndex:[...chosen][0]},{token});});
}
function showLusamine(card){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn],token=openModal("lusamine",{card},"<h2>Lusamine</h2><p>Choose up to two Supporter or Stadium cards from your discard pile to return to your hand.</p>");
 const grid=document.createElement("div");grid.className="search-deck-gallery",chosen=new Set();
 p.discard.forEach((c,i)=>{const ok=c.kind==="trainer"&&["Supporter","Stadium"].includes(c.subtype)&&c.name!=="Lusamine";const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(ok?"":" search-ineligible");tile.disabled=!ok;tile.innerHTML=cardHtml(c,{small:true})+"<span>"+escape(cardName(c))+"</span>";tile.onclick=()=>{if(chosen.has(i)){chosen.delete(i);tile.classList.remove("chosen");}else if(chosen.size<2){chosen.add(i);tile.classList.add("chosen");}else setError("Choose up to two cards.");};grid.append(tile);});panel.append(grid);
 actionButton("Play Lusamine",()=>act("trainer",{discardIndices:[...chosen]},{token}));
}
function showRemainingTrainer(card){
 if(!canHuman()||state.phase!=="playing")return;
 const name=card.name,p=state.players[state.turn],bike=name==="Acro Bike",tag=name==="Tag Call",charge=name==="Special Charge",catcher=name==="Counter Catcher";
 const pool=catcher?state.players[1-state.turn].bench:bike?p.deck.slice(0,2):tag?p.deck:p.discard;
 const special=c=>c?.kind==="energy"&&(["Capture Energy","Recycle Energy","Speed Lightning Energy"].includes(c.name)||["Capture","Recycle","Speed Lightning"].includes(c.type)||c.subtype==="Special");
 const eligible=c=>catcher?true:bike?true:name==="Lana's Fishing Rod"?c.kind==="pokemon"||c.kind==="trainer"&&/Tool/i.test(c.subtype||""):tag?c.kind==="trainer"&&["Cynthia & Caitlin","Guzma & Hala","Bellelba & Brycen-Man"].includes(c.name)||c.kind==="pokemon"&&/TAG TEAM/i.test(cardName(c)):charge?special(c):c.kind==="pokemon"||c.kind==="energy"&&!special(c);
 const max=catcher||bike?1:charge||tag||name==="Lana's Fishing Rod"?2:3;
 const token=openModal("remaining-trainer",{card},`<h2>${escape(name)}</h2><p>${bike?"Choose one of the top two cards to keep; discard the other.":catcher?"Choose the opponent's Benched Pokémon to switch into the Active Spot.":tag?"Search your deck for up to two TAG TEAM cards.":charge?"Choose up to two Special Energy cards in your discard pile.":"Choose up to three Pokémon or Basic Energy cards in your discard pile."}</p><p>Selected: <span id="remaining-count">0</span> / ${max}</p>`);
 const selected=new Set(),grid=document.createElement("div");grid.className="search-deck-gallery";
 pool.forEach((c,i)=>{const ok=eligible(c),tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(ok?"":" search-ineligible");tile.disabled=!ok;tile.innerHTML=cardHtml(c,{small:true})+"<span>"+escape(cardName(c))+"</span>";tile.onclick=()=>{if(selected.has(i)){selected.delete(i);tile.classList.remove("chosen");}else{if(selected.size>=max){setError("Choose at most "+max+" cards.");return;}selected.add(i);tile.classList.add("chosen");}panel.querySelector("#remaining-count").textContent=selected.size;};grid.append(tile);});panel.append(grid);
 actionButton("Play "+name,()=>{if((bike||catcher)&&selected.size!==1){setError("Choose exactly one card.");return;}const indices=[...selected];act("trainer",catcher?{targetBench:indices[0]}:bike?{searchIndex:indices[0]}:{searchIndices:indices},{token});});
}
function showPrintedSearch(card){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn],name=card.name;
 const isGear=name==="Pokégear 3.0",isMail=name==="Trainers' Mail";
 const pool=isMail?p.deck.slice(0,4):isGear?p.deck.slice(0,7):p.deck;
 const token=openModal("printed-search",{card},`<h2>${escape(name)}</h2><p>${isMail?"Look at the top four cards. Choose up to one Trainer other than Trainers' Mail; shuffle afterward.":isGear?"Look at the top seven cards. Choose up to one Supporter; shuffle afterward.":"Search your entire deck. Choose up to three cards to discard; shuffle afterward."}</p>`);
 const grid=document.createElement("div");grid.className="search-deck-gallery";
 const selected=new Set();
 pool.forEach((c,i)=>{
  const allowed=isMail?c.kind==="trainer"&&c.name!=="Trainers' Mail":!isGear||c.kind==="trainer"&&c.subtype==="Supporter";
  const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(allowed?"":" search-ineligible");
  tile.disabled=!allowed;tile.innerHTML=cardHtml(c,{small:true})+"<span>"+escape(cardName(c))+"</span>"+(allowed?"":"<small>Not eligible</small>");
  tile.onclick=()=>{if(selected.has(i)){selected.delete(i);tile.classList.remove("chosen");return;}if(selected.size>=(isGear||isMail?1:3)){setError("Choose at most "+(isGear||isMail?1:3)+" cards.");return;}selected.add(i);tile.classList.add("chosen");};
  grid.append(tile);
 });
 panel.append(grid);
 const done=actionButton("Resolve "+name,()=>{
  if(!modalHuman(token))return;
  const payload=isGear||isMail?{searchIndex:selected.size?[...selected][0]:null}:{searchIndices:[...selected]};
  act("trainer",payload,{token});
 });done.id="printed-search-resolve";
}
function showFireTrainerChoices(card){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn];if(p.hand[state.selection]!==card)return;
 if(card.subtype==="Supporter"&&(p.supporterUsed||state.turn===0&&state.round===1)){setError("A Supporter cannot be used now.");return;}
 if(["Buddy-Buddy Poffin","Gloria"].includes(card.name)&&p.bench.length>=5){setError("Your Bench is full.");return;}
 if(card.name==="Raihan"&&!p.discard.some(c=>c.kind==="energy")){setError("Raihan requires a Basic Energy in the discard pile.");return;}
 if(card.name==="Earthen Vessel"&&p.hand.length<2){setError("Earthen Vessel requires another hand card to discard.");return;}
 const token=openModal("fire-trainer",{card},`<h2>${escape(card.name)}</h2>`);
 if(card.name!=="Earthen Vessel"){renderFireTrainerChoices(token,card);return;}
 panel.insertAdjacentHTML("beforeend","<p>Choose one other hand card to discard. The deck remains hidden until the cost is committed.</p>");
 const select=document.createElement("select");select.id="trainer-discard-cost";select.setAttribute("aria-label","Earthen Vessel discard cost");
 select.innerHTML=p.hand.map((c,i)=>i===state.selection?"":`<option value="${i}">${escape(cardName(c))}</option>`).join("");panel.append(select);
 const commit=actionButton("Commit discard cost and search",()=>{if(!modalHuman(token))return;token.discardCostIndices=[Number(select.value)];renderFireTrainerChoices(token,card);});commit.id="trainer-commit-cost";
}
function renderFireTrainerChoices(token,card){
 if(!modalHuman(token))return;
 const p=state.players[state.turn],name=card.name;
 const search=["Buddy-Buddy Poffin","Evolution Incense","Level Ball","Poké Pad","Trainers' Mail","Earthen Vessel","Arven","Gloria","Hisuian Heavy Ball","Raihan"].includes(name);
 const settlePayload=search?{searchIndices:[],...(token.discardCostIndices?{discardCostIndices:token.discardCostIndices}:{}),...(name==="Raihan"?{target:"active"}:{})}:null;
 if(search){const failure=dispatch(state,"trainer",settlePayload).error;if(failure){setError(failure);return;}}
 const recover=["Night Stretcher","Rescue Stretcher","Lana's Aid"].includes(name),welder=name==="Welder",switchBoth=["Guzma","Escape Rope"].includes(name),candy=name==="Rare Candy";
 const pool=search?(name==="Hisuian Heavy Ball"?p.prizeCards:p.deck):recover?p.discard:welder?p.hand:[];
 const limit=name==="Gloria"||name==="Lana's Aid"?3:["Buddy-Buddy Poffin","Earthen Vessel","Arven","Welder"].includes(name)?2:1;
 const eligible=c=>search?(name==="Buddy-Buddy Poffin"?c.kind==="pokemon"&&!species[c.species]?.stage&&species[c.species]?.hp<=70:name==="Evolution Incense"?c.kind==="pokemon"&&!!species[c.species]?.stage:name==="Level Ball"?c.kind==="pokemon"&&species[c.species]?.hp<=90:name==="Arven"?c.kind==="trainer"&&(c.subtype==="Item"||c.subtype==="Pokémon Tool"):name==="Trainers' Mail"?c.kind==="trainer"&&c.name!=="Trainers' Mail":name==="Earthen Vessel"?c.kind==="energy":name==="Gloria"||name==="Hisuian Heavy Ball"?c.kind==="pokemon"&&!species[c.species]?.stage:name==="Poké Pad"?c.kind==="pokemon":true):recover?c.kind==="pokemon"||name!=="Rescue Stretcher"&&c.kind==="energy":welder?c.kind==="energy"&&c.type==="Fire":false;
 panel.innerHTML=`<h2>${escape(name)}</h2><p>${search?name==="Trainers' Mail"?"Authorized scope: only the top four Deck cards, in order.":"Authorized scope: your "+(name==="Hisuian Heavy Ball"?"Prize cards":"entire Deck")+".":recover?"Choose cards from your public Discard.":"Choose eligible cards and targets."} Choose up to ${limit} card(s).${search?" Closing resolves without finding a card; this is not a free peek.":""}</p><div id="trainer-choices" class="cost-grid"></div><p class="modal-error" role="alert"></p>`;
 if(name==="Raihan")panel.insertAdjacentHTML("beforeend",'<p class="permission-note">Manual legality check: Raihan requires one of your Pokémon to have been Knocked Out during your opponent’s last turn. Players must verify this condition; this prototype does not establish permission.</p>');
 if(search)token.trainerPayload=settlePayload;
 const checks=[],grid=panel.querySelector("#trainer-choices");
 const entries=pool.map((c,i)=>({c,i})).filter(({i})=>name!=="Trainers' Mail"||i<4);
 if(search&&name!=="Trainers' Mail")entries.sort((a,b)=>cardName(a.c).localeCompare(cardName(b.c)));
 for(const {c,i} of entries){
  if(welder&&i===state.selection)continue;
  const label=document.createElement("label");label.className="cost-card";const check=document.createElement("input");check.type="checkbox";check.disabled=!eligible(c);if(!eligible(c))label.classList.add("search-ineligible");check.dataset.trainerIndex=String(i);check.setAttribute("aria-label",`Choose ${cardName(c)}${name==="Trainers' Mail"?` at Deck position ${i+1}`:""}`);
  label.innerHTML=(name==="Trainers' Mail"?`<span>Deck position ${i+1}</span>`:"")+cardHtml(c,{small:true});label.prepend(check);grid.append(label);checks.push({check,i});
 }
 const needsTarget=welder||switchBoth||candy||["Blacksmith","Raihan","Scoop Up Net","Float Stone","Muscle Band","Vitality Band","Bird Keeper"].includes(name);
 const target=document.createElement("select");target.id="trainer-target";target.setAttribute("aria-label","Target Pokémon");
 if(needsTarget){target.innerHTML=(p.active&&!switchBoth&&name!=="Bird Keeper"?'<option value="active">Active: '+escape(p.active.name)+'</option>':"")+p.bench.map((c,i)=>`<option value="bench-${i}">Bench ${i+1}: ${escape(c.name)}</option>`).join("");panel.append(target);}
 let opponent=null,evolution=null;
 if(switchBoth){opponent=document.createElement("select");opponent.id="trainer-opponent";opponent.setAttribute("aria-label",name==="Escape Rope"?"Opponent chooses their Benched Pokémon":"Opponent Benched Pokémon");opponent.innerHTML=state.players[1-state.turn].bench.map((c,i)=>`<option value="${i}">Opponent Bench ${i+1}: ${escape(c.name)}</option>`).join("");panel.append(opponent);}
 if(candy){evolution=document.createElement("select");evolution.id="trainer-evolution";evolution.setAttribute("aria-label","Stage 2 in hand");evolution.innerHTML=p.hand.map((c,i)=>({c,i})).filter(({c})=>c.kind==="pokemon"&&species[c.species]?.stage===2).map(({c,i})=>`<option value="${i}">${escape(cardName(c))}</option>`).join("");panel.append(evolution);}
 const done=actionButton("Play "+name,()=>{
  if(!modalHuman(token))return;
  const selected=checks.filter(x=>x.check.checked).map(x=>x.i),value=needsTarget?target.value:"active";
  if(selected.length>limit){setError(`Choose at most ${limit} cards.`);return;}
  if(name==="Arven"&&new Set(selected.map(i=>pool[i].subtype)).size!==selected.length){setError("Choose at most one Item and one Pokémon Tool.");return;}
  if(needsTarget&&!value||opponent&&!opponent.value||evolution&&!evolution.value){setError("Choose an available Pokémon target.");return;}
  const payload={...(search?{searchIndices:selected}:{}),...(recover||welder?{discardIndices:selected}:{}),...(token.discardCostIndices?{discardCostIndices:token.discardCostIndices}:{}),...(needsTarget?{target:value.startsWith("bench-")?"bench":"active",...(value.startsWith("bench-")?{slot:Number(value.slice(6))}:{})}:{}),...(opponent?{opponentSlot:Number(opponent.value)}:{}),...(evolution?{evolutionIndex:Number(evolution.value)}:{})};
  act("trainer",payload,{token});
 });done.id="trainer-play";
}
function showNestBallSearch(){
 if(!canHuman()||state.phase!=="playing")return;
 const p=state.players[state.turn];if(p.hand[state.selection]?.name!=="Nest Ball")return;
 if(p.bench.length>=5){setError("Your Bench is full.");return;}
 const failure=dispatch(state,"trainer",{searchIndex:null}).error;if(failure){setError(failure);return;}
 const token=openModal("nest-search",{trainerPayload:{searchIndex:null}},"<h2>Nest Ball</h2><p>Search your entire Deck for a Basic Pokémon, put it directly on your Bench, then shuffle. Closing resolves without finding a Pokémon.</p>");
 const select=document.createElement("select");select.id="nest-ball-choice";select.setAttribute("aria-label","Basic Pokémon to Bench");
 select.innerHTML='<option value="">Do not find a Pokémon</option>'+p.deck.map((c,i)=>({c,i})).filter(({c})=>c.kind==="pokemon"&&!species[c.species]?.stage).sort((a,b)=>cardName(a.c).localeCompare(cardName(b.c))).map(({c,i})=>`<option value="${i}">${escape(cardName(c))}</option>`).join("");
 panel.append(select);
 const gallery=document.createElement("div");gallery.className="search-deck-gallery";
 p.deck.map((c,i)=>({c,i})).sort((a,b)=>cardName(a.c).localeCompare(cardName(b.c))).forEach(({c,i})=>{
  const eligible=c.kind==="pokemon"&&!species[c.species]?.stage;
  const tile=document.createElement("button");tile.type="button";tile.className="search-deck-tile"+(eligible?"":" search-ineligible");
  tile.disabled=!eligible;tile.setAttribute("aria-label",(eligible?"Select ":"Not eligible: ")+cardName(c));
  tile.innerHTML=cardHtml(c,{small:true})+"<span>"+escape(cardName(c))+"</span>"+(eligible?"":"<small>Not eligible</small>");
  tile.onclick=()=>{select.value=String(i);gallery.querySelectorAll(".chosen").forEach(el=>el.classList.remove("chosen"));tile.classList.add("chosen");};
  gallery.append(tile);
 });
 const note=document.createElement("p");note.textContent="Showing all "+p.deck.length+" cards in your deck. Only Basic Pokémon can be selected.";panel.append(note,gallery);
 const done=actionButton("Play Nest Ball",()=>{if(modalHuman(token))act("trainer",{searchIndex:select.value===""?null:Number(select.value)},{token});});done.id="nest-ball-play";
}
function showBallSearch(){
 if(!canHuman())return;
 const p=state.players[state.turn],index=state.selection,card=p.hand[index];if(!card||!["Quick Ball","Ultra Ball"].includes(card.name))return;
 const required=card.name==="Quick Ball"?1:2;
 if(p.hand.length-1<required){setError(`${card.name} requires ${required} other hand card(s) to discard.`);return;}
 const token=openModal("ball",{index},`<h2>${escape(card.name)}</h2><p>Choose exactly ${required} other hand card(s) to discard. The deck stays hidden until costs are committed.</p><div class="cost-grid"></div>`);
 const checks=[],grid=panel.querySelector(".cost-grid");
 p.hand.forEach((c,i)=>{if(i===index)return;const label=document.createElement("label");label.className="cost-card";const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.setAttribute("aria-label",`Discard ${cardName(c)}`);label.innerHTML=cardHtml(c,{small:true});label.prepend(checkbox);grid.append(label);checks.push({checkbox,index:i});});
 actionButton("Commit discard costs and inspect deck",()=>{
  if(!modalHuman(token))return;const costs=checks.filter(x=>x.checkbox.checked).map(x=>x.index);if(costs.length!==required){setError(`Choose exactly ${required} other cards.`);return;}
  token.ballCost=costs;renderBallGrid(token,card);
 });
}
function renderBallGrid(token,card){
 if(!modalHuman(token))return;
 panel.innerHTML=`<h2>${escape(card.name)} · authorized deck search</h2><p>Discard cost committed. Choose ${card.name==="Quick Ball"?"a Basic":"any"} Pokémon to reveal, or finish without finding one. Resolving shuffles the deck. Closing or leaving now resolves a failed search and pays the costs.</p><div class="inspection-grid search-grid"></div><p id="search-choice" aria-live="polite">No Pokémon chosen.</p><p class="modal-error" role="alert"></p>`;
 token.searchIndex=null;
 const grid=panel.querySelector(".search-grid");
 state.players[state.turn].deck.map((c,i)=>({c,i})).sort((a,b)=>cardName(a.c).localeCompare(cardName(b.c))).forEach(({c,i})=>{
  const eligible=c.kind==="pokemon"&&(card.name==="Ultra Ball"||!species[c.species].stage),entry=document.createElement("div");entry.className="search-card";entry.innerHTML=cardHtml(c,{small:true});
  actionButton("Inspect",()=>{
   if(!modalHuman(token))return;const detail=$("#search-detail"),d=displayCard(c);
   detail.innerHTML=cardHtml(c)+`<h3>${escape(cardName(c))}</h3>${d.evolvesFrom?`<p>Evolves from ${escape(d.evolvesFrom)}</p>`:""}${d.attacks?.map(move=>`<p>${escape(move.name)} · ${costHtml(move.cost)} · ${move.damage} damage${move.text?` · ${escape(move.text)}`:""}</p>`).join("")||""}${d.ability?`<p>${escape(d.ability.name)}: ${escape(d.ability.text)}</p>`:""}`;
  },{parent:entry});
  if(eligible)actionButton("Choose",()=>{if(!modalHuman(token))return;token.searchIndex=i;for(const el of grid.children)el.classList.remove("chosen");entry.classList.add("chosen");$("#search-choice").textContent=`Reveal and take ${cardName(c)}.`;},{parent:entry});
  else{const note=document.createElement("small");note.textContent="Not eligible";entry.append(note);}grid.append(entry);
 });
 const detail=document.createElement("div");detail.id="search-detail";detail.setAttribute("aria-live","polite");panel.append(detail);
 actionButton("Finish without finding a Pokémon",()=>{if(modalHuman(token))act("trainer",{discardIndices:token.ballCost,searchIndex:null},{token});});
 actionButton("Reveal chosen Pokémon and finish",()=>{if(!modalHuman(token))return;if(token.searchIndex===null){setError("Choose an eligible Pokémon, or finish without finding one.");return;}act("trainer",{discardIndices:token.ballCost,searchIndex:token.searchIndex},{token});});
}
function chooseAttack(index,from){
 if(from?!modalHuman(from):!canHuman())return;
 const p=state.players[state.turn],move=p.active?.attacks[index];if(!move)return;
 if(move.effect!=="pickAndStick"){act("attack",{index},from?{token:from}:{});return;}
 const token=openModal("attack-energy",{},'<h2>Pick and Stick</h2><p>Choose up to two distinct Basic Energy from Discard and a target for each. This attack ends your turn.</p>');
 const fields=[];
 p.discard.forEach((card,i)=>{if(card.kind!=="energy")return;const label=document.createElement("label");label.className="modal-label";label.innerHTML=typeSymbol(card.type)+" "+escape(cardName(card));const select=document.createElement("select");select.setAttribute("aria-label",`Attach discarded ${cardName(card)} ${i+1} to`);select.innerHTML=`<option value="">Leave in discard</option><option value="active">Active: ${escape(p.active.name)}</option>`+p.bench.map((c,n)=>`<option value="${n}">Bench ${n+1}: ${escape(c.name)}</option>`).join("");label.append(select);panel.append(label);fields.push({select,index:i});});
 actionButton("Use Pick and Stick",()=>{if(!modalHuman(token))return;const attachments=fields.filter(x=>x.select.value!=="").map(x=>({index:x.index,target:x.select.value==="active"?"active":"bench",...(x.select.value==="active"?{}:{slot:Number(x.select.value)})}));act("attack",{index,attachments},{token});});
}
function showAttacks(){
 if(!canHuman())return;const p=state.players[state.turn];if(!p.active)return;
 const token=openModal("attacks",{},"<h2>Choose an attack</h2>");
 p.active.attacks.forEach((move,index)=>{const button=actionButton("",()=>chooseAttack(index,token));button.innerHTML=`${escape(move.name)} · ${costHtml(move.cost)} · ${move.damage} damage`;});
}
for(const b of document.querySelectorAll("button[data-action]"))b.addEventListener("click",()=>{
 if(!canHuman())return;const action=b.dataset.action;
 if(action==="attack"){showAttacks();return;}
 if(action==="trainer"){
  const c=state.players[state.turn].hand[state.selection];if(!c)return;
  if(c.name==="Quick Ball"||c.name==="Ultra Ball"){showBallSearch();return;}
  if(c.name==="Nest Ball"){showNestBallSearch();return;}
  if(["Gladion","Clay","Cynthia & Caitlin"].includes(c.name)){showSupporterPrinting(c);return;}
  if(c.name==="Peonia"){showPeonia(c);return;}
  if(c.name==="Professor's Letter"){showProfessorsLetter(c);return;}
  if(["Energy Retrieval","Fire Crystal"].includes(c.name)){showEnergyRecovery(c);return;}
  if(c.name==="Field Blower"){showFieldBlower(c);return;}
  if(["Pal Pad","VS Seeker"].includes(c.name)){showSupporterRecovery(c);return;}
  if(c.name==="Lusamine"){showLusamine(c);return;}
  if(["Max Potion","Devolution Spray"].includes(c.name)){showTargetTrainer(c);return;}
  if(["Acro Bike","Special Charge","Super Rod","Tag Call","Counter Catcher","Lana's Fishing Rod"].includes(c.name)){showRemainingTrainer(c);return;}
  if(["Pokégear 3.0","Battle Compressor","Trainers' Mail"].includes(c.name)){showPrintedSearch(c);return;}
  if(choiceTrainers.includes(c.name)){showFireTrainerChoices(c);return;}
  if(c.name==="Potion"||c.name==="Air Balloon"){setError("Tap or drag onto an appropriate own Pokémon to use this Trainer.");return;}
 }
 act(action);
});
modal.addEventListener("click",e=>{if(e.target===modal||e.target.closest(".close-modal"))closeModal();});
modal.addEventListener("keydown",e=>{
 if(e.key==="Escape"){e.preventDefault();closeModal();return;}
 if(e.key!=="Tab")return;
 const focusable=[...modal.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]')].filter(el=>!el.hidden);
 if(!focusable.length)return;const first=focusable[0],last=focusable[focusable.length-1];
 if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
$("#ai-toggle").addEventListener("click",()=>{if(preview||screen!=="game")return;aiEnabled=!aiEnabled;acknowledged=null;render();queueAI();});
$("#ai-export").addEventListener("click",()=>{
 const blob=new Blob([planner.export()],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download="pokemon-ai-plans.json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
function startMatch(decks){
 if(!closeModal())return;matchDecks=decks?structuredClone(decks):null;acknowledged=null;
 if(act("reset",{},{source:"system",decks:matchDecks}))showGame();
}
function confirmNewMatch(){
 const token=openModal("new-match",{},"<h2>Start a new match?</h2><p>This ends the current match and deals the current decks again. Use Deck Builder to edit decks first.</p>");
 actionButton("Confirm new match",()=>{if(validToken(token))startMatch(matchDecks);});actionButton("Keep current match",closeModal);
}
const deckBuilder=mountDeckBuilder({start:startMatch,inspect:card=>showPreview(card),onClose:started=>started?showGame():showMenu()});
function showMenu(){
 if(!closeModal())return;screen="menu";acknowledged=null;$("main").hidden=true;$("#deck-builder").hidden=true;$("#main-menu").hidden=false;
 $("#menu-play strong").textContent=state.winner!==null?"View finished match":"Resume / open match";render();$("#menu-play").focus();window.scrollTo(0,0);
}
function showGame(){if(!closeModal())return;screen="game";$("#main-menu").hidden=true;$("#deck-builder").hidden=true;$("main").hidden=false;render();queueAI();$("#open-menu").focus();window.scrollTo(0,0);}
function openBuilder(){if(!closeModal())return;screen="builder";acknowledged=null;$("#main-menu").hidden=true;$("main").hidden=true;deckBuilder.open();render();window.scrollTo(0,0);}
$("#menu-play").addEventListener("click",showGame);
$("#new-match").addEventListener("click",confirmNewMatch);
$("#menu-decks").addEventListener("click",openBuilder);
$("#open-decks").addEventListener("click",openBuilder);
$("#open-menu").addEventListener("click",showMenu);
document.addEventListener("visibilitychange",()=>{if(document.hidden){closeModal();acknowledged=null;dragging=null;}render();if(!document.hidden)queueAI();});
$("#menu-message").textContent="Your match stays in memory while you visit the menu. Save decks to keep them after reloading.";
 $("#menu-play").disabled=false;$("#menu-decks").disabled=false;
showMenu();

updateCoach({state,action:"init"});

// Debug menu. "Me" is Player 1 when the AI plays Player 2, otherwise whoever's turn it is; the opponent is the other player.
const debugMe=()=>aiEnabled?0:state.turn;
const debugScenarios=[["prizesToOne","Set my Prizes to 1"],["emptyOpponentDeck","Empty opponent's deck"],["knockOutOpponentActive","Knock out opponent's Active"],["clearOpponentBench","Clear opponent's Bench"],["skipTurn","Skip to opponent's turn"],["resetTurnFlags","Reset my once-per-turn actions"]];
function openDebug(){if(!closeModal())return;openModal("debug",{view:"menu",message:""});renderDebug();}
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
 content.innerHTML=`<h2>Debug · acting as Player ${me+1}</h2><p class="permission-note">Privileged testing tools: these can reveal hidden cards and change the game without a legal card effect. Not normal play, not permission to inspect, and not a Judge ruling.</p>${note}
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
 const oldTurn=state.turn;state=r.state;revision++;dragging=null;if(oldTurn!==state.turn)acknowledged=null;preview.actor=state.turn;preview.revision=revision;error.textContent="";preview.message=r.message;render();renderDebug();queueAI();
}
$("#modal").addEventListener("click",e=>{const b=e.target.closest("[data-debug]");if(!b||preview?.type!=="debug")return;const name=b.dataset.debug;if(["menu","deck","hand","plan"].includes(name)){preview.view=name;preview.message="";renderDebug();}else runDebug(name);});
$("#open-debug").addEventListener("click",openDebug);