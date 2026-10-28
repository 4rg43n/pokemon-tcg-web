import {species,energyTypes} from "./cards.js?v=43";
export const pokemonCard=species=>({kind:"pokemon",species});
export const energyCard=type=>({kind:"energy",type,name:type+" Energy"});
export const trainerCard=name=>({image:name==="Quick Ball"?"assets/cards/quick-ball.jpg":name==="Ultra Ball"?"assets/cards/ultra-ball.jpg":undefined,kind:"trainer",name,subtype:name==="Air Balloon"?"Pokémon Tool":name==="Professor's Research"?"Supporter":"Item"});
export const catalog=[
 ...species.map((s,i)=>({id:`pokemon-${i}`,name:s.name,category:"pokemon",detail:`${s.stage?`Stage ${s.stage} · evolves from ${s.evolvesFrom}`:"Basic"} · ${s.type} · ${s.hp} HP`,card:pokemonCard(i)})),
 ...energyTypes.map(type=>({id:`energy-${type}`,name:type+" Energy",category:"energy",detail:"Basic Energy · unlimited copies",card:energyCard(type)})),
 ...["Potion","Quick Ball","Ultra Ball","Professor's Research","Air Balloon"].map(name=>({id:`trainer-${name}`,name,category:"trainer",detail:name==="Air Balloon"?"Pokémon Tool · attach to a Pokémon · retreat costs 2 less":name==="Potion"?"Item · heal 30 damage":name==="Quick Ball"?"Item · discard 1 other card; search for a Basic Pokémon":name==="Ultra Ball"?"Item · discard 2 other cards; search for any Pokémon":"Supporter · discard hand, draw up to 7",card:trainerCard(name)}))
];
// Register external printings without claiming their effects are supported by the engine.
export function registerExternalCard(raw){
 if(!raw?.id||!raw?.name)return null;
 const id="external-"+String(raw.id);
 const existing=catalog.find(c=>c.id===id);if(existing)return existing;
 const kind=String(raw.supertype||raw.type||raw.category||"").toLowerCase();
 const category=kind.includes("pok")?"pokemon":kind.includes("energy")?"energy":"trainer";
 const subtypes=Array.isArray(raw.subtypes)?raw.subtypes:[raw.subtype].filter(Boolean);
 const subtype=subtypes.find(t=>/item|supporter|stadium|tool/i.test(t))||"";
 const card={kind:category,name:raw.name,subtype,set:raw.set?.tcgOnline||raw.set?.id||raw.setCode||"",number:String(raw.number||""),printing:raw.id,image:raw.imageUrl||"",external:true};
 if(category==="pokemon"){
  const stage=/stage\s*2/i.test(raw.stage||"")||/^(Dragapult ex)$/i.test(raw.name)?2:/stage\s*1/i.test(raw.stage||"")||/^(Drakloak|Dudunsparce)$/i.test(raw.name)?1:0;
  const evolvesFrom=raw.evolveFrom||raw.evolvesFrom||({"Drakloak":"Dreepy","Dragapult ex":"Drakloak","Dudunsparce":"Dunsparce"})[raw.name]||"";
  const index=species.length;
  species.push({name:raw.name,hp:Number(raw.hp)|| (stage===2?280:stage===1?120:80),id:0,type:"Colorless",stage,evolvesFrom,retreat:1,attacks:[{name:"Prototype Attack",cost:["Colorless"],damage:30}],image:raw.imageUrl||"",printing:raw.id,external:true});
  card.species=index;
 }
 if(category==="energy")card.type=raw.name.replace(/^(Basic )?/i,"").replace(/ Energy$/i,"");

 const entry={id,name:raw.name,category,detail:[raw.set?.name||raw.setName||raw.set?.id||"",raw.number||"",subtypes.join(", ")].filter(Boolean).join(" · "),card,external:true,basic:category==="pokemon"&&(!/stage\s*[12]|vmax|vstar|break/i.test(String(raw.stage||"Basic"))),unlimited:category==="energy"&&/basic/i.test(String(raw.energyType||raw.subtype||""))};
 catalog.push(entry);return entry;
}
export function defaultDeck(player){
 const counts={};const add=(id,n)=>counts[id]=(counts[id]||0)+n;
 if(player===0){
  // Lightning: Pikachu/Raichu and Voltorb/Electrode; 16 Pokémon, 32 Energy, 12 Trainers.
  for(const [i,n] of [[2,4],[6,3],[0,2],[15,4],[16,3]])add(`pokemon-${i}`,n);
  add("energy-Lightning",32);
 }else{
  // Fire: Charmander/Charizard, Growlithe/Arcanine, Ponyta/Rapidash.
  // 22 Pokémon, 26 Energy, 12 Trainers.
  for(const [i,n] of [[12,4],[13,3],[14,2],[5,4],[7,3],[9,4],[10,2]])add(`pokemon-${i}`,n);
  add("energy-Fire",26);
 }
 for(const name of ["Potion","Quick Ball","Professor's Research"])add("trainer-"+name,4);
 return {name:player===0?"Lightning Learner · Pikachu & Electrode":"Fire Learner · Charizard & Arcanine",counts};
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
  if(!(entry.category==="energy"&&(entry.unlimited||!entry.external)))names.set(entry.name,(names.get(entry.name)||0)+n);
  if(entry.category==="pokemon"&&species[entry.card.species].stage){const parent=species[entry.card.species].evolvesFrom;if(!catalog.some(c=>c.name===parent&&deck.counts[c.id]>0))warnings.push(`${entry.name} has no ${parent} to evolve from.`);}
 }
 if(total!==60)errors.push(`Needs exactly 60 cards (${total}/60).`);
 if(!basics)errors.push("Add at least one Basic Pokémon.");
 for(const [name,n] of names)if(n>4)errors.push(`${name}: maximum four copies across printings.`);
 if(Object.entries(deck.counts).some(([id,n])=>n>0&&catalog.find(c=>c.id===id)?.external))warnings.push("Imported cards use simplified prototype rules; official card effects may be unavailable.");
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
