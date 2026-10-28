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
{name:"Armarouge",hp:140,id:936,type:"Fire",stage:1,evolvesFrom:"Charcadet",retreat:2,attacks:[{name:"Fire Blast",cost:["Fire","Fire","Colorless"],damage:110}]}
];
export const energyTypes=["Fire","Lightning"];
export function canPay(attached,cost){const pool=[...attached];for(const type of cost.filter(x=>x!=="Colorless")){const i=pool.indexOf(type);if(i<0)return false;pool.splice(i,1);}return pool.length>=cost.filter(x=>x==="Colorless").length;}

export function retreatCost(pokemon){return Math.max(0,(pokemon?.retreat??0)-(pokemon?.tool?.name==="Air Balloon"?2:0));}
