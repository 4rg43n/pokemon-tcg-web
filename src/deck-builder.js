import {catalog,defaultDeck,validateDeck} from "./decks.js?v=17";
const storageKey="pokemon-tcg-decks-v1";
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function mountDeckBuilder({start,inspect,onClose}){
 const root=document.querySelector("#deck-builder");
 let decks=[defaultDeck(0),defaultDeck(1)],player=0,query="",category="all",message="",confirmStart=false;
 try{const saved=JSON.parse(localStorage.getItem(storageKey));if(Array.isArray(saved)&&saved.length===2&&saved.every(d=>typeof d?.name==="string"&&!validateDeck(d).errors.length))decks=saved;}catch{message="Saved decks could not be loaded. Starter decks are available.";}
 function render(){
 const deck=decks[player],check=validateDeck(deck);
 const visible=catalog.filter(c=>(category==="all"||c.category===category)&&`${c.name} ${c.detail}`.toLowerCase().includes(query.toLowerCase()));
 const totals=Object.fromEntries(["pokemon","trainer","energy"].map(type=>[type,catalog.filter(c=>c.category===type).reduce((sum,c)=>sum+(deck.counts[c.id]||0),0)]));
 const bothReady=decks.every(d=>!validateDeck(d).errors.length);
 root.innerHTML=`<div class="builder-shell"><div class="builder-heading"><div><p class="builder-eyebrow">YOUR CARDS. YOUR STRATEGY.</p><h2>Build your deck</h2></div><button type="button" data-builder="close">Back to menu</button></div>
 <p class="builder-note">Educational prototype · Only cards supported by this game are available. Card data and effects are incomplete; this editor does not certify official format legality. Copy-limit warnings are allowed for prototype play.</p>
 <div class="builder-players" role="group" aria-label="Choose player">${decks.map((d,i)=>`<button type="button" data-player="${i}" aria-pressed="${player===i}">Player ${i+1} · ${esc(d.name)}</button>`).join("")}</div>
 <div class="builder-layout"><div class="builder-library"><h3>Card library</h3><div class="builder-filters"><label>Search cards<input id="deck-search" type="search" value="${esc(query)}" placeholder="Name, type, or evolution…"></label><label>Card type<select id="deck-category">${[["all","All cards"],["pokemon","Pokémon"],["trainer","Trainers"],["energy","Energy"]].map(([id,label])=>`<option value="${id}" ${category===id?"selected":""}>${label}</option>`).join("")}</select></label></div>
 <div class="catalog-list">${visible.map(c=>`<article class="catalog-card"><div><button class="card-detail" type="button" data-inspect="${esc(c.id)}">${esc(c.name)}</button><p>${esc(c.detail)}</p></div><div class="quantity"><button type="button" data-change="-1" data-id="${esc(c.id)}" aria-label="Remove ${esc(c.name)}" ${!deck.counts[c.id]?"disabled":""}>−</button><span aria-label="Copies">${deck.counts[c.id]||0}</span><button type="button" data-change="1" data-id="${esc(c.id)}" aria-label="Add ${esc(c.name)}" ${check.total>=60?"disabled":""}>+</button></div></article>`).join("")||'<p>No matching cards.</p>'}</div></div>
 <aside class="deck-summary"><label>Deck name<input id="deck-name" maxlength="50" value="${esc(deck.name)}"></label><div class="deck-total ${check.errors.length?"incomplete":"complete"}">${check.total}<small> / 60 cards</small></div><p>${totals.pokemon} Pokémon · ${totals.trainer} Trainers · ${totals.energy} Energy</p><h3>Current deck</h3><div class="deck-contents">${catalog.filter(c=>deck.counts[c.id]).map(c=>`<div><span>${deck.counts[c.id]} × ${esc(c.name)}</span><button type="button" data-change="-1" data-id="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">−</button></div>`).join("")||'<p>Your deck is empty. Add cards from the library.</p>'}</div>
 <div class="deck-validation">${check.errors.map(x=>`<p class="deck-problem">${esc(x)}</p>`).join("")}${!check.errors.length?'<p class="deck-valid">Ready for prototype play.</p>':""}${check.warnings.map(x=>`<p class="deck-warning">${esc(x)}</p>`).join("")}</div>
 <div class="deck-tools"><button type="button" data-builder="starter">Load starter</button><button type="button" data-builder="clear">Clear deck</button></div><p class="builder-note">Edits are kept while this page is open. Save both decks to keep them on this browser. Starting a new game ends the current match.</p><button type="button" data-builder="save" ${bothReady?"":"disabled"}>Save both decks</button><button type="button" data-builder="start" ${bothReady?"":"disabled"}>Start new game with these decks</button>
 ${confirmStart?'<div class="deck-confirm"><p>End the current match and deal these decks?</p><button type="button" data-builder="confirm">Start new match</button><button type="button" data-builder="cancel">Keep editing</button></div>':""}<p id="deck-message" role="status">${esc(message)}</p></aside></div></div>`;
 }
 function close(started=false){root.hidden=true;if(onClose){onClose(started);return;}document.querySelector("main").hidden=false;document.querySelector("#open-decks").focus();}
 root.addEventListener("input",e=>{
 if(e.target.id==="deck-name"){decks[player].name=e.target.value;confirmStart=false;return;}
 if(e.target.id==="deck-search"){query=e.target.value;const pos=e.target.selectionStart;render();const input=root.querySelector("#deck-search");input.focus();input.setSelectionRange(pos,pos);}
 });
 root.addEventListener("change",e=>{if(e.target.id==="deck-category"){category=e.target.value;render();}});
 root.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.inspect){const entry=catalog.find(c=>c.id===b.dataset.inspect);if(entry)inspect(entry.card);return;}
 if(b.dataset.player!==undefined){player=Number(b.dataset.player);message="";confirmStart=false;render();return;}
 if(b.dataset.change){const id=b.dataset.id;if(!catalog.some(c=>c.id===id))return;const change=Number(b.dataset.change);if(change>0&&validateDeck(decks[player]).total>=60)return;decks[player].counts[id]=Math.max(0,(decks[player].counts[id]||0)+change);message="";confirmStart=false;render();const same=[...root.querySelectorAll("[data-change]")].find(el=>el.dataset.id===id&&el.dataset.change===b.dataset.change&&!el.disabled);same?.focus();return;}
 const action=b.dataset.builder;
 if(action==="close"){close();return;}
 if(action==="clear")decks[player]={name:decks[player].name,counts:{}};
 if(action==="starter")decks[player]=defaultDeck(player);
 if(action==="save"){
 if(decks.some(d=>validateDeck(d).errors.length))return;
 decks.forEach((d,i)=>d.name=d.name.trim()||`Player ${i+1} deck`);
 try{localStorage.setItem(storageKey,JSON.stringify(decks));message="Both decks saved on this browser.";}catch{message="Saving is unavailable in this browser. You can still play with these decks.";}
 }
 if(action==="start")confirmStart=true;
 if(action==="cancel")confirmStart=false;
 if(action==="confirm"){if(decks.some(d=>validateDeck(d).errors.length))return;start(structuredClone(decks));close(true);confirmStart=false;return;}
 if(action==="clear"||action==="starter"){confirmStart=false;message="";}
 render();
 });
 return {open(){document.querySelector("main").hidden=true;root.hidden=false;confirmStart=false;render();root.querySelector('[data-builder="close"]').focus();}};
}
