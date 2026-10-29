import {catalog,registerExternalCard,defaultDeck,validateDeck,migrateDeck} from "./decks.js?v=66";
import {importLimitlessDeck} from "./limitless-resolver.js?v=66";
import {searchCardDatabase,getCardDetail} from "./external-cards.js?v=66";
const storageKey="pokemon-tcg-decks-v1";
const externalKey="pokemon-tcg-external-cards-v1";
const starterVersionKey="pokemon-tcg-starter-version";
const starterVersion="56";
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function mountDeckBuilder({start,inspect,onClose}){
 const root=document.querySelector("#deck-builder");
 const awaitCardCache=new Map();
 let importText="",importing=false;
 let decks=[defaultDeck(0),defaultDeck(1)],player=0,query="",category="all",message="",confirmStart=false;
 let searchTimer=null,searchSeq=0;
 let externalCards=[],externalPage=1,externalTotal=0,externalMore=false,externalError="",externalLoading=false,externalQuery="",externalCategory="all";
 try{const cards=JSON.parse(localStorage.getItem(externalKey)||"[]");if(Array.isArray(cards))cards.slice(0,5000).forEach(registerExternalCard);}catch{}
 try{const raw=JSON.parse(localStorage.getItem(storageKey));const saved=Array.isArray(raw)?raw.map(migrateDeck):raw;if(Array.isArray(saved)&&saved.length===2&&saved.every(d=>typeof d?.name==="string")){decks=saved;if(localStorage.getItem(starterVersionKey)!==starterVersion&&decks.some(d=>/^(Lightning starter|Fire starter|Lightning Learner|Fire Learner|Lightning Collection|Fire Collection)/i.test(d.name))){decks=decks.map((d,i)=>/^(Lightning starter|Fire starter|Lightning Learner|Fire Learner|Lightning Collection|Fire Collection)/i.test(d.name)?defaultDeck(i):d);localStorage.setItem(storageKey,JSON.stringify(decks));message="Starter decks updated; custom decks were preserved.";}}}catch{message="Saved decks could not be loaded. Starter decks are available.";}try{localStorage.setItem(starterVersionKey,starterVersion);}catch{}
 function render(){
 const deck=decks[player],check=validateDeck(deck);
 const visible=catalog.filter(c=>(category==="all"||c.category===category||(category==="item"&&c.card.subtype==="Item")||(category==="supporter"&&c.card.subtype==="Supporter")||(category==="tool"&&c.card.subtype==="Pokémon Tool")||(category==="stadium"&&c.card.subtype==="Stadium"))&&`${c.name} ${c.detail}`.toLowerCase().includes(query.toLowerCase()));
 const totals=Object.fromEntries(["pokemon","trainer","energy"].map(type=>[type,catalog.filter(c=>c.category===type).reduce((sum,c)=>sum+(deck.counts[c.id]||0),0)]));
 const bothReady=decks.every(d=>!validateDeck(d).errors.length);
 const playable=bothReady;
 root.innerHTML=`<div class="builder-shell"><div class="builder-heading"><div><p class="builder-eyebrow">YOUR CARDS. YOUR STRATEGY.</p><h2>Build your deck</h2></div><button type="button" data-builder="close">Back to menu</button></div>
 <p class="builder-note">Educational prototype · Search the complete online card database below and import Limitless decklists. Imported cards can be played with simplified prototype effects; official gameplay effects are not yet automated; format legality is not certified.</p>
 <div class="builder-players" role="group" aria-label="Choose player">${decks.map((d,i)=>`<button type="button" data-player="${i}" aria-pressed="${player===i}">Player ${i+1} · ${esc(d.name)}</button>`).join("")}</div>
 <div class="builder-layout"><div class="builder-library"><h3>Cards added to your library · ${catalog.length}</h3><p class="builder-note">Includes Ponyta, Rapidash, Morpeko, Air Balloon, Quick Ball, and Ultra Ball. At 60 cards, remove a card before adding another.</p><div class="builder-filters"><label>Search added cards<input id="deck-search" type="search" value="${esc(query)}" placeholder="Name, type, or evolution…"></label><label>Card type<select id="deck-category">${[["all","All cards"],["pokemon","Pokémon"],["trainer","All Trainers"],["item","Items"],["supporter","Supporters"],["tool","Pokémon Tools"],["stadium","Stadiums"],["energy","Energy"]].map(([id,label])=>`<option value="${id}" ${category===id?"selected":""}>${label}</option>`).join("")}</select></label></div>
 <section class="external-library"><h3>Search all Pokémon TCG printings</h3><p class="builder-note">Search English card printings by name; use set and collector number to identify the exact printing. Every available printing can be added to and saved in decks. Imported cards use simplified prototype attacks or no-effect Trainer actions until their official effects are implemented.</p><div class="builder-filters"><label>Search full database (live results)<input id="external-search" type="search" value="${esc(externalQuery)}" placeholder="Enter a card name, e.g. Pikachu"></label><label>Category<select id="external-category">${[["all","All cards"],["pokemon","Pokémon"],["trainer","Trainers"],["item","Items"],["supporter","Supporters"],["tool","Tools"],["stadium","Stadiums"],["energy","Energy"]].map(([id,label])=>`<option value="${id}" ${externalCategory===id?"selected":""}>${label}</option>`).join("")}</select></label></div><button type="button" data-builder="external-search" ${externalLoading?"disabled":""}>Search database</button><p role="status">${externalLoading?"Loading…":esc(externalError|| (externalCards.length?`Showing ${externalCards.length} printings on page ${externalPage}.`:"Type a card name or press Search database to browse all printings."))}</p><div class="catalog-list">${externalCards.map(c=>`<article class="catalog-card"><div><strong>${esc(c.name||"Unknown card")}</strong><p>${esc(c.set?.name||c.setName||c.set||"")} · ${esc(c.number||"")} · ${esc(c.supertype||c.type||"")} ${esc((c.subtypes||[]).join(", "))}</p>${c.imageUrl?`<img src="${esc(c.imageUrl)}" alt="${esc(c.name)}" loading="lazy" width="110">`:""}</div><button type="button" data-external-add="${esc(c.id)}">Add to deck</button></article>`).join("")}</div>${externalMore?'<button type="button" data-builder="external-next">Next page</button>':""}</section><h3>Playable prototype catalog</h3><div class="catalog-list">${visible.map(c=>`<article class="catalog-card"><div><button class="card-detail" type="button" data-inspect="${esc(c.id)}">${esc(c.name)}</button><p>${esc(c.detail)}</p></div><div class="quantity"><button type="button" data-change="-1" data-id="${esc(c.id)}" aria-label="Remove ${esc(c.name)}" ${!deck.counts[c.id]?"disabled":""}>−</button><span aria-label="Copies">${deck.counts[c.id]||0}</span><button type="button" data-change="1" data-id="${esc(c.id)}" aria-label="Add ${esc(c.name)}" ${check.total>=60||(!(c.category==="energy"&&(c.unlimited||!c.external))&&catalog.filter(x=>x.name===c.name).reduce((n,x)=>n+(deck.counts[x.id]||0),0)>=4)?"disabled":""}>+</button></div></article>`).join("")||'<p>No matching cards.</p>'}</div></div>
 <aside class="deck-summary"><label>Deck name<input id="deck-name" maxlength="50" value="${esc(deck.name)}"></label><div class="deck-total ${check.errors.length?"incomplete":"complete"}">${check.total}<small> / 60 cards</small></div><p>${totals.pokemon} Pokémon · ${totals.trainer} Trainers · ${totals.energy} Energy</p><h3>Current deck</h3><div class="deck-contents">${catalog.filter(c=>deck.counts[c.id]).map(c=>`<div><span>${deck.counts[c.id]} × ${esc(c.name)}</span><button type="button" data-change="-1" data-id="${esc(c.id)}" aria-label="Remove ${esc(c.name)}">−</button></div>`).join("")||'<p>Your deck is empty. Add cards from the library.</p>'}</div>
 <div class="deck-validation">${check.errors.map(x=>`<p class="deck-problem">${esc(x)}</p>`).join("")}${!check.errors.length?'<p class="deck-valid">Deck contains 60 cards.</p>':""}${check.warnings.map(x=>`<p class="deck-warning">${esc(x)}</p>`).join("")}</div>
 <div class="deck-tools"><label>Paste Limitless / PTCGL deck export<textarea id="limitless-text" rows="5" placeholder="1 Charmander MEW 4">${esc(importText)}</textarea></label><button type="button" data-builder="import">Validate and import deck</button><button type="button" data-builder="starter">Load starter</button><button type="button" data-builder="clear">Clear deck</button></div><p class="builder-note">Edits are kept while this page is open. Save both decks to keep them on this browser. Starting a new game ends the current match.</p><button type="button" data-builder="save" ${bothReady?"":"disabled"}>Save both decks</button><button type="button" data-builder="start" ${playable?"":"disabled"}>Start new game with these decks</button>
 ${confirmStart?'<div class="deck-confirm"><p>End the current match and deal these decks?</p><button type="button" data-builder="confirm">Start new match</button><button type="button" data-builder="cancel">Keep editing</button></div>':""}<p id="deck-message" role="status">${esc(message)}</p></aside></div></div>`;
 }
 function close(started=false){root.hidden=true;if(onClose){onClose(started);return;}document.querySelector("main").hidden=false;document.querySelector("#open-decks").focus();}
 function addExternal(raw){const entry=registerExternalCard(raw);if(!entry)return;const deck=decks[player];const same=catalog.filter(c=>c.name===entry.name).reduce((n,c)=>n+(deck.counts[c.id]||0),0);if(validateDeck(deck).total>=60||(same>=4&&!entry.unlimited)){message="Deck is full or the four-copy limit has been reached.";render();return;}deck.counts[entry.id]=(deck.counts[entry.id]||0)+1;try{const saved=JSON.parse(localStorage.getItem(externalKey)||"[]");if(!saved.some(c=>c.id===raw.id)){saved.push(raw);localStorage.setItem(externalKey,JSON.stringify(saved));}}catch{message="Could not persist this card; browser storage may be full.";}render();return;}
 function runSearch(next=false){
  if(!next)externalPage=1;else externalPage++;
  const seq=++searchSeq;externalLoading=true;externalError="";render();
  searchCardDatabase({query:externalQuery,category:externalCategory,page:externalPage}).then(result=>{
   if(seq!==searchSeq)return;
   externalCards=result.cards;externalTotal=result.total;externalMore=result.hasMore;
  }).catch(error=>{
   if(seq!==searchSeq)return;
   externalCards=[];externalMore=false;externalError=error.message;
  }).finally(()=>{if(seq===searchSeq){externalLoading=false;render();}});
 }
 root.addEventListener("input",e=>{
 if(e.target.id==="limitless-text"){importText=e.target.value;return;}
 if(e.target.id==="external-search"){externalQuery=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>runSearch(false),350);return;}
 if(e.target.id==="deck-name"){decks[player].name=e.target.value;confirmStart=false;return;}
 if(e.target.id==="deck-search"){query=e.target.value;const pos=e.target.selectionStart;render();const input=root.querySelector("#deck-search");input.focus();input.setSelectionRange(pos,pos);}
 });
 root.addEventListener("change",e=>{if(e.target.id==="deck-category"){category=e.target.value;render();}if(e.target.id==="external-category"){externalCategory=e.target.value;runSearch(false);}});
 root.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.externalAdd){const preview=externalCards.find(c=>String(c.id)===b.dataset.externalAdd);if(!preview)return;let raw;try{raw=awaitCardCache.get(preview.id)||null;}catch{}if(!raw){message="Loading card details…";render();getCardDetail(preview.id).then(detail=>{awaitCardCache.set(preview.id,detail);addExternal(detail);}).catch(error=>{message=error.message;render();});return;}addExternal(raw);return;}

 if(b.dataset.inspect){const entry=catalog.find(c=>c.id===b.dataset.inspect);if(entry&&!entry.external)inspect(entry.card);return;}
 if(b.dataset.player!==undefined){player=Number(b.dataset.player);message="";confirmStart=false;render();return;}
 if(b.dataset.change){const id=b.dataset.id;if(!catalog.some(c=>c.id===id))return;const change=Number(b.dataset.change);if(change>0&&(validateDeck(decks[player]).total>=60||(!(catalog.find(c=>c.id===id)?.category==="energy"&&(catalog.find(c=>c.id===id)?.unlimited||!catalog.find(c=>c.id===id)?.external))&&catalog.filter(c=>c.name===catalog.find(x=>x.id===id)?.name).reduce((n,c)=>n+(decks[player].counts[c.id]||0),0)>=4)))return;decks[player].counts[id]=Math.max(0,(decks[player].counts[id]||0)+change);message="";confirmStart=false;render();const same=[...root.querySelectorAll("[data-change]")].find(el=>el.dataset.id===id&&el.dataset.change===b.dataset.change&&!el.disabled);same?.focus();return;}
 const action=b.dataset.builder;
 if(action==="close"){close();return;}
 if(action==="external-search"||action==="external-next"){runSearch(action==="external-next");return;}
 if(action==="import"){if(importing)return;importing=true;const text=importText;const target=player;message="Resolving Limitless printings…";render();importLimitlessDeck(text,{onProgress:(n,total)=>{const status=root.querySelector("#deck-message");if(status)status.textContent=`Resolving ${n}/${total} cards…`;}}).then(result=>{if(!result.ok){message=result.errors.join(" | ");return;}const counts={};for(const {row,card} of result.cards){const entry=registerExternalCard(card);counts[entry.id]=(counts[entry.id]||0)+row.quantity;}const candidate={name:decks[target].name,counts};const check=validateDeck(candidate);if(check.errors.length){message=check.errors.join(" | ");return;}decks[target]=candidate;try{const saved=JSON.parse(localStorage.getItem(externalKey)||"[]");for(const {card} of result.cards)if(!saved.some(c=>c.id===card.id))saved.push(card);localStorage.setItem(externalKey,JSON.stringify(saved));}catch{message="Imported, but card metadata could not be cached in this browser.";return;}message="Limitless deck imported; save your decks to keep it.";}).catch(error=>{message="Import failed: "+error.message;}).finally(()=>{importing=false;confirmStart=false;render();});return;}
 if(action==="clear")decks[player]={name:decks[player].name,counts:{}};
 if(action==="starter"){decks[player]=defaultDeck(player);message="Loaded the latest "+(player===0?"Lightning":"Fire")+" starter list."; }
 if(action==="save"){
 if(decks.some(d=>validateDeck(d).errors.length))return;
 decks.forEach((d,i)=>d.name=d.name.trim()||`Player ${i+1} deck`);
 try{localStorage.setItem(storageKey,JSON.stringify(decks));message="Both decks saved on this browser.";}catch{message="Saving is unavailable in this browser. You can still play with these decks.";}
 }
 if(action==="start"){if(!playable){message="Cannot start: "+decks.map((d,i)=>validateDeck(d).errors.map(e=>"Player "+(i+1)+": "+e).join(" | ")).filter(Boolean).join(" | ");confirmStart=false;}else{confirmStart=true;message="Confirm below to start the match.";}render();root.querySelector(".deck-confirm")?.scrollIntoView({block:"center",behavior:"smooth"});return;}
 if(action==="cancel")confirmStart=false;
 if(action==="confirm"){message="Starting match…";if(!playable){message="Both players need valid 60-card decks before starting.";render();return;}try{start(structuredClone(decks));confirmStart=false;close(true);}catch(error){message="Could not start match: "+(error?.message||String(error));confirmStart=false;render();}return;}
 if(action==="clear"){confirmStart=false;message="";}if(action==="starter")confirmStart=false;
 render();
 });
 return {open(){document.querySelector("main").hidden=true;root.hidden=false;confirmStart=false;render();root.querySelector('[data-builder="close"]').focus();}};
}
