// Lightweight two-player prototype; intentionally not a complete official TCG rules engine.
const species=[
{name:"Pikachu ex",hp:200,attack:60,id:25},
{name:"Armarouge ex",hp:260,attack:70,id:936},
{name:"Pikachu",hp:70,attack:20,id:25},
{name:"Charcadet",hp:70,attack:20,id:935},
{name:"Eevee",hp:70,attack:20,id:133},
{name:"Growlithe",hp:80,attack:30,id:58}
];
const pokemon=(i)=>({...species[i],damage:0,energy:0});
const basic=(i)=>({kind:"pokemon",species:i});
const energy=()=>({kind:"energy",name:"Basic Energy"});
const trainer=()=>({kind:"trainer",name:"Trainer (coming soon)"});
function player(i){
const base=i===0?2:3;
const hand=[basic(base),basic(4),basic(5),energy(),energy(),energy(),trainer()];
const deck=[...Array.from({length:17},(_,n)=>basic([base,4,5][n%3])),...Array.from({length:17},energy),...Array.from({length:16},trainer)];
return {hand,deck,discard:[],active:pokemon(i),bench:[],prizes:6,attached:false};
}
export function newGame(){return {players:[player(0),player(1)],turn:0,round:1,winner:null,log:["Game started. Active Pokémon are preselected."],selection:null};}
const err=(state,error)=>({state,error});
export function dispatch(state,action,payload={}){
if(action==="reset")return {state:newGame()};
if(state.winner!==null)return err(state,"Game is over.");
const s=structuredClone(state),p=s.players[s.turn],o=s.players[1-s.turn];
let message="";
if(action==="select"){
const idx=payload.index;
if(!Number.isInteger(idx)||idx<0||idx>=p.hand.length)return err(state,"Select a card in your hand.");
s.selection=s.selection===idx?null:idx;
return {state:s};
}
if(action==="play"){
const idx=s.selection,card=p.hand[idx];
if(!card)return err(state,"Select a card from your hand first.");
if(card.kind==="trainer")return err(state,"Trainer card effects aren't implemented yet.");
if(card.kind==="pokemon"){
if(payload.target!=="bench")return err(state,"Basic Pokémon must be played to the Bench.");
if(p.bench.length>=5)return err(state,"Your Bench is full.");
p.bench.push(pokemon(card.species));message="Benched "+species[card.species].name+".";
}else if(card.kind==="energy"){
if(p.attached)return err(state,"You can attach only one Energy per turn.");
const target=payload.target==="active"?p.active:payload.target==="bench"&&Number.isInteger(payload.slot)?p.bench[payload.slot]:null;
if(!target)return err(state,"Tap your Active Pokémon or a Benched Pokémon to attach Energy.");
target.energy++;p.attached=true;message="Attached Energy to "+target.name+".";
}else return err(state,"Unsupported card.");
p.hand.splice(idx,1);s.selection=null;
}else if(action==="attack"){
if(p.active.energy<1)return err(state,"Your Active Pokémon needs at least one Energy.");
o.active.damage+=p.active.attack;message=p.active.name+" dealt "+p.active.attack+" damage.";
if(o.active.damage>=o.active.hp){
p.prizes--;o.discard.push({kind:"pokemon",species:o.active.id});message+=" Knockout! Prize taken.";
if(p.prizes===0||o.bench.length===0){s.winner=s.turn;message+=" Game over!";}
else o.active=o.bench.shift();
}
if(s.winner===null)next(s);
}else if(action==="end"){next(s);message="Turn ended.";}
else if(action==="bench"){
const idx=p.hand.findIndex(c=>c.kind==="pokemon");if(idx<0)return err(state,"No Basic Pokémon in hand.");
if(p.bench.length>=5)return err(state,"Bench full.");
p.bench.push(pokemon(p.hand[idx].species));p.hand.splice(idx,1);message="Benched a Basic Pokémon.";
}else if(action==="energy"){
const idx=p.hand.findIndex(c=>c.kind==="energy");if(idx<0)return err(state,"No Energy in hand.");
if(p.attached)return err(state,"Already attached Energy this turn.");
p.hand.splice(idx,1);p.active.energy++;p.attached=true;message="Attached Energy to Active Pokémon.";
}else return err(state,"Unknown action.");
s.log.unshift("Player "+(state.turn+1)+": "+message);return {state:s};
}
function next(s){s.turn=1-s.turn;s.round++;s.selection=null;s.players[s.turn].attached=false;
if(s.players[s.turn].deck.length)s.players[s.turn].hand.push(s.players[s.turn].deck.shift());
else{s.winner=1-s.turn;s.log.unshift("Deck out!");}}
export function cardInfo(card){if(card.kind==="pokemon")return {...species[card.species],kind:"pokemon"};return card;}
