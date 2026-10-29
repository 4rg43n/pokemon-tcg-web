// Lightweight two-player prototype; intentionally not a complete official TCG rules engine.
import {species,canPay,retreatCost} from "./cards.js?v=53";
export const pokemon=(i)=>({...species[i],speciesIndex:i,damage:0,energy:0,energies:[],evolvedThisTurn:false,playedTurn:0,under:[],tool:null});
import {defaultDeck, expandDeck, validateDeck, energyCard as energy, pokemonCard as basic} from "./decks.js?v=59";
function shuffle(cards){for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
function player(i,deck){
 const cards=shuffle(expandDeck(deck||defaultDeck(i)));
 let hand=[],mulligans=0;
 const basicCard=c=>c.kind==="pokemon"&&species[c.species]&&!species[c.species].stage;
 if(!cards.some(basicCard))throw new Error("This deck has no playable Basic Pokémon. Check the imported card stages.");
 do{if(hand.length)cards.push(...hand);shuffle(cards);hand=cards.splice(0,7);mulligans++;}while(!hand.some(basicCard)&&mulligans<100);
 if(!hand.some(basicCard)){cards.push(...hand);hand=[];shuffle(cards);const basicIndex=cards.findIndex(basicCard);hand.push(cards.splice(basicIndex,1)[0]);hand.push(...cards.splice(0,6));}
 const prizes=cards.splice(0,6);
 return {hand,deck:cards,prizeCards:prizes,discard:[],active:null,bench:[],prizes:prizes.length,attached:false,retreated:false,supporterUsed:false,mulligans:mulligans-1};
}
export function newGame(decks){
 if(decks&&(!Array.isArray(decks)||decks.length!==2||decks.some(d=>validateDeck(d).errors.length)))throw new Error("Choose two complete 60-card decks containing a Basic Pokémon.");
 const players=[player(0,decks?.[0]),player(1,decks?.[1])];return {players,turn:0,round:1,phase:"setup",winner:null,winReason:null,log:["Each player: choose an Active Pokémon and optionally Bench Basics, then press Ready.","Shuffled 60-card decks and set six Prize cards per player."],selection:null};}
const err=(state,error)=>({state,error});
export function dispatch(state,action,payload={}){
if(action==="reset")return {state:newGame()};
if(state.winner!==null)return err(state,"Game is over.");
const s=structuredClone(state),p=s.players[s.turn],o=s.players[1-s.turn];
let message="";
if(action==="deselect"){s.selection=null;return {state:s};}
if(action==="select"){
const idx=payload.index;
if(!Number.isInteger(idx)||idx<0||idx>=p.hand.length)return err(state,"Select a card in your hand.");
s.selection=s.selection===idx?null:idx;
return {state:s};
}
if(action==="ready"){
 if(s.phase!=="setup")return err(state,"Setup is already complete.");
 if(!p.active)return err(state,"Choose your Active Pokémon before pressing Ready.");
 s.selection=null;
 if(s.turn===0){s.turn=1;message="Player 1 ready. Player 2: choose your Active Pokémon and Bench.";}else{s.turn=0;s.phase="playing";message="Both players ready. Player 1 begins!";}
 s.log.unshift(message);return {state:s};
}
if(s.phase==="replacement"){
 if(action!=="promote")return err(state,"Choose a Benched Pokémon to promote.");
 const slot=payload.slot;if(!Number.isInteger(slot)||slot<0||slot>=p.bench.length)return err(state,"Tap one of your Benched Pokémon.");
 p.active=p.bench.splice(slot,1)[0];s.phase="playing";s.selection=null;s.round++;p.attached=false;p.retreated=false;p.supporterUsed=false;if(p.deck.length)p.hand.push(p.deck.shift());else{s.winner=1-s.turn;s.winReason="deck out";s.log.unshift("Deck out!");}s.log.unshift("Player "+(s.turn+1)+" promoted "+p.active.name+".");return {state:s};
}
if(s.phase==="retreat"&&action!=="switch")return err(state,"Tap one of your Benched Pokémon to complete retreat.");
if(s.phase==="setup"&&action!=="play")return err(state,"Finish opening setup first.");
if(action==="ability"){
 if(s.phase!=="playing")return err(state,"Abilities can only be used during play.");
 const target=payload.target==="active"?p.active:payload.target==="bench"&&Number.isInteger(payload.slot)?p.bench[payload.slot]:null;
 if(!target?.ability)return err(state,"Choose a Pokémon with an Ability.");
 if(target.abilityUsed)return err(state,"This Pokémon already used its Ability this turn.");
 if(!p.deck.length)return err(state,"No cards left to draw.");
 if(target.ability.name==="Snack Seek"){
  if(typeof payload.discard!=="boolean")return err(state,"Choose whether to keep or discard the top card.");
  if(payload.discard)p.discard.push(p.deck.shift());
  target.abilityUsed=true;s.selection=null;s.log.unshift(target.name+" used Snack Seek and "+(payload.discard?"discarded the top card.":"kept the top card."));return {state:s};
 }
 p.hand.push(p.deck.shift());target.abilityUsed=true;s.selection=null;s.log.unshift(target.name+" used "+target.ability.name+" and drew a card.");return {state:s};
}
if(action==="trainer"||(action==="play"&&p.hand[s.selection]?.kind==="trainer")){
 if(s.phase!=="playing")return err(state,"Trainer cards cannot be played during setup.");
 const idx=s.selection,card=p.hand[idx];if(!card||card.kind!=="trainer")return err(state,"Select a Trainer card first.");
 if(card.subtype==="Supporter"&&p.supporterUsed)return err(state,"Only one Supporter per turn.");
 if(card.name==="Air Balloon"){
 const target=payload.target==="active"?p.active:payload.target==="bench"&&Number.isInteger(payload.slot)?p.bench[payload.slot]:null;
 if(!target)return err(state,"Choose your Active or a Benched Pokémon to attach Air Balloon.");
 if(target.tool)return err(state,"That Pokémon already has a Pokémon Tool attached.");
 target.tool=card;p.hand.splice(idx,1);s.selection=null;s.log.unshift("Player "+(s.turn+1)+": attached Air Balloon to "+target.name+". Retreat now costs "+retreatCost(target)+" Energy.");return {state:s};
 }
 else if(card.name==="Potion"){const target=payload.target==="active"?p.active:payload.target==="bench"?p.bench[payload.slot]:null;if(!target)return err(state,"Choose a Pokémon to heal.");if(!target.damage)return err(state,"That Pokémon has no damage.");target.damage=Math.max(0,target.damage-30);message="Potion healed "+target.name+".";}
 else if(card.name==="Nest Ball"){
  if(p.bench.length>=5)return err(state,"Your Bench is full.");
  const choice=payload.searchIndex;
  if(choice!==null&&(!Number.isInteger(choice)||p.deck[choice]?.kind!=="pokemon"||species[p.deck[choice].species]?.stage))return err(state,"Choose a Basic Pokémon from your deck.");
  const found=choice===null?null:p.deck.splice(choice,1)[0];
  if(found){const added=pokemon(found.species);added.playedTurn=s.round;p.bench.push(added);}
  p.hand.splice(idx,1);p.discard.push(card);shuffle(p.deck);s.selection=null;
  s.log.unshift("Player "+(state.turn+1)+": used Nest Ball, "+(found?"put "+species[found.species].name+" directly onto the Bench":"found no Basic Pokémon")+", then shuffled the deck.");
  return {state:s};
 }
 else if(card.name==="Quick Ball"||card.name==="Ultra Ball"){
 const required=card.name==="Quick Ball"?1:2,discard=payload.discardIndices;
 if(!Array.isArray(discard)||discard.length!==required||new Set(discard).size!==required||discard.some(i=>!Number.isInteger(i)||i===idx||!p.hand[i]))return err(state,"Choose "+required+" other card(s) to discard.");
 const choice=payload.searchIndex;
 if(choice!==null&&(!Number.isInteger(choice)||p.deck[choice]?.kind!=="pokemon"||(card.name==="Quick Ball"&&species[p.deck[choice].species].stage)))return err(state,"Choose a valid Pokémon or finish without finding one.");
 const found=choice===null?null:p.deck.splice(choice,1)[0];
 for(const i of [...discard,idx].sort((a,b)=>b-a))p.discard.push(p.hand.splice(i,1)[0]);
 if(found)p.hand.push(found);shuffle(p.deck);s.selection=null;
 s.log.unshift("Player "+(s.turn+1)+": used "+card.name+", discarded "+required+" other card(s), "+(found?"revealed "+species[found.species].name+" and added it to hand":"found no Pokémon")+", then shuffled.");return {state:s};
 }
 else if(card.name==="Nemona"){
  p.hand.splice(idx,1);p.discard.push(card);
  const drawn=Math.min(3,p.deck.length);
  for(let n=0;n<drawn;n++)p.hand.push(p.deck.shift());
  p.supporterUsed=true;s.selection=null;
  s.log.unshift("Player "+(state.turn+1)+": Nemona drew "+drawn+" cards.");
  return {state:s};
 }
 else if(card.name==="Lillie's Determination"){
 const returned=p.hand.filter((_,i)=>i!==idx);
 p.deck.push(...returned);shuffle(p.deck);
 p.hand=[];const amount=p.prizes===6?8:6;
 for(let n=0;n<amount&&p.deck.length;n++)p.hand.push(p.deck.shift());
 p.supporterUsed=true;p.discard.push(card);s.selection=null;
 s.log.unshift("Player "+(state.turn+1)+": Lillie's Determination shuffled "+returned.length+" hand cards into the deck, shuffled, then drew "+p.hand.length+" cards"+(amount===8?" (six Prize cards remaining).":"."));
 return {state:s};
 }
 else if(card.name==="Professor's Research"){p.discard.push(...p.hand.filter((_,i)=>i!==idx));p.hand=[];for(let n=0;n<7&&p.deck.length;n++)p.hand.push(p.deck.shift());p.supporterUsed=true;message="Professor's Research drew "+p.hand.length+" cards.";p.discard.push(card);s.selection=null;s.log.unshift("Player "+(state.turn+1)+": "+message);return {state:s};}
 else if(card.name==="Trainers' Mail"){
  const top=p.deck.slice(0,4);
  const choice=payload.searchIndex;
  if(choice!==null&&choice!==undefined&&(!Number.isInteger(choice)||choice<0||choice>=top.length||top[choice].kind!=="trainer"))return err(state,"Choose a Trainer from the top four cards.");
  const found=choice===null||choice===undefined?null:p.deck.splice(choice,1)[0];
  if(found)p.hand.push(found);
  const remaining=p.deck.splice(0,Math.min(4-(found?1:0),p.deck.length));
  p.deck.push(...remaining);
  message="Trainers' Mail revealed "+top.length+" cards"+(found?", added "+found.name+" to hand":"; no Trainer selected")+" and put the others on the bottom of the deck.";
 }
 else if(["Buddy-Buddy Poffin","Evolution Incense","Level Ball","Poké Pad","Trainers' Mail","Earthen Vessel","Arven","Gloria","Hisuian Heavy Ball"].includes(card.name)){
  const options=card.name==="Hisuian Heavy Ball"?p.prizeCards:p.deck;
  const allowed=c=>card.name==="Buddy-Buddy Poffin"?c.kind==="pokemon"&&!species[c.species]?.stage&&species[c.species]?.hp<=70:
    card.name==="Evolution Incense"?c.kind==="pokemon"&&!!species[c.species]?.stage:
    card.name==="Level Ball"?c.kind==="pokemon"&&species[c.species]?.hp<=90:
    card.name==="Arven"?c.kind==="trainer"&&(c.subtype==="Item"||c.subtype==="Pokémon Tool"):
    card.name==="Trainers' Mail"?c.kind==="trainer":
    card.name==="Earthen Vessel"?c.kind==="energy":
    card.name==="Gloria"?c.kind==="pokemon"&&!species[c.species]?.stage:
    card.name==="Hisuian Heavy Ball"?c.kind==="pokemon"&&!species[c.species]?.stage:
    c.kind==="pokemon"||c.kind==="trainer";
  const limit=card.name==="Buddy-Buddy Poffin"||card.name==="Earthen Vessel"||card.name==="Arven"||card.name==="Gloria"?2:1;
  const choices=payload.searchIndices;
  if(!Array.isArray(choices)||choices.length>limit||new Set(choices).size!==choices.length||choices.some(i=>!Number.isInteger(i)||!options[i]||!allowed(options[i])))return err(state,"Select up to "+limit+" eligible card(s) from "+(card.name==="Hisuian Heavy Ball"?"Prize cards":"your deck")+".");
  if(card.name==="Gloria"&&p.bench.length+choices.length>5)return err(state,"Not enough Bench space.");
  const found=choices.slice().sort((a,b)=>b-a).map(i=>options.splice(i,1)[0]);
  if(card.name==="Hisuian Heavy Ball"){for(const c of found){p.hand.push(c);p.prizeCards.push({kind:"trainer",name:card.name,subtype:"Item"});}shuffle(p.prizeCards);p.prizes=p.prizeCards.length;}
  else if(card.name==="Gloria"){for(const c of found){const mon=pokemon(c.species);mon.playedTurn=s.round;p.bench.push(mon);}shuffle(p.deck);}
  else{p.hand.push(...found);shuffle(p.deck);}
  message=card.name+" searched for "+found.length+" card(s) and shuffled.";
 }
 else if(card.name==="Night Stretcher"||card.name==="Rescue Stretcher"||card.name==="Lana's Aid"){
  const eligible=p.discard.map((c,i)=>({c,i})).filter(({c})=>c.kind==="pokemon"||c.kind==="energy");
  const limit=card.name==="Lana's Aid"?3:1;
  const chosen=Array.isArray(payload.discardIndices)?payload.discardIndices:[];
  if(chosen.length>limit||new Set(chosen).size!==chosen.length||chosen.some(i=>!eligible.some(x=>x.i===i)))return err(state,"Choose up to "+limit+" Pokémon or Basic Energy cards from discard.");
  for(const i of chosen.slice().sort((a,b)=>b-a))p.hand.push(p.discard.splice(i,1)[0]);
  message=card.name+" recovered "+chosen.length+" card(s).";
 }
 else if(card.name==="Welder"){
  const target=payload.target==="bench"?p.bench[payload.slot]:p.active;
  if(!target)return err(state,"Choose a Pokémon for Welder.");
  const chosen=Array.isArray(payload.discardIndices)?payload.discardIndices:[];
  if(chosen.length>2||new Set(chosen).size!==chosen.length||chosen.some(i=>i===idx||p.hand[i]?.kind!=="energy"||p.hand[i]?.type!=="Fire"))return err(state,"Choose up to two Fire Energy cards from hand.");
  for(const i of chosen.slice().sort((a,b)=>b-a)){p.hand.splice(i,1);target.energies.push("Fire");}
  target.energy=target.energies.length;let drawn=0;for(let n=0;n<3&&p.deck.length;n++){p.hand.push(p.deck.shift());drawn++;}
  message="Welder attached "+chosen.length+" Fire Energy and drew "+drawn+" cards.";
 }
 else if(card.name==="Bird Keeper"){
  if(!p.bench.length)return err(state,"Bird Keeper needs a Benched Pokémon.");
  const slot=payload.slot;if(!Number.isInteger(slot)||!p.bench[slot])return err(state,"Choose a Benched Pokémon to switch in.");
  const old=p.active;p.active=p.bench[slot];p.bench[slot]=old;
  let drawn=0;for(let n=0;n<3&&p.deck.length;n++){p.hand.push(p.deck.shift());drawn++;}
  message="Bird Keeper switched Active Pokémon and drew "+drawn+" cards.";
 }
 else if(card.name==="Magma Basin"){
  if(s.stadium)p.discard.push(s.stadium);s.stadium=card;p.hand.splice(idx,1);s.selection=null;
  s.log.unshift("Player "+(s.turn+1)+": played Magma Basin Stadium.");return {state:s};
 }
 else if(card.name==="Float Stone"||card.name==="Muscle Band"||card.name==="Vitality Band"){
  const target=payload.target==="bench"?p.bench[payload.slot]:p.active;
  if(!target)return err(state,"Choose a Pokémon for the Tool.");
  if(target.tool)return err(state,"That Pokémon already has a Tool.");
  target.tool=card;p.hand.splice(idx,1);s.selection=null;
  s.log.unshift("Player "+(s.turn+1)+": attached "+card.name+" to "+target.name+".");return {state:s};
 }
 else if(card.name==="PokéStop"||card.name==="Silent Lab"){
  if(s.stadium)s.players[s.stadiumOwner??s.turn].discard.push(s.stadium);
  s.stadium=card;s.stadiumOwner=s.turn;
  p.hand.splice(idx,1);s.selection=null;
  s.log.unshift("Player "+(s.turn+1)+": played "+card.name+" Stadium.");return {state:s};
 }
 else if(card.name==="Energy Retrieval"||card.name==="Fire Crystal"){
  const max=card.name==="Fire Crystal"?3:2;
  const eligible=p.discard.map((c,i)=>({c,i})).filter(({c})=>c.kind==="energy"&&(card.name!=="Fire Crystal"||c.type==="Fire")).slice(0,max);
  for(const {i} of eligible.slice().reverse())p.hand.push(p.discard.splice(i,1)[0]);
  message=card.name+" returned "+eligible.length+" Basic Energy card(s) from discard to hand.";
 }
 else if(card.name==="Professor's Letter"){
  let found=0;
  for(let i=p.deck.length-1;i>=0&&found<2;i--)if(p.deck[i].kind==="energy"){p.hand.push(p.deck.splice(i,1)[0]);found++;}
  shuffle(p.deck);message="Professor's Letter searched for "+found+" Basic Energy card(s), then shuffled the deck.";
 }
 else if(card.name==="Pal Pad"){
  const cards=p.discard.map((c,i)=>({c,i})).filter(({c})=>c.kind==="trainer"&&c.subtype==="Supporter").slice(0,2);
  for(const {i} of cards.slice().reverse())p.deck.push(p.discard.splice(i,1)[0]);
  shuffle(p.deck);message="Pal Pad shuffled "+cards.length+" Supporter card(s) from discard into the deck.";
 }
 else if(card.name==="VS Seeker"){
  const index=p.discard.findIndex(c=>c.kind==="trainer"&&c.subtype==="Supporter");
  if(index<0)return err(state,"VS Seeker requires a Supporter in the discard pile.");
  const recovered=p.discard.splice(index,1)[0];p.hand.push(recovered);
  message="VS Seeker returned "+recovered.name+" from discard to hand.";
 }
 else if(card.name==="Red Card"||card.name==="Reset Stamp"){
  const amount=card.name==="Red Card"?4:p.prizes;
  o.deck.push(...o.hand);o.hand=[];shuffle(o.deck);
  for(let n=0;n<amount&&o.deck.length;n++)o.hand.push(o.deck.shift());
  message=card.name+" shuffled the opponent's hand into their deck and drew "+o.hand.length+" cards.";
 }
 else if(card.name==="Field Blower"){
  const targets=[p.active,...p.bench,o.active,...o.bench].filter(Boolean);
  const tools=targets.filter(mon=>mon.tool).slice(0,2);
  for(const mon of tools){(targets.includes(mon)&&[p.active,...p.bench].includes(mon)?p:o).discard.push(mon.tool);mon.tool=null;}
  if(tools.length<2&&s.stadium){s.players[s.stadiumOwner??s.turn].discard.push(s.stadium);s.stadium=null;}
  message="Field Blower discarded "+tools.length+" Tool(s)"+(!s.stadium?" and cleared the Stadium if present.":".");
 }
 else if(card.name==="Blacksmith"){
  const target=payload.target==="bench"?p.bench[payload.slot]:p.active;
  if(!target)return err(state,"Choose a Pokémon.");
  let count=0;
  for(let i=p.discard.length-1;i>=0&&count<2;i--)if(p.discard[i].kind==="energy"&&p.discard[i].type==="Fire"){p.discard.splice(i,1);target.energies.push("Fire");count++;}
  target.energy=target.energies.length;message="Blacksmith attached "+count+" Fire Energy from discard.";
 }
 else if(card.name==="Raihan"){
  const target=payload.target==="bench"?p.bench[payload.slot]:p.active;
  if(!target)return err(state,"Choose a Pokémon.");
  const index=p.discard.findIndex(c=>c.kind==="energy");
  if(index<0)return err(state,"Raihan requires a Basic Energy in the discard pile.");
  const c=p.discard.splice(index,1)[0];target.energies.push(c.type);target.energy=target.energies.length;
  const chosen=payload.searchIndices?.[0];
  if(Number.isInteger(chosen)&&p.deck[chosen])p.hand.push(p.deck.splice(chosen,1)[0]);
  shuffle(p.deck);message="Raihan attached an Energy and searched the deck.";
 }
 else if(card.name==="Guzma"){
  if(!o.bench.length||!p.bench.length)return err(state,"Guzma requires Benched Pokémon on both sides.");
  const theirs=payload.opponentSlot,ours=payload.slot;
  if(!Number.isInteger(theirs)||!o.bench[theirs]||!Number.isInteger(ours)||!p.bench[ours])return err(state,"Choose a Benched Pokémon on each side.");
  [o.active,o.bench[theirs]]=[o.bench[theirs],o.active];
  [p.active,p.bench[ours]]=[p.bench[ours],p.active];
  message="Guzma switched both players' Active Pokémon.";
 }
 else if(card.name==="Escape Rope"){
  if(!p.bench.length||!o.bench.length)return err(state,"Both players need a Benched Pokémon.");
  const theirs=payload.opponentSlot,ours=payload.slot;
  if(!Number.isInteger(theirs)||!o.bench[theirs]||!Number.isInteger(ours)||!p.bench[ours])return err(state,"Choose a Benched Pokémon on each side.");
  [o.active,o.bench[theirs]]=[o.bench[theirs],o.active];
  [p.active,p.bench[ours]]=[p.bench[ours],p.active];
  message="Escape Rope switched both Active Pokémon.";
 }
 else if(card.name==="Scoop Up Net"){
  const target=payload.target==="bench"?p.bench[payload.slot]:p.active;
  if(!target)return err(state,"Choose a Pokémon to pick up.");
  if(target===p.active&&!p.bench.length)return err(state,"You need a Benched Pokémon before picking up your Active.");
  if(target===p.active){p.active=p.bench.shift();}else p.bench.splice(payload.slot,1);
  p.hand.push(basic(target.speciesIndex));for(const under of target.under)p.hand.push(basic(under));
  for(const type of target.energies)p.hand.push(energy(type));if(target.tool)p.hand.push(target.tool);
  message="Scoop Up Net returned a Pokémon and attached cards to hand.";
 }
 else if(card.name==="Rare Candy"){
  const target=payload.target==="bench"?p.bench[payload.slot]:p.active;
  const evolution=p.hand[payload.evolutionIndex];
  if(!target||!evolution||evolution.kind!=="pokemon"||species[evolution.species]?.stage!==2||!target.name||!!species[target.speciesIndex]?.stage||!species.some(x=>x.name===species[evolution.species]?.evolvesFrom&&x.evolvesFrom===target.name)||target.playedTurn===s.round||target.evolvedThisTurn)return err(state,"Select a Basic Pokémon and a compatible Stage 2 Rare Candy evolution.");
  const evolved=pokemon(evolution.species);evolved.energies=target.energies;evolved.energy=target.energy;evolved.damage=target.damage;evolved.tool=target.tool;evolved.under=[...target.under,target.speciesIndex];evolved.playedTurn=target.playedTurn;evolved.evolvedThisTurn=true;
  if(payload.target==="bench")p.bench[payload.slot]=evolved;else p.active=evolved;
  p.hand.splice(payload.evolutionIndex,1);message="Rare Candy evolved "+target.name+" into "+evolved.name+".";
 }
 else if(card.external){return err(state,card.name+" is not implemented yet. This card will remain in your hand until its effect is supported.");}
 else return err(state,"Unsupported Trainer.");
 p.hand.splice(idx,1);p.discard.push(card);if(card.subtype==="Supporter")p.supporterUsed=true;s.selection=null;s.log.unshift("Player "+(state.turn+1)+": "+message);return {state:s};
}
if(action==="play"){
const idx=s.selection,card=p.hand[idx];
if(!card)return err(state,"Select a card from your hand first.");
if(card.kind==="trainer")return err(state,"Tap Play Trainer to use this card.");
if(card.kind==="pokemon"){
const def=species[card.species];
if(def.stage){if(s.phase==="setup")return err(state,"Evolution cards cannot be played during setup.");const target=payload.target==="active"?p.active:payload.target==="bench"?p.bench[payload.slot]:null;if(!target||target.name!==def.evolvesFrom)return err(state,def.name+" must evolve from "+def.evolvesFrom+".");if(target.playedTurn===s.round||target.evolvedThisTurn)return err(state,"Cannot evolve a Pokémon played or evolved this turn.");const evolved=pokemon(card.species);evolved.tool=target.tool||null;evolved.damage=target.damage;evolved.energies=target.energies;evolved.energy=evolved.energies.length;evolved.under=[...target.under,target.speciesIndex];evolved.playedTurn=target.playedTurn;evolved.evolvedThisTurn=true;if(payload.target==="active")p.active=evolved;else p.bench[payload.slot]=evolved;message="Evolved "+target.name+" into "+def.name+".";}
else if(payload.target==="active"&&s.phase==="setup"&&!p.active){p.active=pokemon(card.species);p.active.playedTurn=s.round;message="Chose "+p.active.name+" as Active Pokémon.";}
else if(payload.target==="bench"){if(!p.active)return err(state,"Choose your Active Pokémon first.");if(p.bench.length>=5)return err(state,"Your Bench is full.");const added=pokemon(card.species);added.playedTurn=s.round;p.bench.push(added);message="Benched "+species[card.species].name+".";}
else return err(state,s.phase==="setup"?"Tap the empty Active slot or an empty Bench slot.":"Basic Pokémon must be played to the Bench.");
}else if(card.kind==="energy"){
if(s.phase!=="playing")return err(state,"Energy cannot be attached during setup. Choose your Active and Bench Pokémon, then press Ready.");
if(p.attached)return err(state,"You can attach only one Energy per turn.");
const target=payload.target==="active"?p.active:payload.target==="bench"&&Number.isInteger(payload.slot)?p.bench[payload.slot]:null;
if(!target)return err(state,"Tap your Active Pokémon or a Benched Pokémon to attach Energy.");
if(card.type==="Speed Lightning"&&target.type!=="Lightning")return err(state,"Speed Lightning Energy can only be attached to a Lightning Pokémon.");
target.energies.push(card.type==="Speed Lightning"?"Lightning":card.type==="Capture"||card.type==="Recycle"?"Colorless":card.type);
target.energy=target.energies.length;p.attached=true;
if(card.type==="Speed Lightning"){let drawn=0;for(let n=0;n<2&&p.deck.length;n++){p.hand.push(p.deck.shift());drawn++;}message="Attached Speed Lightning Energy to "+target.name+" and drew "+drawn+" cards.";}
else if(card.type==="Capture"){const choice=payload.searchIndex;if(Number.isInteger(choice)&&p.deck[choice]?.kind==="pokemon"&&!species[p.deck[choice].species]?.stage&&p.bench.length<5){const found=p.deck.splice(choice,1)[0];const added=pokemon(found.species);added.playedTurn=s.round;p.bench.push(added);}shuffle(p.deck);message="Attached Capture Energy to "+target.name+" and searched for a Basic Pokémon.";}
else message="Attached "+card.type+" Energy to "+target.name+".";
}else return err(state,"Unsupported card.");
p.hand.splice(idx,1);s.selection=null;
}else if(action==="retreat"){
 if(p.retreated)return err(state,"You can retreat only once per turn.");
 if(!p.bench.length)return err(state,"You need a Benched Pokémon to retreat.");
 if(p.active.energy<retreatCost(p.active))return err(state,"Retreat requires "+retreatCost(p.active)+" attached Energy.");
 s.phase="retreat";s.selection=null;s.log.unshift("Player "+(s.turn+1)+": choose a Benched Pokémon to switch in.");return {state:s};
}else if(action==="switch"){
 if(s.phase!=="retreat")return err(state,"You are not retreating.");
 const slot=payload.slot;if(!Number.isInteger(slot)||slot<0||slot>=p.bench.length)return err(state,"Choose a Benched Pokémon.");
 const outgoing=p.active;for(let n=0;n<retreatCost(outgoing);n++)p.discard.push(energy(outgoing.energies.shift()));outgoing.energy=outgoing.energies.length;p.active=p.bench.splice(slot,1)[0];p.bench.push(outgoing);p.retreated=true;s.phase="playing";s.selection=null;message="Retreated "+outgoing.name+" and promoted "+p.active.name+".";
}else if(action==="attack"){
if(s.phase!=="playing")return err(state,"Finish the current Pokémon switch first.");
if(s.turn===0&&s.round===1)return err(state,"Player 1 cannot attack on the first turn.");
const move=p.active.attacks[payload.index??0];if(!move)return err(state,"Choose a valid attack.");if(!canPay(p.active.energies,move.cost))return err(state,move.name+" requires "+move.cost.join(" + ")+" Energy (attached: "+(p.active.energies.join(", ")||"none")+").");
if(move.effect==="pickAndStick"){
 const choices=payload.attachments??[];
 if(!Array.isArray(choices)||choices.length>2)return err(state,"Choose up to two Basic Energy cards.");
 const indices=new Set();
 for(const choice of choices){
  const card=p.discard[choice?.index],target=choice?.target==="active"?p.active:choice?.target==="bench"&&Number.isInteger(choice.slot)?p.bench[choice.slot]:null;
  if(!Number.isInteger(choice?.index)||indices.has(choice.index)||card?.kind!=="energy"||!target)return err(state,"Choose distinct Basic Energy cards and your Pokémon.");
  indices.add(choice.index);
 }
 for(const choice of choices){const target=choice.target==="active"?p.active:p.bench[choice.slot];target.energies.push(p.discard[choice.index].type);target.energy=target.energies.length;}
 for(const index of [...indices].sort((a,b)=>b-a))p.discard.splice(index,1);
 message=p.active.name+" used Pick and Stick and attached "+choices.length+" Basic Energy.";
}
else if(move.effect==="draw"){const drawn=p.deck.shift();if(drawn)p.hand.push(drawn);message=p.active.name+" used "+move.name+(drawn?" and drew a card.":"; no cards left to draw.");}
else if(move.effect==="regielekiSonar"){
 const eligible=p.discard.map((card,i)=>({card,i})).filter(x=>x.card.kind==="trainer");
 if(eligible.length){const chosen=eligible[0];p.hand.push(p.discard.splice(chosen.i,1)[0]);message=p.active.name+" used Electromagnetic Sonar and recovered "+chosen.card.name+" from the discard pile (automatic selection).";}
 else message=p.active.name+" used Electromagnetic Sonar, but no Trainer was in the discard pile.";
}
else if(move.effect==="regielekiTargetedBolt"){
 const lightning=p.active.energies.filter(x=>x==="Lightning").length;
 if(lightning<2)return err(state,"Targeted Bolt requires discarding 2 Lightning Energy.");
 if(!o.bench.length)return err(state,"Targeted Bolt requires an opposing Benched Pokémon.");
 let discarded=0;p.active.energies=p.active.energies.filter(x=>{if(x==="Lightning"&&discarded<2){discarded++;p.discard.push(energy("Lightning"));return false;}return true;});p.active.energy=p.active.energies.length;
 const targetIndex=Number.isInteger(payload.targetBench)?payload.targetBench:0;
 const target=o.bench[targetIndex];if(!target)return err(state,"Invalid opposing Bench target.");
 target.damage+=120;message=p.active.name+" used Targeted Bolt on opposing Benched "+target.name+" for 120 damage.";
 if(target.damage>=target.hp){o.discard.push({kind:"pokemon",species:target.speciesIndex});for(const under of target.under)o.discard.push(basic(under));for(const type of target.energies)o.discard.push(energy(type));if(target.tool)o.discard.push(target.tool);o.bench.splice(targetIndex,1);if(p.prizeCards.length)p.hand.push(p.prizeCards.pop());p.prizes=p.prizeCards.length;message+=" Knockout! Took a Prize.";if(!p.prizes){s.winner=s.turn;s.winReason="taking all Prize cards";}}
}
else if(move.effect==="stoke"){let attached=0;for(let n=p.deck.length-1;n>=0&&attached<2;n--){if(p.deck[n].kind==="energy"&&p.deck[n].type==="Fire"){p.deck.splice(n,1);p.active.energies.push("Fire");attached++;}}p.active.energy=p.active.energies.length;shuffle(p.deck);message=p.active.name+" used Stoke and attached "+attached+" Fire Energy.";}
else{let damage=move.damage;if(move.effect==="braveWing"&&p.active.damage>0)damage+=100;if(move.effect==="coinBonus20"&&Math.random()<0.5)damage+=20;if(move.effect==="discardToolsBonus40"){const targets=[p.active,...p.bench];const removed=targets.filter(t=>t.tool);for(const t of removed){p.discard.push(t.tool);t.tool=null;}damage+=removed.length*40;}if(move.effect==="discardStadium"){message=p.active.name+" used "+move.name+" (no Stadium in play).";}else{o.active.damage+=damage;message=p.active.name+" used "+move.name+" for "+damage+" damage.";}if(move.effect==="discardEnergy"||move.effect==="discardThreeEnergy"){const count=move.effect==="discardThreeEnergy"?3:1;for(let n=0;n<count&&p.active.energies.length;n++){const type=p.active.energies.pop();p.discard.push(energy(type));}p.active.energy=p.active.energies.length;message+=" Discarded "+count+" Energy.";}}
if(o.active.damage>=o.active.hp)message+=knockOut(s);
if(s.winner===null&&s.phase!=="replacement")next(s);
}else if(action==="end"){if(s.phase!=="playing")return err(state,"Finish the Pokémon switch first.");next(s);message="Turn ended.";}
else if(action==="bench"){
const idx=p.hand.findIndex(c=>c.kind==="pokemon");if(idx<0)return err(state,"No Basic Pokémon in hand.");
if(p.bench.length>=5)return err(state,"Bench full.");
p.bench.push(pokemon(p.hand[idx].species));p.hand.splice(idx,1);message="Benched a Basic Pokémon.";
}else if(action==="energy"){
if(s.phase!=="playing")return err(state,"Energy cannot be attached during setup.");
const idx=p.hand.findIndex(c=>c.kind==="energy");if(idx<0)return err(state,"No Energy in hand.");
if(p.attached)return err(state,"Already attached Energy this turn.");
const card=p.hand.splice(idx,1)[0];p.active.energies.push(card.type);p.active.energy=p.active.energies.length;p.attached=true;message="Attached Energy to Active Pokémon.";
}else return err(state,"Unknown action.");
s.log.unshift("Player "+(state.turn+1)+": "+message);return {state:s};
}
// Knocks out the opponent's Active for the current player: Prizes, discards, then a win or the opponent's replacement.
export function knockOut(s){const p=s.players[s.turn],o=s.players[1-s.turn];let message="";
const prizeCount=o.active.name.endsWith(" ex")?2:1;for(let n=0;n<prizeCount&&p.prizeCards.length;n++)p.hand.push(p.prizeCards.pop());p.prizes=p.prizeCards.length;o.discard.push({kind:"pokemon",species:o.active.speciesIndex});for(const index of o.active.under)o.discard.push(basic(index));for(const type of o.active.energies)o.discard.push(energy(type));if(o.active.tool)o.discard.push(o.active.tool);message+=" Knockout! "+prizeCount+" Prize card(s) taken.";
if(p.prizes===0||o.bench.length===0){s.winner=s.turn;s.winReason=p.prizes===0?"taking all Prize cards":"knocking out every opposing Pokémon";message+=" Game over!";}
else{o.active=null;s.turn=1-s.turn;s.phase="replacement";s.selection=null;}
return message;}
export function next(s){s.turn=1-s.turn;s.round++;s.selection=null;s.players[s.turn].attached=false;s.players[s.turn].retreated=false;s.players[s.turn].supporterUsed=false;for(const mon of [s.players[s.turn].active,...s.players[s.turn].bench])if(mon){mon.evolvedThisTurn=false;mon.abilityUsed=false;}
if(s.players[s.turn].deck.length)s.players[s.turn].hand.push(s.players[s.turn].deck.shift());
else{s.winner=1-s.turn;s.winReason="deck out";s.log.unshift("Deck out!");}}
export function cardInfo(card){if(card.kind==="pokemon")return {...species[card.species],kind:"pokemon"};return card;}
