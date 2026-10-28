import {species,energyTypes} from "./cards.js?v=53";
export const pokemonCard=species=>({kind:"pokemon",species});
export const energyCard=type=>({kind:"energy",type,name:type+" Energy"});
export const trainerCard=name=>({image:name==="Quick Ball"?"assets/cards/quick-ball.jpg":name==="Ultra Ball"?"assets/cards/ultra-ball.jpg":undefined,kind:"trainer",name,subtype:name==="Air Balloon"?"Pokémon Tool":(name==="Professor's Research"||name==="Lillie's Determination"||name==="Nemona")?"Supporter":"Item"});
export const catalog=[
 ...species.map((s,i)=>({id:`pokemon-${i}`,name:s.name,category:"pokemon",detail:`${s.stage?`Stage ${s.stage} · evolves from ${s.evolvesFrom}`:"Basic"} · ${s.type} · ${s.hp} HP`,card:pokemonCard(i)})),
 ...energyTypes.map(type=>({id:`energy-${type}`,name:type+" Energy",category:"energy",detail:"Basic Energy · unlimited copies",card:energyCard(type)})),
 ...["Potion","Quick Ball","Ultra Ball","Professor's Research","Lillie's Determination","Nemona","Nest Ball","Air Balloon"].map(name=>({id:`trainer-${name}`,name,category:"trainer",detail:name==="Air Balloon"?"Pokémon Tool · attach to a Pokémon · retreat costs 2 less":name==="Potion"?"Item · heal 30 damage":name==="Quick Ball"?"Item · discard 1 other card; search for a Basic Pokémon":name==="Ultra Ball"?"Item · discard 2 other cards; search for any Pokémon":name==="Nest Ball"?"Item · search for a Basic Pokémon and put it on the Bench":name==="Nemona"?"Supporter · draw 3 cards" :name==="Lillie's Determination"?"Supporter · shuffle hand into deck; draw 6 (8 if six Prize cards remain)":"Supporter · discard hand, draw up to 7",card:trainerCard(name)}))
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
// Exact requested printings; prototype fallback data, not verified official card text.
export const fireStarterPrintings=[{"id":"starter-fire-PFL-11","name":"Charmander","setCode":"PFL","number":"11","supertype":"Pokémon","stage":"Basic","hp":80},{"id":"starter-fire-PAF-8","name":"Charmeleon","setCode":"PAF","number":"8","supertype":"Pokémon","stage":"Stage 1","evolveFrom":"Charmander","hp":100},{"id":"starter-fire-PGO-10","name":"Charizard","setCode":"PGO","number":"10","supertype":"Pokémon","stage":"Stage 2","evolveFrom":"Charmeleon","hp":160},{"id":"starter-fire-SVP-57","name":"Chi-Yu","setCode":"SVP","number":"57","supertype":"Pokémon","stage":"Basic","hp":80},{"id":"starter-fire-PR-SM-SM219","name":"Entei","setCode":"PR-SM","number":"SM219","supertype":"Pokémon","stage":"Basic","hp":80},{"id":"starter-fire-WHT-19","name":"Heatmor","setCode":"WHT","number":"19","supertype":"Pokémon","stage":"Basic","hp":80},{"id":"starter-fire-MEW-146","name":"Moltres","setCode":"MEW","number":"146","supertype":"Pokémon","stage":"Basic","hp":80},{"id":"starter-fire-CRZ-27","name":"Salandit","setCode":"CRZ","number":"27","supertype":"Pokémon","stage":"Basic","hp":80},{"id":"starter-fire-UNB-31","name":"Salazzle","setCode":"UNB","number":"31","supertype":"Pokémon","stage":"Stage 1","evolveFrom":"Salandit","hp":100},{"id":"starter-fire-CES-23","name":"Slugma","setCode":"CES","number":"23","supertype":"Pokémon","stage":"Basic","hp":80},{"id":"starter-fire-CES-24","name":"Magcargo","setCode":"CES","number":"24","supertype":"Pokémon","stage":"Stage 1","evolveFrom":"Slugma","hp":100},{"id":"starter-fire-PRC-26","name":"Torchic","setCode":"PRC","number":"26","supertype":"Pokémon","stage":"Basic","hp":80},{"id":"starter-fire-DAA-23","name":"Combusken","setCode":"DAA","number":"23","supertype":"Pokémon","stage":"Stage 1","evolveFrom":"Torchic","hp":100},{"id":"starter-fire-DRI-42","name":"Blaziken","setCode":"DRI","number":"42","supertype":"Pokémon","stage":"Stage 2","evolveFrom":"Combusken","hp":160},{"id":"starter-fire-TEF-144","name":"Buddy-Buddy Poffin","setCode":"TEF","number":"144","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-PAR-163","name":"Earthen Vessel","setCode":"PAR","number":"163","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-SVI-171","name":"Energy Retrieval","setCode":"SVI","number":"171","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-BST-125","name":"Escape Rope","setCode":"BST","number":"125","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-SSH-163","name":"Evolution Incense","setCode":"SSH","number":"163","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-GRI-125","name":"Field Blower","setCode":"GRI","number":"125","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-UNB-173","name":"Fire Crystal","setCode":"UNB","number":"173","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-ASR-146","name":"Hisuian Heavy Ball","setCode":"ASR","number":"146","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-BST-129","name":"Level Ball","setCode":"BST","number":"129","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-SVI-181","name":"Nest Ball","setCode":"SVI","number":"181","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-ASC-196","name":"Night Stretcher","setCode":"ASC","number":"196","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-SVI-182","name":"Pal Pad","setCode":"SVI","number":"182","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-POR-81","name":"Poké Pad","setCode":"POR","number":"81","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-BKT-146","name":"Professor's Letter","setCode":"BKT","number":"146","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-FST-237","name":"Quick Ball","setCode":"FST","number":"237","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-MEG-125","name":"Rare Candy","setCode":"MEG","number":"125","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-XY-124","name":"Red Card","setCode":"XY","number":"124","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-GRI-130","name":"Rescue Stretcher","setCode":"GRI","number":"130","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-UNM-206","name":"Reset Stamp","setCode":"UNM","number":"206","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-RCL-165","name":"Scoop Up Net","setCode":"RCL","number":"165","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-ROS-92","name":"Trainers' Mail","setCode":"ROS","number":"92","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-MEG-131","name":"Ultra Ball","setCode":"MEG","number":"131","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-PHF-109","name":"VS Seeker","setCode":"PHF","number":"109","supertype":"Trainer","subtypes":["Item"]},{"id":"starter-fire-BKT-137","name":"Float Stone","setCode":"BKT","number":"137","supertype":"Trainer","subtypes":["Pokémon Tool"]},{"id":"starter-fire-XY-121","name":"Muscle Band","setCode":"XY","number":"121","supertype":"Trainer","subtypes":["Pokémon Tool"]},{"id":"starter-fire-SVI-197","name":"Vitality Band","setCode":"SVI","number":"197","supertype":"Trainer","subtypes":["Pokémon Tool"]},{"id":"starter-fire-BRS-144","name":"Magma Basin","setCode":"BRS","number":"144","supertype":"Trainer","subtypes":["Stadium"]},{"id":"starter-fire-PGO-68","name":"PokéStop","setCode":"PGO","number":"68","supertype":"Trainer","subtypes":["Stadium"]},{"id":"starter-fire-PRC-140","name":"Silent Lab","setCode":"PRC","number":"140","supertype":"Trainer","subtypes":["Stadium"]},{"id":"starter-fire-OBF-186","name":"Arven","setCode":"OBF","number":"186","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-DAA-159","name":"Bird Keeper","setCode":"DAA","number":"159","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-FLF-88","name":"Blacksmith","setCode":"FLF","number":"88","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-CIN-95","name":"Gladion","setCode":"CIN","number":"95","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-BRS-141","name":"Gloria","setCode":"BRS","number":"141","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-BUS-115","name":"Guzma","setCode":"BUS","number":"115","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-TWM-155","name":"Lana's Aid","setCode":"TWM","number":"155","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-MEG-119","name":"Lillie's Determination","setCode":"MEG","number":"119","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-EVS-152","name":"Raihan","setCode":"EVS","number":"152","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-UNB-189","name":"Welder","setCode":"UNB","number":"189","supertype":"Trainer","subtypes":["Supporter"]},{"id":"starter-fire-SVE-2","name":"Basic Fire Energy","setCode":"SVE","number":"2","supertype":"Energy","subtypes":["Basic"],"energyType":"Basic"}];
for(const printing of fireStarterPrintings)registerExternalCard(printing);
export function defaultDeck(player){
 const counts={};const add=(id,n)=>counts[id]=(counts[id]||0)+n;
 if(player===0){
  // Lightning: Pikachu/Raichu and Voltorb/Electrode; 16 Pokémon, 32 Energy, 12 Trainers.
  for(const [i,n] of [[2,4],[6,3],[0,2],[15,4],[16,3]])add(`pokemon-${i}`,n);
  add("energy-Lightning",18);
 }else{
  for(const printing of fireStarterPrintings)add("external-"+printing.id,printing.supertype==="Energy"?7:1);
 }
 if(player===0){for(const name of ["Potion","Quick Ball","Professor's Research","Ultra Ball","Lillie's Determination"])add("trainer-"+name,4);
 for(const name of ["Nemona","Nest Ball","Air Balloon"])add("trainer-"+name,2);}
 return {name:player===0?"Lightning Learner · Pikachu & Electrode":"Fire Collection · 60-card list",counts};
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
