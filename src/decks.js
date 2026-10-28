import {species,energyTypes} from "./cards.js?v=22";
export const pokemonCard=species=>({kind:"pokemon",species});
export const energyCard=type=>({kind:"energy",type,name:type+" Energy"});
export const trainerCard=name=>({image:name==="Quick Ball"?"assets/cards/quick-ball.jpg":name==="Ultra Ball"?"assets/cards/ultra-ball.jpg":undefined,kind:"trainer",name,subtype:name==="Air Balloon"?"Pokémon Tool":name==="Professor's Research"?"Supporter":"Item"});
export const catalog=[
 ...species.map((s,i)=>({id:`pokemon-${i}`,name:s.name,category:"pokemon",detail:`${s.stage?`Stage ${s.stage} · evolves from ${s.evolvesFrom}`:"Basic"} · ${s.type} · ${s.hp} HP`,card:pokemonCard(i)})),
 ...energyTypes.map(type=>({id:`energy-${type}`,name:type+" Energy",category:"energy",detail:"Basic Energy · unlimited copies",card:energyCard(type)})),
 ...["Potion","Quick Ball","Ultra Ball","Professor's Research","Air Balloon"].map(name=>({id:`trainer-${name}`,name,category:"trainer",detail:name==="Air Balloon"?"Pokémon Tool · attach to a Pokémon · retreat costs 2 less":name==="Potion"?"Item · heal 30 damage":name==="Quick Ball"?"Item · discard 1 other card; search for a Basic Pokémon":name==="Ultra Ball"?"Item · discard 2 other cards; search for any Pokémon":"Supporter · discard hand, draw up to 7",card:trainerCard(name)}))
];
export function defaultDeck(player){
 const counts={};
 const add=(id,n)=>counts[id]=(counts[id]||0)+n;
 for(const index of player===0?[2,2,2,4,4,4,2,4,2,4,2,4,2,4,6,6,6,6]:[3,3,3,5,5,5,3,5,3,5,3,5,3,5,7,7,8,8])add(`pokemon-${index}`,1);
 add("energy-Fire",player===0?8:14);add("energy-Lightning",player===0?14:8);
 add("trainer-Potion",8);add("trainer-Quick Ball",8);add("trainer-Professor's Research",4);
 return {name:player===0?"Lightning starter":"Fire starter",counts};
}
export function validateDeck(deck){
 const errors=[],warnings=[];let total=0,basics=0;
 if(!deck||typeof deck!=="object"||!deck.counts||typeof deck.counts!=="object"||Array.isArray(deck.counts))return {errors:["Invalid deck data."],warnings,total:0,basics:0};
 const names=new Map();
 for(const [id,n] of Object.entries(deck.counts)){
  const entry=catalog.find(c=>c.id===id);
  if(!entry||!Number.isInteger(n)||n<0||n>60){errors.push("Deck contains an unsupported card or quantity.");continue;}
  total+=n;if(!n)continue;
  if(entry.category==="pokemon"&&!species[entry.card.species].stage)basics+=n;
  if(entry.category!=="energy")names.set(entry.name,(names.get(entry.name)||0)+n);
  if(entry.category==="pokemon"&&species[entry.card.species].stage){const parent=species[entry.card.species].evolvesFrom;if(!catalog.some(c=>c.name===parent&&deck.counts[c.id]>0))warnings.push(`${entry.name} has no ${parent} to evolve from.`);}
 }
 if(total!==60)errors.push(`Needs exactly 60 cards (${total}/60).`);
 if(!basics)errors.push("Add at least one Basic Pokémon.");
 for(const [name,n] of names)if(n>4)warnings.push(`${name}: ${n} copies exceeds the usual four-copy limit.`);
 return {errors,warnings,total,basics};
}
export function expandDeck(deck){
 const result=validateDeck(deck);if(result.errors.length)throw new Error(result.errors.join(" "));
 return catalog.flatMap(entry=>Array.from({length:deck.counts[entry.id]||0},()=>({...entry.card})));
}

export function migrateDeck(deck){
 const migrated=structuredClone(deck);
 if(migrated?.counts&&Object.hasOwn(migrated.counts,"trainer-Poké Ball")){
  migrated.counts["trainer-Quick Ball"]=(migrated.counts["trainer-Quick Ball"]||0)+migrated.counts["trainer-Poké Ball"];
  delete migrated.counts["trainer-Poké Ball"];
 }
 return migrated;
}
