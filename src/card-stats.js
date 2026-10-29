import {retreatCost} from "./cards.js?v=65";
import {typeSymbol} from "./type-symbols.js?v=65";
// Display only: these stats do not add Weakness or Resistance battle rules.
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function stat(label,value){
 const unknown=value===undefined;
 const type=value&&typeof value==='object'?value.type:value;
 const description=unknown?'Unknown':!value?'None':type;
 const icon=unknown?'?':!value?'—':typeSymbol(type);
 return `<span class="pokemon-stat" title="${label}: ${escape(description)}" aria-label="${label}: ${escape(description)}"><span class="stat-label">${label}</span><span class="stat-value">${icon}</span></span>`;
}
export function cardStats(c){
 const cost=retreatCost(c);
 const known=Number.isInteger(c.retreat)&&c.retreat>=0;
 return `<div class="pokemon-stats">${stat('Weakness',c.weakness)}${stat('Resistance',c.resistance)}<span class="pokemon-stat" title="Retreat: ${known?cost+' Energy':'Unknown'}" aria-label="Retreat: ${known?cost+' Colorless Energy':'Unknown'}"><span class="stat-label">Retreat</span><span class="stat-value">${known?`${typeSymbol('Colorless')}<span class="retreat-count">${cost}</span>`:'?'}</span></span></div>`;
}
