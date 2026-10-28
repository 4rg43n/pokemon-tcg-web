// External card browser. Browsing does not imply simulator engine support.
const API="https://pokemontcg.jacobcorbett.com/api/v1/cards";
export async function searchCardDatabase({query="",category="all",page=1,signal}={}){
 const url=new URL(API);url.searchParams.set("language","en");url.searchParams.set("limit","48");url.searchParams.set("page",String(page));
 if(query.trim())url.searchParams.set("q",query.trim());
 const response=await fetch(url,{signal});if(!response.ok)throw new Error("Card database unavailable ("+response.status+").");
 const result=await response.json();
 const items=Array.isArray(result.data)?result.data:[];
 const kind=c=>String(c.supertype||c.type||c.category||"").toLowerCase();
 const subtype=c=>String(c.subtype||c.subtypes?.join(" ")||"").toLowerCase();
 const filtered=items.filter(c=>category==="all"||category==="pokemon"&&kind(c).includes("pok")||category==="energy"&&kind(c).includes("energy")||category==="trainer"&&kind(c).includes("trainer")||category==="item"&&subtype(c).includes("item")||category==="supporter"&&subtype(c).includes("supporter")||category==="tool"&&subtype(c).includes("tool")||category==="stadium"&&subtype(c).includes("stadium"));
 return {cards:filtered,total:Number(result.total)||0,page:Number(result.page)||page,hasMore:page*48<(Number(result.total)||0)};
}
