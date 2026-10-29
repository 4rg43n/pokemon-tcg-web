// Transport configuration is deliberately held by the caller in memory, never storage.
export function judgeServiceURL(value){
 const url=new URL(value);
 if(url.username||url.password||url.search||url.hash)throw new Error("Use a service URL without credentials, query, or fragment.");
 if(url.protocol!=="https:"&&!(url.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(url.hostname)))throw new Error("Use HTTPS for a remote Judge service (HTTP is allowed only on localhost).");
 return url.href.replace(/\/$/,"");
}
export function publicJudgeContext(state,{benchLimit,cardInfo,species}){
 const card=c=>c?{kind:c.kind,name:c.name||(c.kind==="pokemon"?species[c.species]?.name:undefined),type:c.type,subtype:c.subtype,printing:c.printing,set:c.set,number:c.number}:null;
 const mon=c=>{if(!c)return null;const d=cardInfo(c);return {...card(d),hp:d.hp,damage:d.damage||0,stage:d.stage||0,evolvesFrom:d.evolvesFrom,attacks:(d.attacks||[]).map(a=>({name:a.name,cost:[...(a.cost||[])],damage:a.damage,text:a.text,effect:a.effect})),ability:d.ability?{name:d.ability.name,text:d.ability.text}:null,energies:[...(c.energies||[])],tool:card(c.tool),evolutionStack:(c.under||[]).map(s=>typeof s==="number"?{name:species[s]?.name}:card(s)),abilityUsed:!!c.abilityUsed};};
 // An explicit whitelist: never spread state/players, logs, history, own hand,
 // inspection tokens, deck lists, prizes, planner data, or authorized private peeks.
 return {cardDataStatus:"prototype-unverified; confirm exact printed text before ruling",round:state.round,turn:state.turn,phase:state.phase,stadium:card(state.stadium),stadiumOwner:state.stadiumOwner,stadiumLimitedPlayer:state.stadiumLimitedPlayer,players:state.players.map((p,player)=>({player,handCount:p.hand.length,deckCount:p.deck.length,prizeCount:p.prizeCards.length,active:state.phase==="setup"?null:mon(p.active),bench:state.phase==="setup"?[]:p.bench.map(mon),discard:p.discard.map(card),lostZone:(p.lostZone||[]).map(card),benchLimit:benchLimit(state,player),declaredBenchLimit:p.declaredBenchLimit,attached:!!p.attached,retreated:!!p.retreated,supporterUsed:!!p.supporterUsed}))};
}
export async function requestJudgeRuling({url,token,question,context,signal}){
 const response=await fetch(judgeServiceURL(url)+"/api/judge/rulings",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({question,context}),signal,credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer"});
 let result;try{result=await response.json();}catch{throw new Error("Judge service returned an unreadable response.");}
 if(!response.ok)throw new Error(`Judge service request failed (HTTP ${response.status}). Check service configuration and retry.`);
 if(!result?.ruling||!Array.isArray(result.panel))throw new Error("Judge service returned an invalid ruling response.");
 return result;
}
