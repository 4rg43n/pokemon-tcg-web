// Transitional prototype definitions. Printing data still needs source verification.
// Printing IDs and official attack text will be imported after card-source verification.
export const species=[
{name:"Pikachu ex",hp:200,id:25,type:"Lightning",retreat:1,attacks:[{name:"Spark Strike",cost:["Lightning","Colorless"],damage:60}]},
{name:"Armarouge ex",hp:260,id:936,type:"Fire",retreat:2,attacks:[{name:"Flame Cannon",cost:["Fire","Fire"],damage:70}]},
{name:"Pikachu",hp:70,id:25,type:"Lightning",retreat:1,attacks:[{name:"Quick Zap",cost:["Lightning"],damage:20}]},
{name:"Charcadet",hp:60,id:935,printing:"sv1-39",set:"Scarlet & Violet",number:"039/198",type:"Fire",weakness:"Water",retreat:1,attacks:[{name:"Ember",cost:["Fire"],damage:30,effect:"discardEnergy"}]},
{name:"Eevee",hp:70,id:133,type:"Colorless",retreat:1,attacks:[{name:"Tackle",cost:["Colorless"],damage:20}]},
{name:"Growlithe",hp:90,id:58,printing:"sv1-31",set:"Scarlet & Violet",number:"031/198",type:"Fire",weakness:"Water",retreat:3,attacks:[{name:"Stoke",cost:["Colorless"],damage:0,effect:"stoke"},{name:"Fire Claws",cost:["Fire","Fire","Fire"],damage:70}]},
{name:"Raichu",hp:140,id:26,type:"Lightning",stage:1,evolvesFrom:"Pikachu",retreat:1,attacks:[{name:"Thunderbolt",cost:["Lightning","Lightning","Colorless"],damage:120}]},
{name:"Arcanine",hp:150,id:59,type:"Fire",stage:1,evolvesFrom:"Growlithe",retreat:2,attacks:[{name:"Flame Charge",cost:["Fire","Fire","Colorless"],damage:110}]},
{name:"Armarouge",hp:140,id:936,type:"Fire",stage:1,evolvesFrom:"Charcadet",retreat:2,attacks:[{name:"Fire Blast",cost:["Fire","Fire","Colorless"],damage:110}]} ,
{name:"Ponyta",hp:70,id:77,image:"assets/cards/ponyta.jpg",set:"MEW",number:"077/165",type:"Fire",weakness:"Water",resistance:null,retreat:1,attacks:[{name:"Collect",cost:["Fire"],damage:0,effect:"draw"},{name:"Flop",cost:["Fire","Colorless","Colorless"],damage:30}]},
{name:"Rapidash",hp:110,id:78,image:"assets/cards/rapidash.jpg",set:"DRI",number:"030/182",type:"Fire",stage:1,evolvesFrom:"Ponyta",weakness:"Water",resistance:null,retreat:1,ability:{name:"Hurried Gait",text:"Once during your turn, you may draw a card."},attacks:[{name:"Fire Mane",cost:["Fire","Colorless"],damage:60}]},
{name:"Morpeko",hp:70,id:877,image:"assets/cards/morpeko.jpg",set:"TWM",number:"072/167",type:"Lightning",weakness:"Fighting",resistance:null,retreat:1,ability:{name:"Snack Seek",text:"Once during your turn, you may look at the top card of your deck. You may discard that card."},attacks:[{name:"Pick and Stick",cost:["Lightning"],damage:0,effect:"pickAndStick",text:"Attach up to 2 Basic Energy cards from your discard pile to your Pokémon in any way you like."}]},
{name:"Charmander",hp:70,id:4,printing:"sv3pt5-4",set:"Pokémon 151",number:"004/165",source:"https://limitlesstcg.com/cards/MEW/4",type:"Fire",retreat:1,attacks:[{name:"Blazing Destruction",cost:["Fire"],damage:0,effect:"discardStadium"},{name:"Steady Firebreathing",cost:["Fire","Fire"],damage:30}]},
{name:"Charmeleon",hp:100,id:5,printing:"sv3pt5-5",set:"Pokémon 151",number:"005/165",source:"https://limitlesstcg.com/cards/MEW/5",type:"Fire",stage:1,evolvesFrom:"Charmander",retreat:2,attacks:[{name:"Combustion",cost:["Fire"],damage:20},{name:"Fire Blast",cost:["Fire","Fire","Fire"],damage:90,effect:"discardEnergy"}]},
{name:"Charizard ex",hp:330,id:6,printing:"sv3pt5-6",set:"Pokémon 151",number:"006/165",source:"https://limitlesstcg.com/cards/MEW/6",type:"Fire",stage:2,evolvesFrom:"Charmeleon",retreat:2,attacks:[{name:"Brave Wing",cost:["Fire"],damage:60,effect:"braveWing"},{name:"Explosive Vortex",cost:["Fire","Fire","Fire","Fire"],damage:330,effect:"discardThreeEnergy"}]},
{name:"Voltorb",hp:60,id:100,printing:"sv3pt5-100",set:"Pokémon 151",number:"100/165",source:"https://limitlesstcg.com/cards/MEW/100",type:"Lightning",retreat:1,attacks:[{name:"Tumbling Attack",cost:["Lightning"],damage:10,effect:"coinBonus20"}]},
{name:"Electrode",hp:90,id:101,printing:"sv3pt5-101",set:"Pokémon 151",number:"101/165",source:"https://limitlesstcg.com/cards/MEW/101",type:"Lightning",stage:1,evolvesFrom:"Voltorb",retreat:1,attacks:[{name:"Bang Boom Chain",cost:["Lightning"],damage:20,effect:"discardToolsBonus40"},{name:"Electro Ball",cost:["Lightning","Colorless"],damage:70}]}
];
export const energyTypes=["Fire","Lightning"];
export function canPay(attached,cost){const pool=[...attached];for(const type of cost.filter(x=>x!=="Colorless")){const i=pool.indexOf(type);if(i<0)return false;pool.splice(i,1);}return pool.length>=cost.filter(x=>x==="Colorless").length;}

export function retreatCost(pokemon){return Math.max(0,(pokemon?.retreat??0)-(pokemon?.tool?.name==="Air Balloon"?2:0));}
