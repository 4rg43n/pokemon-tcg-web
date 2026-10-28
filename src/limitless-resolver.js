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
export async function importLimitlessDeck(text,{onProgress}={}){
 const parsed=parseLimitless(text,[]);
 const structural=parsed.errors.filter(e=>!/not in playable catalog|ambiguous/.test(e));
 if(structural.length)return {ok:false,errors:structural};
 const allSets=await sets(),cards=[],errors=[];
 const setIndex=await setCodeIndex(allSets);
 const unique=[...new Map(parsed.rows.map(row=>[[row.set,row.number,row.name].join("|"),row])).values()];
 for(let i=0;i<unique.length;i++){
  const row=unique[i];onProgress?.(i+1,unique.length);
  const candidateSets=allSets.filter(s=>(setIndex[row.set]||[]).includes(s.id)||String(s.id||"").toUpperCase()===row.set||String(s.name||"").toUpperCase()===row.set);
  if(!candidateSets.length){errors.push(`Line ${row.line}: unknown set code ${row.set}.`);continue;}
  let match=null;
  for(const set of candidateSets){
   const full=await getSet(set.id);
   const brief=(full.cards||[]).find(c=>String(c.localId||"").replace(/^0+/,"").toUpperCase()===row.number.replace(/^0+/,"").toUpperCase()&&String(c.name).toLowerCase()===row.name.toLowerCase());
   if(brief){match=await getCardDetail(brief.id);break;}
  }
  if(!match){errors.push(`Line ${row.line}: cannot resolve ${row.name} ${row.set} ${row.number}.`);continue;}
  cards.push({row,card:match});
 }
 return {ok:errors.length===0,errors,cards};
}
