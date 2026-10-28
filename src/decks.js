 }else{
  // Exact 60-card Fire collection: 14 Pokémon, 39 Trainers, 7 Fire Energy.
  for(const printing of fireStarterPrintings)add("external-"+printing.id,printing.supertype==="Energy"?7:1);
 }
 for(const name of ["Potion","Quick Ball","Professor's Research","Ultra Ball","Lillie's Determination"])add("trainer-"+name,4);
 for(const name of ["Nemona","Nest Ball","Air Balloon"])add("trainer-"+name,2);
 return {name:player===0?"Lightning Learner · Pikachu & Electrode":"Fire Collection · 60 unique-printing cards",counts};
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
