// Generic Trainer mechanics: five effect families shared by many cards, driven by a name table.
// Each card resolves without a dialog; when the player gives no choice, a sensible default is picked and logged.

const BASIC_ENERGY_TYPES=new Set(["Fire","Lightning","Water","Grass","Psychic","Fighting","Darkness","Metal","Fairy"]);

export const TRAINER_MECHANICS={
"Hop":{kind:"draw",count:3},
"Cheren":{kind:"draw",count:3},
"Hau":{kind:"draw",count:3},
"Tierno":{kind:"draw",count:3},
"Cynthia":{kind:"draw",shuffleHand:true,count:6},
"Judge":{kind:"draw",shuffleHand:true,count:4,opponent:4},
"Marnie":{kind:"draw",shuffleHand:true,count:5,opponent:4},
"N":{kind:"draw",shuffleHand:true,count:"prizes",opponent:"prizes"},
"Great Ball":{kind:"search",look:7,filter:"pokemon"},
"Poké Ball":{kind:"search",filter:"pokemon",coin:true},
"Evosoda":{kind:"search",filter:"evolutionOfMine"},
"Guzma & Hala":{kind:"search",filter:["stadium","tool","specialEnergy"]},
"Energy Search":{kind:"search",filter:"basicEnergy"},
"Ordinary Rod":{kind:"recover",filter:["pokemon","basicEnergy"],count:2,to:"deck"},
"Brock's Grit":{kind:"recover",filter:["pokemon","basicEnergy"],count:6,to:"deck"},
"Energy Recycler":{kind:"recover",filter:"basicEnergy",count:5,to:"deck"},
"Lana's Fishing Rod":{kind:"recover",filter:["pokemon","tool"],count:2,to:"deck"},
"Lusamine":{kind:"recover",filter:["supporter","stadium"],count:2,to:"hand"},
"Switch":{kind:"switch",target:"self"},
"Switch Cart":{kind:"switch",target:"self",heal:30},
"Boss's Orders":{kind:"switch",target:"opponent"},
"Pokémon Catcher":{kind:"switch",target:"opponent",coin:true},
"Max Potion":{kind:"heal",amount:"all",discardEnergy:"all"},
"Hyper Potion":{kind:"heal",amount:120,discardEnergy:2},
"Super Potion":{kind:"heal",amount:60,discardEnergy:1},
"Moomoo Milk":{kind:"heal",amount:30,coins:2}
};

const FILTER_TEXT={pokemon:"Pokémon",evolutionOfMine:"Evolution card for one of your Pokémon",stadium:"Stadium",tool:"Pokémon Tool",specialEnergy:"Special Energy",basicEnergy:"Basic Energy",supporter:"Supporter"};
const filterText=filter=>[].concat(filter).map(name=>FILTER_TEXT[name]||name).join(" or ");

export function describeMechanic(name){
const mechanic=TRAINER_MECHANICS[name];
if(!mechanic)return "";
if(mechanic.kind==="draw"){
const amount=mechanic.count==="prizes"?"a card for each Prize card you have left":`${mechanic.count} cards`;
return `${mechanic.shuffleHand?"Shuffle your hand into your deck, then draw":"Draw"} ${amount}.${mechanic.opponent?` Your opponent does the same${mechanic.opponent==="prizes"?"":` and draws ${mechanic.opponent}`}.`:""}`;
}
if(mechanic.kind==="search"){
const where=mechanic.look?`Look at the top ${mechanic.look} cards of your deck and take`:"Search your deck for";
return `${where} a ${filterText(mechanic.filter)} and put it into your hand${mechanic.coin?" (flip a coin first: tails does nothing)":""}, then shuffle.`;
}
if(mechanic.kind==="recover")return `Put up to ${mechanic.count} ${filterText(mechanic.filter)} card${mechanic.count>1?"s":""} from your discard pile ${mechanic.to==="deck"?"into your deck":"into your hand"}.`;
if(mechanic.kind==="switch")return mechanic.target==="self"?`Switch your Active Pokémon with one of your Benched Pokémon${mechanic.heal?` and heal ${mechanic.heal} damage from it`:""}.`:`Switch one of your opponent's Benched Pokémon with their Active Pokémon${mechanic.coin?" if a coin flip is heads":""}.`;
if(mechanic.kind==="heal")return mechanic.amount==="all"?"Heal all damage from one of your Pokémon and discard all Energy from it.":`Heal ${mechanic.coins?`${mechanic.amount} for each heads on ${mechanic.coins} coin flips`:`${mechanic.amount} damage`} from one of your Pokémon${mechanic.discardEnergy?`, then discard ${mechanic.discardEnergy} Energy from it`:""}.`;
}

function matches(card,filter,context){
const definition=card.kind==="pokemon"?context.species[card.species]:null;
return [].concat(filter).some(name=>{switch(name){
case "pokemon":return card.kind==="pokemon";
case "evolutionOfMine":return !!definition&&!!definition.stage&&context.inPlayNames.includes(definition.evolvesFrom);
case "stadium":return card.kind==="trainer"&&card.subtype==="Stadium";
case "tool":return card.kind==="trainer"&&card.subtype==="Pokémon Tool";
case "supporter":return card.kind==="trainer"&&card.subtype==="Supporter";
case "specialEnergy":return card.kind==="energy"&&!BASIC_ENERGY_TYPES.has(card.type);
case "basicEnergy":return card.kind==="energy"&&BASIC_ENERGY_TYPES.has(card.type);
}});
}

const cardLabel=(card,species)=>card.kind==="pokemon"?(species[card.species]?.name||"a Pokémon"):card.name||(card.kind==="energy"?`${card.type} Energy`:"a card");
const flip=()=>Math.random()<0.5;

function drawCards(player,count){
let drawn=0;
while(drawn<count&&player.deck.length){player.hand.push(player.deck.shift());drawn++;}
return drawn;
}

function shuffleHandIn(player,shuffle){
player.deck.push(...player.hand);
player.hand=[];
shuffle(player.deck);
}

function pickFromPile(pile,filter,count,chosen,context){
const eligible=pile.map((card,index)=>({card,index})).filter(entry=>matches(entry.card,filter,context));
const wanted=Array.isArray(chosen)?eligible.filter(entry=>chosen.includes(entry.index)):eligible;
return wanted.slice(0,count);
}

function removeIndices(pile,indices){
return [...indices].sort((left,right)=>right-left).map(index=>pile.splice(index,1)[0]);
}

export function applyTrainerMechanic(state,handIndex,payload,helpers){
const next=structuredClone(state),player=next.players[next.turn],opponent=next.players[1-next.turn];
const card=player.hand[handIndex],mechanic=TRAINER_MECHANICS[card.name];
const context={species:helpers.species,inPlayNames:[player.active,...player.bench].filter(Boolean).map(mon=>mon.name)};
const {shuffle}=helpers;
let message="";
if(mechanic.kind==="draw"){
const ownCount=mechanic.count==="prizes"?player.prizes:mechanic.count;
if(mechanic.shuffleHand){player.hand.splice(handIndex,1);player.discard.push(card);shuffleHandIn(player,shuffle);}
const drawn=drawCards(player,ownCount);
let opponentNote="";
if(mechanic.opponent){const theirCount=mechanic.opponent==="prizes"?opponent.prizes:mechanic.opponent;if(mechanic.shuffleHand)shuffleHandIn(opponent,shuffle);opponentNote=` Opponent drew ${drawCards(opponent,theirCount)}.`;}
message=`${card.name}: ${mechanic.shuffleHand?"shuffled hand into deck and ":""}drew ${drawn}.${opponentNote}`;
if(mechanic.shuffleHand){if(card.subtype==="Supporter")player.supporterUsed=true;next.selection=null;next.log.unshift(`Player ${next.turn+1}: ${message}`);return {state:next};}
}
else if(mechanic.kind==="search"){
if(mechanic.coin&&!flip()){message=`${card.name}: tails, nothing found.`;}
else{
const pool=mechanic.look?player.deck.slice(0,mechanic.look):player.deck;
const picks=pickFromPile(pool,mechanic.filter,1,payload.choices,context);
if(!picks.length&&!mechanic.look)return {state,error:`No ${filterText(mechanic.filter)} left in your deck.`};
const found=removeIndices(player.deck,picks.map(pick=>pick.index));
player.hand.push(...found);shuffle(player.deck);
message=`${card.name}: ${found.length?`found ${found.map(foundCard=>cardLabel(foundCard,helpers.species)).join(", ")}`:"found nothing"} and shuffled the deck.`;
}
}
else if(mechanic.kind==="recover"){
const picks=pickFromPile(player.discard,mechanic.filter,mechanic.count,payload.choices,context);
if(!picks.length)return {state,error:`No ${filterText(mechanic.filter)} cards in your discard pile.`};
const recovered=removeIndices(player.discard,picks.map(pick=>pick.index));
if(mechanic.to==="deck"){player.deck.push(...recovered);shuffle(player.deck);}else player.hand.push(...recovered);
message=`${card.name}: returned ${recovered.map(recoveredCard=>cardLabel(recoveredCard,helpers.species)).join(", ")} to ${mechanic.to==="deck"?"the deck":"hand"}.`;
}
else if(mechanic.kind==="switch"){
if(mechanic.target==="self"){
if(!player.bench.length||!player.active)return {state,error:"You need a Benched Pokémon to switch into."};
const slot=Number.isInteger(payload.slot)&&player.bench[payload.slot]?payload.slot:player.bench.map((mon,index)=>({mon,index})).sort((left,right)=>right.mon.energies.length-left.mon.energies.length)[0].index;
const outgoing=player.active;player.active=player.bench.splice(slot,1)[0];player.bench.push(outgoing);
if(mechanic.heal&&outgoing.damage)outgoing.damage=Math.max(0,outgoing.damage-mechanic.heal);
message=`${card.name}: ${player.active.name} switched in for ${outgoing.name}.`;
}else{
if(!opponent.bench.length||!opponent.active)return {state,error:"Your opponent has no Benched Pokémon to switch in."};
if(mechanic.coin&&!flip())message=`${card.name}: tails, nothing happened.`;
else{
const slot=Number.isInteger(payload.slot)&&opponent.bench[payload.slot]?payload.slot:opponent.bench.map((mon,index)=>({mon,index})).sort((left,right)=>Math.max(0,left.mon.hp-(left.mon.damage||0))-Math.max(0,right.mon.hp-(right.mon.damage||0)))[0].index;
const outgoing=opponent.active;opponent.active=opponent.bench.splice(slot,1)[0];opponent.bench.push(outgoing);
message=`${card.name}: dragged ${opponent.active.name} into the opponent's Active spot.`;
}
}
}
else if(mechanic.kind==="heal"){
const targets=[{target:"active",mon:player.active},...player.bench.map((mon,slot)=>({target:"bench",slot,mon}))].filter(entry=>entry.mon&&entry.mon.damage>0);
if(!targets.length)return {state,error:"None of your Pokémon have damage to heal."};
const chosen=targets.find(entry=>entry.target===payload.target&&(entry.target==="active"||entry.slot===payload.slot))||targets.sort((left,right)=>right.mon.damage-left.mon.damage)[0];
const mon=chosen.mon;
const heads=mechanic.coins?Array.from({length:mechanic.coins},flip).filter(Boolean).length:1;
const healed=mechanic.amount==="all"?mon.damage:Math.min(mon.damage,mechanic.amount*heads);
mon.damage-=healed;
let energyNote="";
if(mechanic.discardEnergy){const dropCount=mechanic.discardEnergy==="all"?mon.energies.length:Math.min(mechanic.discardEnergy,mon.energies.length);for(let dropped=0;dropped<dropCount;dropped++)player.discard.push(helpers.energyCard(mon.energies.shift()));mon.energy=mon.energies.length;energyNote=dropCount?` and discarded ${dropCount} Energy`:"";}
message=`${card.name}: healed ${healed} damage from ${mon.name}${energyNote}.`;
}
player.hand.splice(handIndex,1);player.discard.push(card);
if(card.subtype==="Supporter")player.supporterUsed=true;
next.selection=null;next.log.unshift(`Player ${next.turn+1}: ${message}`);
return {state:next};
}
