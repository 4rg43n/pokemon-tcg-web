import {getCardDetail} from "./external-cards.js";
import {parseLimitless} from "./limitless-import.js";
const API="https://api.tcgdex.net/v2/en";
let setsPromise;
let setCodeIndexPromise;
async function setCodeIndex(allSets){
 if(!setCodeIndexPromise)setCodeIndexPromise=(async()=>{
  const key="pokemon-tcg-tcgdex-set-codes-v1";
  try{const saved=JSON.parse(localStorage.getItem(key)||"null");if(saved&&Object.keys(saved).length>100)return saved;}catch{}
  const index={};let cursor=0;
  async function worker(){while(cursor<allSets.length){const item=allSets[cursor++];try{const full=await getSet(item.id);const code=String(full.tcgOnline||"").toUpperCase();if(code)(index[code]??=[]).push(item.id);}catch{}}}
  await Promise.all(Array.from({length:8},worker));
  try{localStorage.setItem(key,JSON.stringify(index));}catch{}
  return index;
 })();
 return setCodeIndexPromise;
}
async function sets(){
 if(!setsPromise)setsPromise=fetch(API+"/sets").then(r=>{if(!r.ok)throw Error("Unable to load card sets.");return r.json();}).catch(e=>{setsPromise=null;throw e;});
 return setsPromise;
}
const details=new Map();
async function getSet(id){
 if(!details.has(id))details.set(id,fetch(API+"/sets/"+encodeURIComponent(id)).then(r=>{if(!r.ok)throw Error("Unable to load set "+id);return r.json();}).catch(e=>{details.delete(id);throw e;}));
 return details.get(id);
}
const CODE_MAP={TWM:"sv6",TEF:"sv5",PAR:"sv4",PAL:"sv2",OBF:"sv3",MEW:"sv3.5",SVI:"sv1",PAF:"sv4.5",SCR:"sv7",SSP:"sv8",PRE:"sv8.5",JTG:"sv9",DRI:"sv10"};
function sameNumber(a,b){return String(a||"").replace(/^0+/,"").toUpperCase()===String(b||"").replace(/^0+/,"").toUpperCase();}
function sameName(a,b){return String(a||"").trim().toLowerCase()===String(b||"").trim().toLowerCase();}
async function resolveBySearch(row){
 const url=new URL(API+"/cards");url.searchParams.set("name",row.name);
 const response=await fetch(url);if(!response.ok)throw Error("Card search unavailable ("+response.status+").");
 const list=await response.json();
 if(!Array.isArray(list))return null;
 const matches=list.filter(c=>sameName(c.name,row.name)&&sameNumber(c.localId,row.number));
 if(matches.length!==1)return null; // Never silently substitute an ambiguous printing.
 return getCardDetail(matches[0].id);
}
export async function importLimitlessDeck(text,{onProgress}={}){
 const parsed=parseLimitless(text,[]);
 const structural=parsed.errors.filter(e=>!/not in playable catalog|ambiguous/.test(e));
 if(structural.length)return {ok:false,errors:structural};
 const allSets=await sets(),cards=[],errors=[];
 const unique=[...new Map(parsed.rows.map(row=>[[row.set,row.number,row.name].join("|"),row])).values()];
 for(let i=0;i<unique.length;i++){
  const row=unique[i];onProgress?.(i+1,unique.length);
  const mapped=CODE_MAP[row.set];
  const candidateSets=allSets.filter(s=>String(s.id||"").toUpperCase()===row.set||s.id===mapped||String(s.tcgOnline||"").toUpperCase()===row.set);
  let match=null;
  for(const set of candidateSets){
   const full=await getSet(set.id);
   const brief=(full.cards||[]).find(c=>sameNumber(c.localId,row.number)&&sameName(c.name,row.name));
   if(brief){match=await getCardDetail(brief.id);break;}
  }
  if(!match)match=await resolveBySearch(row);
  if(!match&&/^(?:basic )?(?:fire|water|grass|lightning|psychic|fighting|darkness|metal) energy$/i.test(row.name)){
   // Basic Energy is unlimited; a local placeholder preserves the requested name and printing.
   match={id:"limitless-"+row.set+"-"+row.number+"-"+row.name.toLowerCase().replace(/\\s+/g,"-"),name:row.name,category:"energy",supertype:"Energy",subtype:"Basic",energyType:"Basic",set:{id:row.set,name:row.set},number:row.number,stage:"",external:true};
  }
  if(!match){
   // Preserve the exact Limitless printing as an explicitly unverified reference,
   // rather than rejecting a valid 60-card list or substituting another printing.
   const lines=String(text).replace(/\\r\\n?/g,"\\n").split("\\n");
   let section="pokemon";
   for(let n=0;n<row.line;n++){
    const heading=lines[n]?.trim().match(/^(Pokémon|Pokemon|Trainer|Energy)\\s*:/i);
    if(heading)section=/trainer/i.test(heading[1])?"trainer":/energy/i.test(heading[1])?"energy":"pokemon";
   }
   const subtype=section==="energy"?"Basic":section==="pokemon"?"Basic":"";
   match={id:"limitless-"+row.set+"-"+row.number+"-"+row.name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),name:row.name,category:section,supertype:section,subtype,energyType:section==="energy"?"Basic":"",stage:section==="pokemon"&&/^(Drakloak|Dragapult ex|Dudunsparce)$/i.test(row.name)?"Stage 1":"Basic",set:{id:row.set,name:row.set},number:row.number,external:true,unverified:true};
  }
  cards.push({row,card:match});
 }
 return {ok:errors.length===0,errors,cards};
}
