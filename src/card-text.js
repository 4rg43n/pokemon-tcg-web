// Plain-language card descriptions for tooltips and the big card view. Text describes what this prototype does.
const ENERGY_SYMBOL={Fire:"🔥",Lightning:"⚡",Water:"💧",Grass:"🌿",Psychic:"🔮",Fighting:"✊",Darkness:"🌙",Metal:"⚙️",Colorless:"★"};

const ATTACK_EFFECT_TEXT={
discardEnergy:"Discard an Energy from this Pokémon.",
stoke:"Search your deck for up to 2 Fire Energy and attach them to this Pokémon.",
draw:"Draw a card.",
pickAndStick:"Attach up to 2 Basic Energy from your discard pile to your Pokémon in any way you like.",
braveWing:"Does 100 more damage if this Pokémon already has damage on it.",
coinBonus20:"Flip a coin. If heads, this attack does 20 more damage.",
discardStadium:"Discard the Stadium in play before dealing damage.",
discardThreeEnergy:"Discard 3 Energy from this Pokémon.",
discardToolsBonus40:"Discard all Pokémon Tools from your Pokémon. This attack does 40 more damage for each Tool discarded.",
regielekiSonar:"Search your deck for an Item card, reveal it and put it into your hand.",
regielekiTargetedBolt:"Does 50 damage to one of your opponent's Benched Pokémon as well."
};

const SUBTYPE_RULE={
Item:"Item: you may play any number of Items during your turn.",
Supporter:"Supporter: you may play only one Supporter card during your turn, and not on the first player's first turn in the official game.",
"Pokémon Tool":"Pokémon Tool: attach it to one of your Pokémon. Each Pokémon can hold only one Tool.",
Stadium:"Stadium: put it next to the battlefield. Only one Stadium can be in play; a new one replaces it."
};

// Effects as the prototype plays them, not the full printed wording.
const TRAINER_TEXT={
"Potion":"Heal 30 damage from one of your Pokémon.",
"Professor's Research":"Discard your hand and draw 7 cards.",
"Quick Ball":"Discard 1 other card from your hand, then search your deck for a Basic Pokémon and put it into your hand.",
"Ultra Ball":"Discard 2 other cards from your hand, then search your deck for any Pokémon and put it into your hand.",
"Air Balloon":"The Pokémon this card is attached to has a Retreat Cost of 2 less.",
"Arven":"Search your deck for an Item card and a Pokémon Tool card and put them into your hand.",
"Bird Keeper":"Switch your Active Pokémon with one of your Benched Pokémon, then draw 3 cards.",
"Blacksmith":"Attach up to 2 Fire Energy from your discard pile to one of your Fire Pokémon.",
"Buddy-Buddy Poffin":"Search your deck for up to 2 Basic Pokémon with 70 HP or less and put them on your Bench.",
"Earthen Vessel":"Discard 1 other card from your hand, then search your deck for up to 2 Basic Energy and put them into your hand.",
"Energy Retrieval":"Put up to 2 Basic Energy from your discard pile into your hand.",
"Escape Rope":"Each player switches their Active Pokémon with one of their Benched Pokémon.",
"Evolution Incense":"Search your deck for an Evolution Pokémon and put it into your hand.",
"Field Blower":"Discard up to 2 Pokémon Tools and Stadiums in play.",
"Fire Crystal":"Put 3 Fire Energy from your discard pile into your hand.",
"Float Stone":"The Pokémon this card is attached to has no Retreat Cost.",
"Gloria":"Search your deck for up to 3 Basic Pokémon that don't have a Rule Box and put them on your Bench.",
"Guzma":"Switch one of your opponent's Benched Pokémon with their Active Pokémon, then switch your Active Pokémon with one of your Benched Pokémon.",
"Hisuian Heavy Ball":"Look at your face-down Prize cards. If you find a Basic Pokémon, swap it with this card.",
"Lana's Aid":"Put up to 3 Pokémon and Basic Energy from your discard pile into your hand.",
"Level Ball":"Search your deck for a Pokémon with 90 HP or less and put it into your hand.",
"Lillie's Determination":"Discard your hand and draw 6 cards, or 8 if you have more Prize cards left than your opponent.",
"Magma Basin":"Once per turn, you may attach a Fire Energy from your discard pile to one of your Benched Pokémon. It takes 20 damage.",
"Muscle Band":"The attacks of the Pokémon this card is attached to do 20 more damage.",
"Nemona":"Draw 3 cards.",
"Nest Ball":"Search your deck for a Basic Pokémon and put it onto your Bench.",
"Night Stretcher":"Put a Pokémon or a Basic Energy from your discard pile into your hand.",
"Pal Pad":"Shuffle up to 2 Supporter cards from your discard pile into your deck.",
"PokéStop":"Once per turn, discard the top 3 cards of your deck and put any Items among them into your hand.",
"Professor's Letter":"Search your deck for up to 2 Basic Energy and put them into your hand.",
"Raihan":"Attach a Basic Energy from your discard pile to one of your Pokémon, then search your deck for any card.",
"Rare Candy":"Evolve one of your Basic Pokémon directly into its Stage 2.",
"Red Card":"Your opponent shuffles their hand into their deck and draws 4 cards.",
"Rescue Stretcher":"Put a Pokémon from your discard pile into your hand.",
"Reset Stamp":"Your opponent shuffles their hand into their deck and draws a card for each Prize they have left.",
"Scoop Up Net":"Put one of your Pokémon into your hand, along with everything attached to it.",
"Silent Lab":"Basic Pokémon in play have no Abilities.",
"Trainers' Mail":"Look at the top 4 cards of your deck and put a Trainer among them into your hand.",
"VS Seeker":"Put a Supporter card from your discard pile into your hand.",
"Vitality Band":"The attacks of the Pokémon this card is attached to do 10 more damage.",
"Welder":"Attach up to 2 Fire Energy from your hand to one of your Pokémon, then draw 3 cards."
};

function attackLines(card){
return (card.attacks||[]).map(attack=>{
const effect=attack.text||ATTACK_EFFECT_TEXT[attack.effect]||"";
return `${attack.cost.map(type=>ENERGY_SYMBOL[type]||"★").join("")||"free"} ${attack.name}${attack.damage?` — ${attack.damage} damage`:""}${effect?`. ${effect}`:""}`;
});
}

// Returns {heading, sections:[{title,lines}]} for a card as rendered (cardInfo already applied for Pokémon).
export function describeCard(card){
if(card.kind==="energy")return {heading:`Basic ${card.type||""} Energy`.replace("  "," "),sections:[{title:"How to use it",lines:["Attach one Energy from your hand to one of your Pokémon each turn. Energy pays for attacks and for retreating."]}]};
if(card.kind==="trainer"){
const subtype=card.subtype||"Item";
const lines=[TRAINER_TEXT[card.name]||(card.external?"This prototype has no automated effect for this card yet; playing it only discards it.":"No effect text recorded.")];
return {heading:`Trainer · ${subtype}`,sections:[{title:"What it does",lines},{title:"Rules",lines:[SUBTYPE_RULE[subtype]||SUBTYPE_RULE.Item]}]};
}
const sections=[];
if(card.ability)sections.push({title:`Ability: ${card.ability.name}`,lines:[card.ability.text]});
const attacks=attackLines(card);
sections.push({title:"Attacks",lines:attacks.length?attacks:["No attacks recorded."]});
sections.push({title:"Battle stats",lines:[`Weakness ${card.weakness||"—"} · Resistance ${card.resistance||"—"} · Retreat Cost ${card.retreat??"?"}`]});
if(card.external)sections.push({title:"Prototype note",lines:["This is a real printed card; the prototype gives it the simplified attacks listed above rather than its printed text."]});
return {heading:`${card.stage===2?"Stage 2":card.stage===1?"Stage 1":"Basic"} ${card.type||"Colorless"} Pokémon · ${card.hp} HP${card.evolvesFrom?` · evolves from ${card.evolvesFrom}`:""}`,sections};
}

export function cardTooltip(card){
const description=describeCard(card);
const detail=description.sections.map(section=>section.lines[0]).filter(Boolean).slice(0,2).join(" ");
return `${card.name||"Card"} — ${description.heading}. ${detail}`;
}
