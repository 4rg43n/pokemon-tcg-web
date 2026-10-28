// English Pokémon TCG printings from the documented public TCGdex REST API.
// List responses are bare arrays; detail requests provide category and trainer subtype.
const API="https://api.tcgdex.net/v2/en";
const PAGE_SIZE=48;
export function normalizeCard(c){
 const category=String(c.category||"").toLowerCase();
 const subtype=category==="trainer"?(c.trainerType==="Tool"?"Pokémon Tool":c.trainerType||""):category==="pokemon"?c.stage||"Basic":c.energyType||"";
 return {id:c.id,name:c.name,category,supertype:c.category||"",subtype,subtypes:[subtype].filter(Boolean),stage:c.stage||"",set:c.set||{id:String(c.id).split("-")[0]},number:c.localId||String(c.id).split("-").slice(1).join("-"),imageUrl:c.image?`${c.image}/low.webp`:"",hp:c.hp||null,external:true};
}
export async function getCardDetail(id,{signal}={}){
 const response=await fetch(`${API}/cards/${encodeURIComponent(id)}`,{signal});
 if(!response.ok)throw new Error(`Card details unavailable (${response.status}).`);
 return normalizeCard(await response.json());
}
export async function searchCardDatabase({query="",category="all",page=1,signal}={}){
 const url=new URL(`${API}/cards`);
 url.searchParams.set("pagination:page",String(page));
 url.searchParams.set("pagination:itemsPerPage",String(PAGE_SIZE));
 if(query.trim())url.searchParams.set("name",query.trim());
 const group={pokemon:"Pokemon",trainer:"Trainer",energy:"Energy"};
 if(group[category])url.searchParams.set("category",group[category]);
 if(["item","supporter","stadium","tool"].includes(category)){
  url.searchParams.set("category","Trainer");
  url.searchParams.set("trainerType",category==="tool"?"Tool":category[0].toUpperCase()+category.slice(1));
 }
 const response=await fetch(url,{signal});
 if(!response.ok)throw new Error(`Card database unavailable (${response.status}).`);
 const rows=await response.json();
 if(!Array.isArray(rows))throw new Error("Unexpected card database response.");
 return {cards:rows.map(normalizeCard),total:null,page,hasMore:rows.length===PAGE_SIZE};
}
