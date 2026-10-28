import {retreatCost} from "./cards.js?v=22";
// Display only: these stats do not add Weakness or Resistance battle rules.
const symbols={Grass:"♣",Fire:"🔥",Water:"💧",Lightning:"ϟ",Psychic:"◉",Fighting:"✊",Darkness:"☾",Metal:"⚙",Dragon:"◆",Fairy:"✦",Colorless:"★"};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function typeIcon(type){return `<span class="type-icon type-${Object.hasOwn(symbols,type)?type.toLowerCase():"unknown"}" role="img" aria-label="${escape(type)}" title="${escape(type)}">${symbols[type]||"?"}</span>`;}
function stat(label,value){
 const unknown=value===undefined;
 const type=value&&typeof value==='object'?value.type:value;
 const description=unknown?'Unknown':!value?'None':type;
 const icon=unknown?'?':!value?'—':typeIcon(type);
 return `<span class="pokemon-stat" title="${label}: ${escape(description)}" aria-label="${label}: ${escape(description)}"><span class="stat-label">${label}</span><span class="stat-value">${icon}</span></span>`;
}
export function cardStats(c){
 const cost=retreatCost(c);
 const known=Number.isInteger(c.retreat)&&c.retreat>=0;
 return `<div class="pokemon-stats">${stat('Weakness',c.weakness)}${stat('Resistance',c.resistance)}<span class="pokemon-stat" title="Retreat: ${known?cost+' Energy':'Unknown'}" aria-label="Retreat: ${known?cost+' Colorless Energy':'Unknown'}"><span class="stat-label">Retreat</span><span class="stat-value">${known?`${typeIcon('Colorless')}<span class="retreat-count">${cost}</span>`:'?'}</span></span></div>`;
}
