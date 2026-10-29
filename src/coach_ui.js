// Battle Bird coach widget: bird avatar + speech bubble, fed by coach.js after every game action.
import {buildContext,advise,summarizeTurn,lastTurnOf,review} from "./coach.js?v=54";
import {nextMove} from "./coach_moves.js?v=54";

const STORAGE_KEY="coach";
const DEFAULT_SETTINGS={muted:false,minimized:false,seenOnce:[]};

const escape=value=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

function loadSettings(){
try{return {...DEFAULT_SETTINGS,...JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}")};}
catch(problem){return {...DEFAULT_SETTINGS};}
}
function saveSettings(){
try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...settings,seenOnce:[...seenOnce]}));}
catch(problem){console.warn("coach settings not saved",problem);}
}

let settings=loadSettings();
let seenOnce=new Set(settings.seenOnce);
let dismissed=new Set();
let tracker={turns:[]};
let tips=[],tipIndex=0,shownId=null,reviewData=null,move=null,playerLabel="";
let root=null,birdButton=null,bubble=null;

function mount(){
root=document.createElement("aside");
root.id="coach";
root.setAttribute("aria-live","polite");
root.innerHTML=`<div class="coach-bubble"></div><button type="button" class="coach-bird" data-coach="toggle" aria-label="Battle Bird coach"><span class="coach-bird-glyph"></span><span class="coach-dot"></span></button><button type="button" class="coach-unmute" data-coach="unmute">Coach</button>`;
document.body.append(root);
birdButton=root.querySelector(".coach-bird");
bubble=root.querySelector(".coach-bubble");
root.addEventListener("click",onClick);
birdButton.addEventListener("animationend",event=>{if(event.animationName==="coach-flap")birdButton.classList.remove("flap");});
}

function onClick(event){
const control=event.target.closest("[data-coach]");
if(!control)return;
const command=control.dataset.coach;
if(command==="next"&&tips.length){tipIndex=(tipIndex+1)%tips.length;}
else if(command==="gotit"&&tips[tipIndex]){dismissed.add(tips[tipIndex].id);tips=tips.filter(tip=>!dismissed.has(tip.id));tipIndex=0;}
else if(command==="toggle"){settings.minimized=!settings.minimized;saveSettings();}
else if(command==="mute"){settings.muted=true;saveSettings();}
else if(command==="unmute"){settings.muted=false;settings.minimized=false;saveSettings();}
render();
}

const headHtml=(kind,label)=>`<div class="coach-head"><span class="coach-kind">${kind}</span><span class="coach-player">${escape(label)}</span><button type="button" data-coach="toggle" aria-label="Minimize coach">—</button><button type="button" data-coach="mute" aria-label="Mute coach">✕</button></div>`;

function tipHtml(tip){
return `<div class="coach-tip"><span class="coach-kind ${tip.kind}">${tip.kind==="rule"?"Rule":"Pro tip"}</span> <strong>${escape(tip.title)}</strong><p class="coach-text">${escape(tip.text)}</p>
<a class="coach-source" href="${escape(tip.source.url)}" target="_blank" rel="noopener">Source: ${escape(tip.source.name)} ↗</a>
<div class="coach-actions"><button type="button" data-coach="next" ${tips.length>1?"":"disabled"}>Next</button><button type="button" data-coach="gotit">Got it</button><span class="coach-count">${tipIndex+1}/${tips.length}</span></div></div>`;
}

function reviewHtml(){
const sections=reviewData.map(section=>{
const body=section.findings.length?`<ul>${section.findings.map(finding=>`<li>${escape(finding.text)} <a href="${escape(finding.source.url)}" target="_blank" rel="noopener">${escape(finding.source.name)} ↗</a></li>`).join("")}</ul>`:`<p class="coach-text">${escape(section.clean)}</p>`;
return `<h4>${escape(section.playerLabel)} · ${section.turns} turn${section.turns===1?"":"s"}</h4>${body}`;
}).join("");
return `${headHtml("Review","Game over")}<div class="coach-review"><h3>How did that go?</h3>${sections}</div>`;
}

// Light up the hand cards that can be played, the recommended one, and the button to press.
function highlightBoard(){
for(const element of document.querySelectorAll(".coach-playable,.coach-focus,.coach-cta"))element.classList.remove("coach-playable","coach-focus","coach-cta");
if(!move||settings.muted)return;
for(const index of move.playable)document.querySelector(`[data-hand="${index}"]`)?.classList.add("coach-playable");
if(move.focus!==null)document.querySelector(`[data-hand="${move.focus}"]`)?.classList.add("coach-focus");
if(move.button)document.querySelector(`button[data-action="${move.button}"]`)?.classList.add("coach-cta");
}

function render(){
if(!root)mount();
root.dataset.state=settings.muted?"muted":settings.minimized?"min":"open";
birdButton.dataset.hasTips=String(tips.length>0||!!reviewData);
const current=reviewData?null:tips[tipIndex]||null;
const currentId=reviewData?"review":current?current.id:move?move.text:null;
if(currentId&&currentId!==shownId&&!settings.minimized&&!settings.muted)birdButton.classList.add("flap");
shownId=currentId;
if(current&&current.once&&!seenOnce.has(current.id)){seenOnce.add(current.id);saveSettings();}
highlightBoard();
if(settings.muted||settings.minimized)return;
if(reviewData){bubble.innerHTML=reviewHtml();return;}
bubble.innerHTML=`${headHtml("Coach",playerLabel)}<h3 class="coach-title">Do this now</h3><p class="coach-text coach-move">${escape(move?move.text:"Waiting for the game to start.")}</p>${current?tipHtml(current):""}`;
}

export function update({prev=null,state,action="",error=""}){
try{
if(action==="reset"){tracker={turns:[]};dismissed=new Set();reviewData=null;}
let ended=null;
if(prev&&!error&&(action==="end"||action==="attack")){
const summary=summarizeTurn(prev,action,state);
tracker={turns:[...tracker.turns,summary]};
if(summary.missedAttach||summary.missedAttack)ended=summary;
}
const justAttached=!!prev&&!error&&action==="play"&&prev.turn===state.turn&&!prev.players[prev.turn].attached&&state.players[state.turn].attached;
const lastTurn=lastTurnOf(tracker,state.turn);
const ctx=buildContext(state,{error,ended,justAttached,lastTurnRetreated:!!lastTurn&&lastTurn.retreated});
playerLabel=ctx.playerLabel;
move=nextMove(state);
if(state.winner!==null){reviewData=review(tracker);tips=[];}
else{reviewData=null;tips=advise(ctx,seenOnce,dismissed,shownId);tipIndex=0;}
render();
}catch(problem){console.error("coach update failed",problem);}
}
