// Lightweight two-player prototype; intentionally not a complete official TCG rules engine.
import {species,canPay,retreatCost} from "./cards.js?v=37";
export const pokemon=(i)=>({...species[i],speciesIndex:i,damage:0,energy:0,energies:[],evolvedThisTurn:false,playedTurn:0,under:[],tool:null});
import {defaultDeck, expandDeck, validateDeck, energyCard as energy, pokemonCard as basic} from "./decks.js?v=37";
function shuffle(cards){for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
function player(i,deck){
 const cards=shuffle(expandDeck(deck||defaultDeck(i)));
 let hand=[],mulligans=0;
 do{if(hand.length)cards.push(...hand);shuffle(cards);hand=cards.splice(0,7);mulligans++;}while(!hand.some(c=>c.kind==="pokemon"&&!species[c.species].stage));
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
 else if(card.name==="Professor's Research"){p.discard.push(...p.hand.filter((_,i)=>i!==idx));p.hand=[];for(let n=0;n<7&&p.deck.length;n++)p.hand.push(p.deck.shift());p.supporterUsed=true;message="Professor's Research drew "+p.hand.length+" cards.";p.discard.push(card);s.selection=null;s.log.unshift("Player "+(state.turn+1)+": "+message);return {state:s};}
 else if(card.external){message=card.name+" played (prototype: no automated effect).";}
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
if(p.attached)return err(state,"You can attach only one Energy per turn.");
const target=payload.target==="active"?p.active:payload.target==="bench"&&Number.isInteger(payload.slot)?p.bench[payload.slot]:null;
if(!target)return err(state,"Tap your Active Pokémon or a Benched Pokémon to attach Energy.");
target.energies.push(card.type);target.energy=target.energies.length;p.attached=true;message="Attached "+card.type+" Energy to "+target.name+".";
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
else if(move.effect==="stoke"){let attached=0;for(let n=p.deck.length-1;n>=0&&attached<2;n--){if(p.deck[n].kind==="energy"&&p.deck[n].type==="Fire"){p.deck.splice(n,1);p.active.energies.push("Fire");attached++;}}p.active.energy=p.active.energies.length;shuffle(p.deck);message=p.active.name+" used Stoke and attached "+attached+" Fire Energy.";}
else{o.active.damage+=move.damage;message=p.active.name+" used "+move.name+" for "+move.damage+" damage.";if(move.effect==="discardEnergy"){const type=p.active.energies.pop();p.active.energy=p.active.energies.length;p.discard.push(energy(type));message+=" Discarded "+type+" Energy.";}}
if(o.active.damage>=o.active.hp){
const prizeCount=o.active.name.endsWith(" ex")?2:1;for(let n=0;n<prizeCount&&p.prizeCards.length;n++)p.hand.push(p.prizeCards.pop());p.prizes=p.prizeCards.length;o.discard.push({kind:"pokemon",species:o.active.speciesIndex});for(const index of o.active.under)o.discard.push(basic(index));for(const type of o.active.energies)o.discard.push(energy(type));if(o.active.tool)o.discard.push(o.active.tool);message+=" Knockout! "+prizeCount+" Prize card(s) taken.";
if(p.prizes===0||o.bench.length===0){s.winner=s.turn;s.winReason=p.prizes===0?"taking all Prize cards":"knocking out every opposing Pokémon";message+=" Game over!";}
else{o.active=null;s.turn=1-s.turn;s.phase="replacement";s.selection=null;}
}
if(s.winner===null&&s.phase!=="replacement")next(s);
}else if(action==="end"){if(s.phase!=="playing")return err(state,"Finish the Pokémon switch first.");next(s);message="Turn ended.";}
else if(action==="bench"){
const idx=p.hand.findIndex(c=>c.kind==="pokemon");if(idx<0)return err(state,"No Basic Pokémon in hand.");
if(p.bench.length>=5)return err(state,"Bench full.");
p.bench.push(pokemon(p.hand[idx].species));p.hand.splice(idx,1);message="Benched a Basic Pokémon.";
}else if(action==="energy"){
const idx=p.hand.findIndex(c=>c.kind==="energy");if(idx<0)return err(state,"No Energy in hand.");
if(p.attached)return err(state,"Already attached Energy this turn.");
const card=p.hand.splice(idx,1)[0];p.active.energies.push(card.type);p.active.energy=p.active.energies.length;p.attached=true;message="Attached Energy to Active Pokémon.";
}else return err(state,"Unknown action.");
s.log.unshift("Player "+(state.turn+1)+": "+message);return {state:s};
}
function next(s){s.turn=1-s.turn;s.round++;s.selection=null;s.players[s.turn].attached=false;s.players[s.turn].retreated=false;s.players[s.turn].supporterUsed=false;for(const mon of [s.players[s.turn].active,...s.players[s.turn].bench])if(mon){mon.evolvedThisTurn=false;mon.abilityUsed=false;}
if(s.players[s.turn].deck.length)s.players[s.turn].hand.push(s.players[s.turn].deck.shift());
else{s.winner=1-s.turn;s.winReason="deck out";s.log.unshift("Deck out!");}}
export function cardInfo(card){if(card.kind==="pokemon")return {...species[card.species],kind:"pokemon"};return card;}
