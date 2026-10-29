// Pure coach logic: derive a context from game state, pick tips, track turns, review the game. No DOM.
import {TIPS,REVIEW_RULES,CLEAN_GAME,SOURCES} from "./coach_knowledge.js?v=62";

// main.js injects its own card helpers so the coach shares the live species registry instead of importing a second copy.
let species,canPay,retreatCost;
export function configure(deps){({species,canPay,retreatCost}=deps);}

const RESEARCH="Professor's Research";
const isEx=name=>typeof name==="string"&&name.endsWith(" ex");

function bestPayableAttack(mon){
if(!mon)return null;
let best=null;
for(const attack of mon.attacks||[]){
if(!canPay(mon.energies||[],attack.cost))continue;
if(!best||attack.damage>best.damage)best=attack;
}
return best;
}

function maxThreat(mons){
let max=0;
for(const mon of mons){const attack=bestPayableAttack(mon);if(attack&&attack.damage>max)max=attack.damage;}
return max;
}

function cheapestDamagingCost(mon){
let cheapest=Infinity;
for(const attack of mon.attacks||[])if(attack.damage>0&&attack.cost.length<cheapest)cheapest=attack.cost.length;
return cheapest;
}

function playableEvolutions(player,round){
const boardMons=[player.active,...player.bench].filter(Boolean);
const result=[];
for(const card of player.hand){
if(card.kind!=="pokemon")continue;
const evolution=species[card.species];
if(!evolution.stage)continue;
const target=boardMons.find(mon=>mon.name===evolution.evolvesFrom&&mon.playedTurn!==round&&!mon.evolvedThisTurn);
if(target)result.push({name:evolution.name,from:target.name});
}
return result;
}

// Name of a Stage 1 whose Basic is on the board but no copy is anywhere the player can see.
function missingEvolutionFor(player){
const boardNames=[player.active,...player.bench].filter(Boolean).map(mon=>mon.name);
const visible=new Set([...player.hand,...player.discard].filter(card=>card.kind==="pokemon").map(card=>species[card.species].name));
for(const candidate of species){
if(!candidate.stage||!boardNames.includes(candidate.evolvesFrom)||visible.has(candidate.name))continue;
if(!player.deck.some(card=>card.kind==="pokemon"&&species[card.species].name===candidate.name))return candidate.name;
}
return null;
}

export function buildContext(state,extras={}){
const turn=state.turn,player=state.players[turn],opponent=state.players[1-turn];
const hand=player.hand;
const basicsInHand=hand.filter(card=>card.kind==="pokemon"&&!species[card.species].stage);
const trainerNames=hand.filter(card=>card.kind==="trainer").map(card=>card.name);
const energyInHand=hand.filter(card=>card.kind==="energy").length;
const hasResearch=trainerNames.includes(RESEARCH);
const evolutions=playableEvolutions(player,state.round);
const active=player.active,oppActive=opponent.active;
const bestAttack=bestPayableAttack(active);
const isFirstPlayerFirstTurn=turn===0&&state.round===1;
const canAttackNow=state.phase==="playing"&&!isFirstPlayerFirstTurn&&!!bestAttack&&!!oppActive;
const oppHpLeft=oppActive?Math.max(0,oppActive.hp-(oppActive.damage||0)):0;
const lethal=canAttackNow&&bestAttack.damage>0&&bestAttack.damage>=oppHpLeft;
const oppThreat=maxThreat([oppActive]);
const activeHp=active?Math.max(0,active.hp-(active.damage||0)):0;
const activeInKORange=!!active&&oppThreat>0&&oppThreat>=activeHp;
const bench=player.bench;
return {
error:extras.error||"",ended:extras.ended||null,lastTurnRetreated:!!extras.lastTurnRetreated,justAttached:!!extras.justAttached,
playerLabel:`Player ${turn+1}`,phase:state.phase,round:state.round,
isFirstPlayerFirstTurn,isOwnFirstTurn:(turn===0&&state.round===1)||(turn===1&&state.round===2),isSecondPlayer:turn===1,
mulligans:player.mulligans,
handSize:hand.length,basicsInHand:basicsInHand.length,exBasicsInHand:basicsInHand.filter(card=>isEx(species[card.species].name)).length,
energyInHand,hasResearch,hasBallSearch:trainerNames.includes("Quick Ball")||trainerNames.includes("Ultra Ball"),
unusedAbility:state.phase==="playing"&&player.deck.length>0?[active,...bench].find(mon=>mon&&mon.ability&&!mon.abilityUsed)?.name||"":"",
nonResearchHand:hand.filter(card=>card.name!==RESEARCH).length,
usefulCards:energyInHand+evolutions.length+basicsInHand.length,
evolutions,missingEvolution:missingEvolutionFor(player),
benchCount:bench.length,
benchZeroEnergy:bench.some(mon=>!mon.energies.length),
benchCanAttack:bench.some(mon=>{const attack=bestPayableAttack(mon);return !!attack&&attack.damage>0;}),
benchCheapAttacker:bench.some(mon=>cheapestDamagingCost(mon)<=1),
active:active?{name:active.name,energyCount:active.energies.length,cheapestCost:cheapestDamagingCost(active),isEx:isEx(active.name)}:null,
bestAttack:bestAttack?{name:bestAttack.name,damage:bestAttack.damage}:null,
canAttackNow,lethal,
oppActive:oppActive?{name:oppActive.name,hpLeft:oppHpLeft,isEx:isEx(oppActive.name)}:null,
activeInKORange,
exposedAfterKO:lethal&&maxThreat(opponent.bench)>=activeHp,
potionBreaksKO:trainerNames.includes("Potion")&&!!active&&active.damage>0&&activeInKORange&&oppThreat<Math.min(active.hp,activeHp+30),
myPrizes:player.prizes,oppPrizes:opponent.prizes,prizeLead:opponent.prizes-player.prizes,
deckSize:player.deck.length,attached:player.attached,supporterUsed:player.supporterUsed,retreated:player.retreated,
retreatAffordable:!!active&&bench.length>0&&!player.retreated&&active.energies.length>=retreatCost(active),
replacementChoicesDiffer:state.phase==="replacement"&&new Set(bench.map(retreatCost)).size>1
};
}

// keepId: a once-only tip currently on screen stays eligible so it isn't yanked mid-read.
export function advise(ctx,seenOnce,dismissed,keepId){
const tips=[];
for(const tip of TIPS){
const phases=tip.phases||["playing"];
if(!phases.includes(ctx.phase)&&!(ctx.ended&&tip.id.startsWith("tip-ended")))continue;
if(tip.once&&seenOnce.has(tip.id)&&tip.id!==keepId)continue;
if(dismissed.has(tip.id))continue;
let applies=false;
try{applies=!!tip.when(ctx);}catch(problem){console.warn("coach tip",tip.id,problem);}
if(!applies)continue;
const source=SOURCES[tip.source];
tips.push({id:tip.id,kind:tip.kind,once:!!tip.once,priority:tip.priority,title:tip.title,text:typeof tip.text==="function"?tip.text(ctx):tip.text,source:{name:source.name,url:source.url}});
}
tips.sort((left,right)=>right.priority-left.priority);
return tips.slice(0,5);
}

export function summarizeTurn(prevState,action,nextState){
const ctx=buildContext(prevState);
const prevPlayer=prevState.players[prevState.turn];
const attacked=action==="attack";
const tookKO=attacked&&(nextState.phase==="replacement"||(nextState.winner===prevState.turn));
const deckOut=nextState.winner!==null&&nextState.winner!==prevState.turn&&nextState.winReason==="deck out";
return {
player:prevState.turn,playerLabel:ctx.playerLabel,round:prevState.round,
missedAttach:!prevPlayer.attached&&ctx.energyInHand>0,
missedAttack:ctx.canAttackNow&&ctx.bestAttack.damage>0&&!attacked,
attackName:ctx.bestAttack?ctx.bestAttack.name:"",
missedLethal:ctx.lethal&&!tookKO,
basicsInHand:ctx.basicsInHand,benchCount:ctx.benchCount,
researchHeldOnLowHand:ctx.hasResearch&&!prevPlayer.supporterUsed&&ctx.nonResearchHand<=2&&!ctx.isFirstPlayerFirstTurn,
retreated:prevPlayer.retreated,deckOut
};
}

export function lastTurnOf(tracker,playerIndex){
for(let index=tracker.turns.length-1;index>=0;index--)if(tracker.turns[index].player===playerIndex)return tracker.turns[index];
return null;
}

export function review(tracker){
return [0,1].map(playerIndex=>{
const turns=tracker.turns.filter(turn=>turn.player===playerIndex);
const findings=[];
for(const rule of REVIEW_RULES){
const count=rule.detect(turns);
if(!count)continue;
const source=SOURCES[rule.source];
findings.push({id:rule.id,text:rule.text(count),source:{name:source.name,url:source.url}});
}
return {player:playerIndex,playerLabel:`Player ${playerIndex+1}`,turns:turns.length,findings,clean:findings.length===0?CLEAN_GAME:""};
});
}
