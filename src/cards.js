// Transitional card definitions. Names/types correspond to Pokémon, but attacks remain simplified placeholders.
// Printing IDs and official attack text will be imported after card-source verification.
export const species=[
{name:"Pikachu ex",hp:200,id:25,type:"Lightning",retreat:1,attacks:[{name:"Spark Strike",cost:["Lightning","Colorless"],damage:60}]},
{name:"Armarouge ex",hp:260,id:936,type:"Fire",retreat:2,attacks:[{name:"Flame Cannon",cost:["Fire","Fire"],damage:70}]},
{name:"Pikachu",hp:70,id:25,type:"Lightning",retreat:1,attacks:[{name:"Quick Zap",cost:["Lightning"],damage:20}]},
{name:"Charcadet",hp:70,id:935,type:"Fire",retreat:1,attacks:[{name:"Ember",cost:["Fire"],damage:20}]},
{name:"Eevee",hp:70,id:133,type:"Colorless",retreat:1,attacks:[{name:"Tackle",cost:["Colorless"],damage:20}]},
{name:"Growlithe",hp:80,id:58,type:"Fire",retreat:2,attacks:[{name:"Bite",cost:["Fire","Colorless"],damage:30}]}
];
export const energyTypes=["Fire","Lightning"];
export function canPay(attached,cost){const pool=[...attached];for(const type of cost.filter(x=>x!=="Colorless")){const i=pool.indexOf(type);if(i<0)return false;pool.splice(i,1);}return pool.length>=cost.filter(x=>x==="Colorless").length;}
