// Next-move finder: asks the engine which actions are legal right now and turns the best one into an instruction.
const RESEARCH="Professor's Research";

// main.js injects the engine and card helpers so legality probes run against the same modules the game uses.
let species,canPay,retreatCost,dispatch;
export function configure(deps){({species,canPay,retreatCost,dispatch}=deps);}

// Probe an action against a copy of the state; the engine never mutates its input.
function probe(state,action,payload,handIndex){
let base={...state,selection:null};
if(handIndex!==undefined){const picked=dispatch(base,"select",{index:handIndex});if(picked.error)return picked;base=picked.state;}
return dispatch(base,action,payload);
}
const legal=(state,action,payload,handIndex)=>!probe(state,action,payload,handIndex).error;

const boardTargets=player=>[{target:"active",slot:undefined,mon:player.active},...player.bench.map((mon,slot)=>({target:"bench",slot,mon}))].filter(entry=>entry.mon);
const payableAttacks=mon=>(mon.attacks||[]).map((attack,index)=>({attack,index})).filter(entry=>canPay(mon.energies,entry.attack.cost));
const strongestPayable=mon=>payableAttacks(mon).filter(entry=>entry.attack.damage>0).sort((left,right)=>right.attack.damage-left.attack.damage)[0]||null;

function energyTarget(player,energyType){
const candidates=boardTargets(player);
// Prefer the Pokémon this Energy unlocks a damaging attack for, Active first.
for(const entry of candidates){
const before=payableAttacks(entry.mon).some(item=>item.attack.damage>0);
const after=(entry.mon.attacks||[]).some(attack=>attack.damage>0&&canPay([...entry.mon.energies,energyType],attack.cost));
if(!before&&after)return {...entry,reason:` so it can attack`};
}
const activeNeedsMore=player.active&&(player.active.attacks||[]).some(attack=>attack.damage>0&&!canPay(player.active.energies,attack.cost));
if(activeNeedsMore)return {target:"active",slot:undefined,mon:player.active,reason:" to build toward its attack"};
const leastChargedBench=candidates.filter(entry=>entry.target==="bench").sort((left,right)=>left.mon.energies.length-right.mon.energies.length)[0];
if(leastChargedBench)return {...leastChargedBench,reason:" so your next attacker is ready when it's needed"};
return candidates[0]?{...candidates[0],reason:""}:null;
}

function handOptions(state){
const player=state.players[state.turn],hand=player.hand,options=[],unsupported=[];
hand.forEach((card,index)=>{
if(card.kind==="pokemon"){
const definition=species[card.species];
if(!definition){unsupported.push(card.name||"That Pokémon");return;}
if(!definition.stage){
if(state.phase==="setup"&&!player.active&&legal(state,"play",{target:"active"},index))options.push({index,priority:100,text:`Tap ${definition.name} in your hand, then tap the empty Active slot to make it your starting Pokémon.`});
else if(legal(state,"play",{target:"bench",slot:player.bench.length},index))options.push({index,priority:70,text:`Bench ${definition.name}: tap it, then tap an empty Bench slot. More Pokémon in play means more options and a safety net if your Active falls.`});
return;
}
const target=boardTargets(player).find(entry=>legal(state,"play",{target:entry.target,slot:entry.slot},index));
if(target)options.push({index,priority:85,text:`Evolve ${target.mon.name} into ${definition.name}: tap ${definition.name} in your hand, then tap ${target.mon.name}. Damage and Energy carry over.`});
return;
}
if(card.kind==="energy"){
if(state.phase!=="playing")return;
const target=energyTarget(player,card.type);
if(target&&legal(state,"play",{target:target.target,slot:target.slot},index))options.push({index,priority:60,text:`Attach ${card.type} Energy to ${target.mon.name}${target.reason}: tap the Energy, then tap ${target.mon.name}. You get one attachment per turn, so don't end the turn without it.`});
return;
}
if(card.kind!=="trainer")return;
if(state.phase!=="playing")return;
if(card.name==="Potion"){
const target=boardTargets(player).filter(entry=>entry.mon.damage>0).sort((left,right)=>right.mon.damage-left.mon.damage).find(entry=>legal(state,"trainer",{target:entry.target,slot:entry.slot},index));
if(target)options.push({index,priority:65,text:`Heal ${target.mon.name} with Potion (removes 30 damage): tap Potion, then tap ${target.mon.name}.`});
return;
}
if(card.name===RESEARCH){
if(!legal(state,"trainer",{},index))return;
const others=hand.length-1;
options.push({index,priority:others<=3?75:40,text:`Play Professor's Research: tap it, then press Play Trainer. You discard your other ${others} card${others===1?"":"s"} and draw 7. ${others<=3?"With this few cards left it's the right time.":"Play out the cards you still need first."}`});
return;
}
if(card.name==="Quick Ball"||card.name==="Ultra Ball"){
const required=card.name==="Quick Ball"?1:2;
const others=[...hand.keys()].filter(otherIndex=>otherIndex!==index);
if(others.length<required||!legal(state,"trainer",{discardIndices:others.slice(-required),searchIndex:null},index))return;
options.push({index,priority:player.bench.length<5?72:30,text:`Use ${card.name}: tap it, press Play Trainer, choose ${required} other card${required===1?"":"s"} to discard, then pick ${card.name==="Quick Ball"?"a Basic Pokémon":"any Pokémon"} from your deck to add to your hand.`});
return;
}
if(card.name==="Air Balloon"){
const target=boardTargets(player).filter(entry=>!entry.mon.tool).sort((left,right)=>retreatCost(right.mon)-retreatCost(left.mon)).find(entry=>legal(state,"trainer",{target:entry.target,slot:entry.slot},index));
if(target)options.push({index,priority:50,text:`Attach Air Balloon to ${target.mon.name}: tap it, then tap ${target.mon.name}. Its retreat will cost 2 less Energy.`});
return;
}
const result=probe(state,"trainer",{},index);
if(result.error==="Unsupported Trainer."||result.error?.includes(" is not implemented yet."))unsupported.push(card.name);
else if(result.error&&!result.error.startsWith("Only one Supporter"))options.push({index,priority:45,text:`Play ${card.name}: tap it, press Play Trainer and follow the prompt to choose its targets.`});
else if(!result.error)options.push({index,priority:48,text:`Play ${card.name}: tap it, then press Play Trainer. ${card.subtype==="Supporter"?"It's your one Supporter for this turn.":"Items are free to play, so use them before you attack."}`});
});
return {options,unsupported};
}

function boardOptions(state){
const player=state.players[state.turn],opponent=state.players[1-state.turn],options=[];
if(state.phase!=="playing")return options;
for(const entry of boardTargets(player)){
if(entry.mon.ability&&!entry.mon.abilityUsed&&legal(state,"ability",{target:entry.target,slot:entry.slot,discard:false}))options.push({index:null,priority:78,text:`Use ${entry.mon.name}'s ${entry.mon.ability.name}: tap ${entry.mon.name} on the board, then press "Use ${entry.mon.ability.name}". Abilities are free and don't end your turn.`});
}
const active=player.active;
if(!active||!opponent.active)return options;
const strongest=strongestPayable(active);
if(strongest&&legal(state,"attack",{index:strongest.index})){
const knockout=strongest.attack.damage>=Math.max(0,opponent.active.hp-(opponent.active.damage||0));
options.push({index:null,priority:knockout?95:55,button:"attack",text:knockout?`Attack with ${strongest.attack.name}: ${strongest.attack.damage} damage Knocks Out ${opponent.active.name}. Press Attack${active.attacks.length>1?" and choose "+strongest.attack.name:""}.`:`Attack with ${strongest.attack.name} for ${strongest.attack.damage} damage: press Attack${active.attacks.length>1?" and choose "+strongest.attack.name:""}. Attacking ends your turn, so do everything else first.`});
}else{
const utility=payableAttacks(active).find(entry=>entry.attack.damage===0&&entry.attack.effect!=="pickAndStick");
if(utility&&legal(state,"attack",{index:utility.index}))options.push({index:null,priority:50,button:"attack",text:`Use ${utility.attack.name}: press Attack${active.attacks.length>1?" and choose "+utility.attack.name:""}. It does no damage but sets you up. Attacking ends your turn.`});
}
const threat=strongestPayable(opponent.active);
const benchAttacker=player.bench.find(mon=>strongestPayable(mon));
if(threat&&threat.attack.damage>=Math.max(0,active.hp-(active.damage||0))&&benchAttacker&&legal(state,"retreat",{}))options.push({index:null,priority:82,button:"retreat",text:`${active.name} would be Knocked Out by ${opponent.active.name}'s next attack. Press Retreat, then tap ${benchAttacker.name} to switch it in.`});
return options;
}

export function nextMove(state){
const player=state.players[state.turn];
if(state.winner!==null)return null;
if(state.phase==="replacement"){
const ready=player.bench.find(mon=>strongestPayable(mon));
return {text:`Your Active was Knocked Out. Tap a Benched Pokémon to promote it${ready?`: ${ready.name} can attack right away`:""}. Check its Retreat Cost first: you may want to switch out later.`,playable:[],focus:null,button:null};
}
if(state.phase==="retreat")return {text:"Tap the Benched Pokémon you want to switch in. The Energy for the Retreat Cost is discarded from the Pokémon that leaves.",playable:[],focus:null,button:null};
const {options,unsupported}=handOptions(state);
options.push(...boardOptions(state));
options.sort((left,right)=>right.priority-left.priority);
const playable=options.map(option=>option.index).filter(index=>index!==null);
const note=unsupported.length?` ${[...new Set(unsupported)].join(", ")} can't be played in this prototype yet.`:"";
if(state.phase==="setup"){
if(options.length)return {text:options[0].text,playable,focus:options[0].index,button:null};
return {text:`Nothing else to play during setup: Energy and Trainers wait until the game starts.${note} Press Ready.`,playable,focus:null,button:"ready"};
}
if(options.length)return {text:options[0].text+note,playable,focus:options[0].index,button:options[0].button||null};
const firstTurn=state.turn===0&&state.round===1;
return {text:`${firstTurn?"The player who goes first can't attack on turn one, and you have":"You have"} no moves left this turn.${note} Press End Turn.`,playable,focus:null,button:"end"};
}
