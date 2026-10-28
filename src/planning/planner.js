// Deterministic Player 2 planning experiment. All decisions use Player 2's visible information.
import {canPay,retreatCost,species} from "../cards.js?v=24";
const KEY="ptcg.ai.plans.v1";
const identity=m=>m?m.name:null;
const observed=s=>({active:identity(s.players[0].active),activeHp:s.players[0].active?Math.max(0,s.players[0].active.hp-s.players[0].active.damage):0,bench:s.players[0].bench.length,prizes:s.players[0].prizes});
export function createPlanner(storage=(()=>{try{return localStorage;}catch{return null;}})()){
 let active=null,archive=[],sequence=0;
 const persist=()=>{try{storage?.setItem(KEY,JSON.stringify(archive));}catch{}};
 const close=(status,reason,actual=null)=>{if(!active)return;active.status=status;active.closedAt=new Date().toISOString();active.reason=reason;active.actual=actual;archive.push(structuredClone(active));persist();active=null;};
 function build(s){
  const p=s.players[1],actions=[],goal="Develop board and apply pressure";
  if(s.phase==="replacement"){actions.push({action:"promote",payload:{slot:0},why:"Replace knocked-out Active"});}
  else if(s.phase==="setup"){
   if(!p.active){const idx=p.hand.findIndex(c=>c.kind==="pokemon"&&!species[c.species].stage);if(idx>=0)actions.push({action:"play",select:idx,payload:{target:"active"},why:"Choose opening Basic"});}
   else actions.push({action:"ready",why:"Finish setup"});
  }else if(s.phase==="playing"){
   const basics=p.hand.map((c,i)=>({c,i})).filter(x=>x.c.kind==="pokemon"&&!species[x.c.species].stage);
   if(p.bench.length<5&&basics.length)actions.push({action:"play",select:basics[0].i,payload:{target:"bench",slot:p.bench.length},why:"Build a bench"});
   const energy=p.hand.findIndex(c=>c.kind==="energy");
   if(!p.attached&&energy>=0&&p.active)actions.push({action:"play",select:energy,payload:{target:"active"},why:"Power up Active"});
   actions.push({action:"attackOrEnd",why:"Attack if affordable; otherwise end turn"});
  }
  return {id:"p2-"+(++sequence),createdAt:new Date().toISOString(),round:s.round,status:"active",goal,actions,completed:[],prediction:null,deviations:[]};
 }
 function begin(s){if(!active)active=build(s);return active;}
 function next(s){
  if(s.turn!==1||s.winner!==null)return null;
  begin(s);
  if(!active.actions.length){close("completed","All planned actions performed");active=build(s);}
  let step=active.actions[0];
  // Re-resolve selected hand cards by identity because previous plays shift indices.
  if(step.select!==undefined){const wanted=step.payload.target==="active"&&s.phase==="playing"?"energy":"pokemon";
   if(s.players[1].hand[step.select]?.kind!==wanted){const i=s.players[1].hand.findIndex(c=>c.kind===wanted&&(wanted!=="pokemon"||!species[c.species].stage));if(i<0){active.actions.shift();return next(s);}step={...step,select:i};}
  }
  if(step.action==="attackOrEnd"){
   const p=s.players[1],index=p.active?.attacks.findIndex(a=>a.effect!=="pickAndStick"&&canPay(p.active.energies,a.cost))??-1;
   step={...step,action:index>=0?"attack":"end",payload:index>=0?{index}:{}};
  }
  return step;
 }
 function applied(step,s){if(!active)return;active.completed.push({...step,round:s.round});active.actions.shift();if(s.turn===0&&s.phase==="playing"&&s.winner===null){active.prediction=observed(s);active.predictionMeaning="Opponent Active and Prize count remain unchanged before our next turn";}}
 function onChange(before,after,action){
  if(!active)return;
  if(after.winner!==null){close("finished","Game ended",observed(after));return;}
  if(before.turn===0&&after.turn===1&&after.phase==="playing"&&active.prediction){
   const actual=observed(after),expected=active.prediction;
   const fields=["active","prizes"].filter(k=>expected[k]!==actual[k]);
   if(fields.length){active.deviations.push({round:after.round,action,fields,expected,actual,category:"opponent_state_change"});close("invalidated","Opponent changed "+fields.join(" and "),actual);}
   else{active.completed.push({action:"predictionMatched",round:after.round});active.prediction=null;}
  }
 }
 return {next,applied,onChange,reset(){close("reset","New game started");},get active(){return active;},get archive(){return archive;},export(){return JSON.stringify({version:1,active,archive},null,2);}};
}
