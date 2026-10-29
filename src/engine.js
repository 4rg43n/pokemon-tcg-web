// Lightweight two-player prototype; intentionally not a complete official TCG rules engine.
import {species,canPay,retreatCost} from "./cards.js?v=66";
export const pokemon=(i)=>({...species[i],speciesIndex:i,damage:0,energy:0,energies:[],evolvedThisTurn:false,playedTurn:0,under:[],tool:null});
import {defaultDeck, expandDeck, validateDeck, energyCard as energy, pokemonCard as basic} from "./decks.js?v=66";
function shuffle(cards){for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
function player(i,deck){
 const cards=shuffle(expandDeck(deck||defaultDeck(i)));
 let hand=[],mulligans=0;
 const basicCard=c=>c.kind==="pokemon"&&species[c.species]&&!species[c.species].stage;
 if(!cards.some(basicCard))throw new Error("This deck has no playable Basic Pokémon. Check the imported card stages.");
 do{if(hand.length)cards.push(...hand);shuffle(cards);hand=cards.splice(0,7);mulligans++;}while(!hand.some(basicCard)&&mulligans<100);
 if(!hand.some(basicCard)){cards.push(...hand);hand=[];shuffle(cards);const basicIndex=cards.findIndex(basicCard);hand.push(cards.splice(basicIndex,1)[0]);hand.push(...cards.splice(0,6));}
 const prizes=cards.splice(0,6);
 return {hand,deck:cards,prizeCards:prizes,discard:[],lostZone:[],active:null,bench:[],prizes:prizes.length,attached:false,retreated:false,supporterUsed:false,stadiumPlayed:false,mulligans:mulligans-1};
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
// This records a manual permission declaration, not an automated legality ruling.
if(action==="inspectZone"){
 if(!Number.isInteger(payload.player)||payload.player<0||payload.player>1||!["hand","deck","discard","lostZone","prizeCards"].includes(payload.zone))return err(state,"Choose a player and card zone.");
 if(typeof payload.reason!=="string"||!payload.reason.trim())return err(state,"Name the card or ruling that authorizes this inspection.");
 s.log.unshift("Player "+(s.turn+1)+" declared inspection of Player "+(payload.player+1)+"'s "+payload.zone+": "+payload.reason.trim());
 return {state:s};
}
if(action==="adjustDamage"){
 if(s.phase!=="playing")return err(state,"Finish setup or the required promotion/switch first.");
 if(!Number.isInteger(payload.player)||payload.player<0||payload.player>1)return err(state,"Choose the Pokémon's owner.");
 const owner=s.players[payload.player],mon=payload.target==="active"?owner.active:payload.target==="bench"&&Number.isInteger(payload.slot)?owner.bench[payload.slot]:null;
 if(!mon)return err(state,"Choose a Pokémon in play.");
 if(!Number.isSafeInteger(payload.counters)||!payload.counters)return err(state,"Choose a nonzero number of damage counters.");
 if(typeof payload.reason!=="string"||!payload.reason.trim())return err(state,"Name the effect or correction for the counters.");
 const damage=mon.damage+payload.counters*10;
 if(!Number.isSafeInteger(damage)||damage<0)return err(state,"Damage counters cannot become negative or exceed a safe total.");
 mon.damage=damage;s.selection=null;
 s.log.unshift("Player "+(s.turn+1)+": "+(payload.counters>0?"placed ":"removed ")+Math.abs(payload.counters)+" damage counter(s) on Player "+(payload.player+1)+"'s "+mon.name+" (manual effect, not attack damage): "+payload.reason.trim());
 if(mon.damage>=mon.hp){
  if(payload.target==="active")owner.active=null;else owner.bench.splice(payload.slot,1);
  const prizes=discardKnockOut(s,payload.player,mon);
  s.log.unshift(mon.name+" was Knocked Out; Player "+(2-payload.player)+" took "+prizes+" Prize card(s).");
  if(s.winner===null&&payload.target==="active"){s.resumeTurn=s.turn;s.turn=payload.player;s.phase="replacement";}
 }
 return {state:s};
}
if(action==="stadium"){
 if(s.phase!=="playing")return err(state,"Stadium abilities can only be used during play.");
 if(!s.stadium)return err(state,"No Stadium in play.");
 if(s.stadium.name==="Stormy Mountains"){
  if(p.stormyUsedTurn===s.round)return err(state,"Stormy Mountains was already used this turn.");
  if(p.bench.length>=5)return err(state,"Your Bench is full.");
  const i=payload.searchIndex;
  if(i===null){p.stormyUsedTurn=s.round;shuffle(p.deck);return {state:s};}
  if(!Number.isInteger(i)||p.deck[i]?.kind!=="pokemon"||species[p.deck[i].species]?.stage||!["Lightning","Dragon"].includes(species[p.deck[i].species].type))return err(state,"Select a Basic Lightning or Dragon Pokémon.");
  const found=p.deck.splice(i,1)[0];const mon=pokemon(found.species);mon.playedTurn=s.round;p.bench.push(mon);shuffle(p.deck);p.stormyUsedTurn=s.round;
  s.log.unshift("Player "+(s.turn+1)+" used Stormy Mountains to Bench "+mon.name+".");return {state:s};
 }
 if(s.stadium.name==="Tropical Beach"){
  if(p.beachUsedTurn===s.round)return err(state,"Tropical Beach was already used this turn.");
  const amount=Math.max(0,7-p.hand.length);for(let n=0;n<amount&&p.deck.length;n++)p.hand.push(p.deck.shift());
  p.beachUsedTurn=s.round;next(s);s.log.unshift("Player "+(state.turn+1)+" used Tropical Beach to draw "+amount+" cards and end the turn.");return {state:s};
 }
 return err(state,"This Stadium has no manually activated effect.");
}
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
 if(s.turn===0){s.turn=1;message="Player 1 ready. Player 2: choose your Active Pokémon and Bench.";}else{s.turn=0;s.phase="playing";const first=s.players[0];if(first.deck.length)first.hand.push(first.deck.shift());else{s.winner=1;s.winReason="deck out";}message="Both players ready. Player 1 draws and begins!";}
 s.log.unshift(message);return {state:s};
}
if(s.phase==="replacement"){
 if(action!=="promote")return err(state,"Choose a Benched Pokémon to promote.");
 const slot=payload.slot;if(!Number.isInteger(slot)||slot<0||slot>=p.bench.length)return err(state,"Tap one of your Benched Pokémon.");
 p.active=p.bench.splice(slot,1)[0];s.phase="playing";s.selection=null;
 if(s.resumeTurn!==undefined){s.turn=s.resumeTurn;delete s.resumeTurn;}
 else{s.round++;p.attached=false;p.retreated=false;p.supporterUsed=false;p.stadiumPlayed=false;for(const mon of [p.active,...p.bench]){mon.evolvedThisTurn=false;mon.abilityUsed=false;}if(p.deck.length)p.hand.push(p.deck.shift());else{s.winner=1-s.turn;s.winReason="deck out";s.log.unshift("Deck out!");}}
 s.log.unshift("Player "+(state.turn+1)+" promoted "+p.active.name+".");return {state:s};
}
if(s.phase==="retreat"&&action!=="switch")return err(state,"Tap one of your Benched Pokémon to complete retreat.");
if(s.phase==="setup"&&action!=="play")return err(state,"Finish opening setup first.");
if(action==="ability"){
 if(s.phase!=="playing")return err(state,"Abilities can only be used during play.");
 const target=payload.target==="active"?p.active:payload.target==="bench"&&Number.isInteger(payload.slot)?p.bench[payload.slot]:null;
 if(!target?.ability)return err(state,"Choose a Pokémon with an Ability.");
 if(target.abilityUsed)return err(state,"This Pokémon already used its Ability this turn.");
 if(!p.deck.length)return err(state,"No cards left to draw.");
 if(target.ability.name==="Call Signal"){
  const indices=payload.searchIndices;
  if(!Array.isArray(indices)||indices.length>3||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||p.deck[i]?.kind!=="trainer"||p.deck[i]?.subtype!=="Supporter"))return err(state,"Choose up to three Supporter cards from your deck.");
  for(const i of [...indices].sort((a,b)=>b-a))p.hand.push(p.deck.splice(i,1)[0]);
  shuffle(p.deck);
  if(payload.target==="active")p.active=null;else p.bench.splice(payload.slot,1);
  discardKnockOut(s,s.turn,target);
  if(s.winner===null&&payload.target==="active"){s.resumeTurn=s.turn;s.phase="replacement";}
  s.selection=null;s.log.unshift("Magneton used Call Signal, found "+indices.length+" Supporter(s), then was Knocked Out. Opponent took a Prize.");return {state:s};
 }
 if(target.ability.name==="Snack Seek"){
  if(typeof payload.discard!=="boolean")return err(state,"Choose whether to keep or discard the top card.");
  if(payload.discard)p.discard.push(p.deck.shift());
  target.abilityUsed=true;s.selection=null;s.log.unshift(target.name+" used Snack Seek and "+(payload.discard?"discarded the top card.":"kept the top card."));return {state:s};
 }
 p.hand.push(p.deck.shift());target.abilityUsed=true;s.selection=null;s.log.unshift(target.name+" used "+target.ability.name+" and drew a card.");return {state:s};
}
if(action==="trainer"||(action==="play"&&p.hand[s.selection]?.kind==="trainer")){
 if(s.phase!=="playing")return err(state,"Trainer cards cannot be played during setup.");
 let idx=s.selection;const card=p.hand[idx];if(!card||card.kind!=="trainer")return err(state,"Select a Trainer card first.");
 if(card.subtype==="Supporter"&&p.supporterUsed)return err(state,"Only one Supporter per turn.");
 if(card.subtype==="Supporter"&&s.turn===0&&s.round===1)return err(state,"The first player cannot play a Supporter on their first turn.");
 const isStadium=card.subtype==="Stadium"||["Magma Basin","PokéStop","Silent Lab","Stormy Mountains","Tropical Beach"].includes(card.name);
 if(isStadium&&p.stadiumPlayed)return err(state,"Only one Stadium may be played from hand per turn.");
 if(isStadium&&s.stadium?.name===card.name)return err(state,"A Stadium with that name is already in play.");
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
 else if(["Buddy-Buddy Poffin","Evolution Incense","Level Ball","Poké Pad","Trainers' Mail","Earthen Vessel","Arven","Gloria","Hisuian Heavy Ball"].includes(card.name)){
  if((card.name==="Buddy-Buddy Poffin"||card.name==="Gloria")&&p.bench.length>=5)return err(state,"Your Bench is full.");
  const cost=payload.discardCostIndices;
  if(card.name==="Earthen Vessel"&&(!Array.isArray(cost)||cost.length!==1||!Number.isInteger(cost[0])||cost[0]===idx||!p.hand[cost[0]]))return err(state,"Choose one other hand card to discard for Earthen Vessel.");
  const options=card.name==="Hisuian Heavy Ball"?p.prizeCards:p.deck;
  const allowed=c=>card.name==="Buddy-Buddy Poffin"?c.kind==="pokemon"&&!species[c.species]?.stage&&species[c.species]?.hp<=70:
    card.name==="Evolution Incense"?c.kind==="pokemon"&&!!species[c.species]?.stage:
    card.name==="Level Ball"?c.kind==="pokemon"&&species[c.species]?.hp<=90:
    card.name==="Arven"?c.kind==="trainer"&&(c.subtype==="Item"||c.subtype==="Pokémon Tool"):
    card.name==="Trainers' Mail"?c.kind==="trainer"&&c.name!=="Trainers' Mail":
    card.name==="Earthen Vessel"?c.kind==="energy":
    card.name==="Gloria"?c.kind==="pokemon"&&!species[c.species]?.stage:
    card.name==="Hisuian Heavy Ball"?c.kind==="pokemon"&&!species[c.species]?.stage:
    c.kind==="pokemon"||c.kind==="trainer";
  const limit=card.name==="Gloria"?3:["Buddy-Buddy Poffin","Earthen Vessel","Arven"].includes(card.name)?2:1;
  const choices=payload.searchIndices;
  if(!Array.isArray(choices)||choices.length>limit||new Set(choices).size!==choices.length||choices.some(i=>!Number.isInteger(i)||!options[i]||!allowed(options[i])||(card.name==="Trainers' Mail"&&i>=4)))return err(state,"Select up to "+limit+" eligible card(s) from "+(card.name==="Hisuian Heavy Ball"?"Prize cards":"your deck")+".");
  if(card.name==="Arven"&&new Set(choices.map(i=>options[i].subtype)).size!==choices.length)return err(state,"Arven can find at most one Item and one Pokémon Tool.");
  if((card.name==="Gloria"||card.name==="Buddy-Buddy Poffin")&&p.bench.length+choices.length>5)return err(state,"Not enough Bench space.");
  const found=choices.slice().sort((a,b)=>b-a).map(i=>options.splice(i,1)[0]);
  if(card.name==="Hisuian Heavy Ball"){
   if(found.length){p.hand.splice(idx,1);p.hand.push(...found);p.prizeCards.push(card);}
   else{p.hand.splice(idx,1);p.discard.push(card);}
   shuffle(p.prizeCards);p.prizes=p.prizeCards.length;s.selection=null;
   s.log.unshift("Player "+(s.turn+1)+": used Hisuian Heavy Ball and shuffled their Prize cards.");return {state:s};
  }
  else if(card.name==="Gloria"||card.name==="Buddy-Buddy Poffin"){for(const c of found){const mon=pokemon(c.species);mon.playedTurn=s.round;p.bench.push(mon);}shuffle(p.deck);}
  else{p.hand.push(...found);shuffle(p.deck);}
  message=card.name+" searched for "+found.length+" card(s) and shuffled.";
  if(card.name==="Earthen Vessel"){
   for(const i of [idx,cost[0]].sort((a,b)=>b-a))p.discard.push(p.hand.splice(i,1)[0]);
   s.selection=null;s.log.unshift("Player "+(s.turn+1)+": "+message);return {state:s};
  }
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
  idx-=chosen.filter(i=>i<idx).length;
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
  if(s.stadium)s.players[s.stadiumOwner??s.turn].discard.push(s.stadium);
  s.stadium=card;s.stadiumOwner=s.turn;p.stadiumPlayed=true;p.hand.splice(idx,1);s.selection=null;
  s.log.unshift("Player "+(s.turn+1)+": played Magma Basin Stadium.");return {state:s};
 }
 else if(card.name==="Float Stone"||card.name==="Muscle Band"||card.name==="Vitality Band"){
  const target=payload.target==="bench"?p.bench[payload.slot]:p.active;
  if(!target)return err(state,"Choose a Pokémon for the Tool.");
  if(target.tool)return err(state,"That Pokémon already has a Tool.");
  target.tool=card;p.hand.splice(idx,1);s.selection=null;
  s.log.unshift("Player "+(s.turn+1)+": attached "+card.name+" to "+target.name+".");return {state:s};
 }
 else if(["Stormy Mountains","Tropical Beach"].includes(card.name)){
  if(s.stadium)s.players[s.stadiumOwner??s.turn].discard.push(s.stadium);
  s.stadium=card;s.stadiumOwner=s.turn;p.stadiumPlayed=true;p.hand.splice(idx,1);s.selection=null;
  s.log.unshift("Player "+(s.turn+1)+": played "+card.name+" Stadium.");return {state:s};
 }
 else if(card.name==="PokéStop"||card.name==="Silent Lab"){
  if(s.stadium)s.players[s.stadiumOwner??s.turn].discard.push(s.stadium);
  s.stadium=card;s.stadiumOwner=s.turn;p.stadiumPlayed=true;
  p.hand.splice(idx,1);s.selection=null;
  s.log.unshift("Player "+(s.turn+1)+": played "+card.name+" Stadium.");return {state:s};
 }
 else if(card.name==="Gladion"){
  const i=payload.prizeIndex;
  if(!Number.isInteger(i)||i<0||i>=p.prizeCards.length)return err(state,"Choose one of your face-down Prize cards.");
  const found=p.prizeCards.splice(i,1)[0];p.hand.push(found);
  p.prizeCards.push(card);shuffle(p.prizeCards);p.prizes=p.prizeCards.length;
  p.hand.splice(idx,1);p.supporterUsed=true;s.selection=null;
  s.log.unshift("Player "+(s.turn+1)+" used Gladion to exchange one Prize card with Gladion.");return {state:s};
 }
 else if(card.name==="Clay"){
  const top=p.deck.splice(0,7);const items=top.filter(c=>c.kind==="trainer"&&c.subtype==="Item");
  p.hand.push(...items);p.discard.push(...top.filter(c=>!items.includes(c)));
  message="Clay discarded the top "+top.length+" cards and added "+items.length+" Item cards to hand.";
 }
 else if(card.name==="Cynthia & Caitlin"){
  const i=payload.discardIndex;
  if(i!==null&&i!==undefined&&(!Number.isInteger(i)||p.discard[i]?.kind!=="trainer"||p.discard[i]?.subtype!=="Supporter"||p.discard[i]?.name==="Cynthia & Caitlin"))return err(state,"Choose another Supporter in your discard pile.");
  if(i!==null&&i!==undefined)p.hand.push(p.discard.splice(i,1)[0]);
  const cost=payload.discardCostIndex;
  if(cost!==null&&cost!==undefined){
   if(!Number.isInteger(cost)||cost===idx||!p.hand[cost])return err(state,"Discard a different card from hand to draw three.");
   p.discard.push(p.hand.splice(cost,1)[0]);if(cost<idx)idx--;
   for(let n=0;n<3&&p.deck.length;n++)p.hand.push(p.deck.shift());
  }
  message="Cynthia & Caitlin "+(i===null||i===undefined?"recovered no Supporter":"recovered a Supporter")+(cost===null||cost===undefined?".":" and drew up to three cards.");
 }
 else if(card.name==="Pokégear 3.0"){
  const top=p.deck.slice(0,7),i=payload.searchIndex;
  if(i!==null&&i!==undefined&&(!Number.isInteger(i)||i<0||i>=top.length||top[i].kind!=="trainer"||top[i].subtype!=="Supporter"))return err(state,"Choose a Supporter from the top seven cards.");
  const found=i===null||i===undefined?null:p.deck.splice(i,1)[0];if(found)p.hand.push(found);
  shuffle(p.deck);message="Pokégear 3.0 looked at the top "+top.length+" cards"+(found?" and took "+found.name:" and took no Supporter")+"; deck shuffled.";
 }
 else if(card.name==="Battle Compressor"){
  const indices=payload.searchIndices;
  if(!Array.isArray(indices)||indices.length>3||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||i>=p.deck.length))return err(state,"Choose up to three distinct cards from your deck.");
  for(const i of [...indices].sort((a,b)=>b-a))p.discard.push(p.deck.splice(i,1)[0]);
  shuffle(p.deck);message="Battle Compressor discarded "+indices.length+" selected deck cards and shuffled.";
 }
 else if(card.name==="Iono"){
  const counts=[p.prizes,o.prizes];
  for(const player of [p,o]){const hand=player.hand.splice(0);shuffle(hand);player.deck.push(...hand);}
  for(const [j,player] of [p,o].entries())for(let n=0;n<counts[j]&&player.deck.length;n++)player.hand.push(player.deck.shift());
  message="Iono shuffled each player's hand into the bottom of their deck and each player drew cards equal to their remaining Prize cards.";
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
  if(s.round<=2||!Number.isInteger(payload.evolutionIndex)||!target||!evolution||evolution.kind!=="pokemon"||species[evolution.species]?.stage!==2||!target.name||!!species[target.speciesIndex]?.stage||!species.some(x=>x.name===species[evolution.species]?.evolvesFrom&&x.evolvesFrom===target.name)||target.playedTurn===s.round||target.evolvedThisTurn)return err(state,"Select a Basic Pokémon and a compatible Stage 2 Rare Candy evolution after your first turn.");
  const evolved=pokemon(evolution.species);evolved.energies=target.energies;evolved.energy=target.energy;evolved.damage=target.damage;evolved.tool=target.tool;evolved.under=[...target.under,target.speciesIndex];evolved.playedTurn=s.round;evolved.evolvedThisTurn=true;
  if(payload.target==="bench")p.bench[payload.slot]=evolved;else p.active=evolved;
  p.hand.splice(payload.evolutionIndex,1);if(payload.evolutionIndex<idx)idx--;message="Rare Candy evolved "+target.name+" into "+evolved.name+".";
 }
 else if(card.external){return err(state,card.name+" is not implemented yet. This card will remain in your hand until its effect is supported.");}
 else return err(state,"Unsupported Trainer.");
 p.hand.splice(idx,1);p.discard.push(card);if(card.subtype==="Supporter")p.supporterUsed=true;s.selection=null;s.log.unshift("Player "+(state.turn+1)+": "+message);return {state:s};
}
if(action==="play"){
const idx=s.selection,card=p.hand[idx];
if(!card)return err(state,"Select a card from your hand first.");
if(s.phase==="setup"&&card.kind!=="pokemon")return err(state,"Only Basic Pokémon can be played during setup.");
if(card.kind==="trainer")return err(state,"Tap Play Trainer to use this card.");
if(card.kind==="pokemon"){
const def=species[card.species];
if(def.stage){if(s.phase==="setup")return err(state,"Evolution cards cannot be played during setup.");if(s.round<=2)return err(state,"You cannot evolve on your first turn.");const target=payload.target==="active"?p.active:payload.target==="bench"&&Number.isInteger(payload.slot)?p.bench[payload.slot]:null;if(!target||target.name!==def.evolvesFrom)return err(state,def.name+" must evolve from "+def.evolvesFrom+".");if(target.playedTurn===s.round||target.evolvedThisTurn)return err(state,"Cannot evolve a Pokémon played or evolved this turn.");const evolved=pokemon(card.species);evolved.tool=target.tool||null;evolved.damage=target.damage;evolved.energies=target.energies;evolved.energy=evolved.energies.length;evolved.under=[...target.under,target.speciesIndex];evolved.playedTurn=s.round;evolved.evolvedThisTurn=true;if(payload.target==="active")p.active=evolved;else p.bench[payload.slot]=evolved;message="Evolved "+target.name+" into "+def.name+".";}
else if(payload.target==="active"&&s.phase==="setup"&&!p.active){p.active=pokemon(card.species);p.active.playedTurn=s.round;message="Chose "+p.active.name+" as Active Pokémon.";}
else if(payload.target==="bench"){if(!p.active)return err(state,"Choose your Active Pokémon first.");if(p.bench.length>=5)return err(state,"Your Bench is full.");if(!Number.isInteger(payload.slot)||payload.slot<p.bench.length||payload.slot>=5)return err(state,"Choose an empty Bench slot.");const added=pokemon(card.species);added.playedTurn=s.round;p.bench.push(added);message="Benched "+species[card.species].name+".";}
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
export function knockOut(s){
 const owner=1-s.turn,o=s.players[owner],mon=o.active;o.active=null;
 const prizeCount=discardKnockOut(s,owner,mon);
 let message=" Knockout! "+prizeCount+" Prize card(s) taken.";
 if(s.winner!==null)message+=" Game over!";
 else{s.turn=owner;s.phase="replacement";s.selection=null;}
 return message;
}
function discardKnockOut(s,owner,mon){
 const p=s.players[owner],opponent=s.players[1-owner];
 p.discard.push(basic(mon.speciesIndex),...mon.under.map(basic),...mon.energies.map(energy));
 if(mon.tool)p.discard.push(mon.tool);
 const award=mon.name.endsWith(" ex")?2:1;
 let taken=0;while(taken<award&&opponent.prizeCards.length){opponent.hand.push(opponent.prizeCards.pop());taken++;}
 opponent.prizes=opponent.prizeCards.length;
 if(!opponent.prizes||(!p.active&&!p.bench.length)){s.winner=1-owner;s.winReason=!opponent.prizes?"taking all Prize cards":"knocking out every opposing Pokémon";}
 return taken;
}
export function next(s){s.turn=1-s.turn;s.round++;s.selection=null;s.players[s.turn].attached=false;s.players[s.turn].retreated=false;s.players[s.turn].supporterUsed=false;s.players[s.turn].stadiumPlayed=false;for(const mon of [s.players[s.turn].active,...s.players[s.turn].bench])if(mon){mon.evolvedThisTurn=false;mon.abilityUsed=false;}
if(s.players[s.turn].deck.length)s.players[s.turn].hand.push(s.players[s.turn].deck.shift());
else{s.winner=1-s.turn;s.winReason="deck out";s.log.unshift("Deck out!");}}
export function cardInfo(card){if(card.kind==="pokemon")return {...species[card.species],kind:"pokemon"};return card;}
