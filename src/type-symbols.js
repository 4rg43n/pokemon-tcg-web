// Printed Pokémon TCG symbols mirrored locally from Bulbagarden Archives.
// Source links and copyright attribution are recorded in assets/types/sources.json.
const types=new Set(["Grass","Fire","Water","Lightning","Psychic","Fighting","Darkness","Metal","Dragon","Fairy","Colorless"]);
const escape=value=>String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
export function typeSymbol(type){
 if(!types.has(type))return `<span class="type-symbol-unknown">${escape(type||"Unknown")}</span>`;
 return `<img class="tcg-type-symbol" src="assets/types/${type.toLowerCase()}.png?v=54" alt="${type} Energy" title="${type}" width="18" height="18" draggable="false">`;
}
