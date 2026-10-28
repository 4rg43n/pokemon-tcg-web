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
function shuffle(cards){for(let i=cards.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];}return cards;}
function player(i){
 const base=i===0?2:3;
 const cards=shuffle([...Array.from({length:18},(_,n)=>basic([base,4,5][n%3])),...Array.from({length:22},energy),...Array.from({length:20},trainer)]);
 let hand=[],mulligans=0;
 do{if(hand.length)cards.push(...hand);shuffle(cards);hand=cards.splice(0,7);mulligans++;}while(!hand.some(c=>c.kind==="pokemon"));
 const prizes=cards.splice(0,6);
 return {hand,deck:cards,prizeCards:prizes,discard:[],active:null,bench:[],prizes:prizes.length,attached:false,mulligans:mulligans-1};
}
export function newGame(){const players=[player(0),player(1)];return {players,turn:0,round:1,phase:"setup",winner:null,log:["Each player: choose an Active Pokémon and optionally Bench Basics, then press Ready.","Shuffled 60-card decks and set six Prize cards per player."],selection:null};}
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
if(action==="ready"){
 if(s.phase!=="setup")return err(state,"Setup is already complete.");
 if(!p.active)return err(state,"Choose your Active Pokémon before pressing Ready.");
 s.selection=null;
 if(s.turn===0){s.turn=1;message="Player 1 ready. Player 2: choose your Active Pokémon and Bench.";}else{s.turn=0;s.phase="playing";message="Both players ready. Player 1 begins!";}
 s.log.unshift(message);return {state:s};
}
if(s.phase==="setup"&&action!=="play")return err(state,"Finish opening setup first.");
if(action==="play"){
const idx=s.selection,card=p.hand[idx];
if(!card)return err(state,"Select a card from your hand first.");
if(card.kind==="trainer")return err(state,"Trainer card effects aren't implemented yet.");
if(card.kind==="pokemon"){
if(payload.target==="active"&&s.phase==="setup"&&!p.active){p.active=pokemon(card.species);message="Chose "+p.active.name+" as Active Pokémon.";}
else if(payload.target==="bench"){if(!p.active)return err(state,"Choose your Active Pokémon first.");if(p.bench.length>=5)return err(state,"Your Bench is full.");p.bench.push(pokemon(card.species));message="Benched "+species[card.species].name+".";}
else return err(state,s.phase==="setup"?"Tap the empty Active slot or an empty Bench slot.":"Basic Pokémon must be played to the Bench.");
}else if(card.kind==="energy"){
if(p.attached)return err(state,"You can attach only one Energy per turn.");
const target=payload.target==="active"?p.active:payload.target==="bench"&&Number.isInteger(payload.slot)?p.bench[payload.slot]:null;
if(!target)return err(state,"Tap your Active Pokémon or a Benched Pokémon to attach Energy.");
target.energy++;p.attached=true;message="Attached Energy to "+target.name+".";
}else return err(state,"Unsupported card.");
p.hand.splice(idx,1);s.selection=null;
}else if(action==="attack"){
if(s.turn===0&&s.round===1)return err(state,"Player 1 cannot attack on the first turn.");
if(p.active.energy<1)return err(state,"Your Active Pokémon needs at least one Energy.");
o.active.damage+=p.active.attack;message=p.active.name+" dealt "+p.active.attack+" damage.";
if(o.active.damage>=o.active.hp){
const prizeCount=o.active.name.endsWith(" ex")?2:1;for(let n=0;n<prizeCount&&p.prizeCards.length;n++)p.hand.push(p.prizeCards.pop());p.prizes=p.prizeCards.length;o.discard.push({kind:"pokemon",species:species.findIndex(x=>x.name===o.active.name)});message+=" Knockout! "+prizeCount+" Prize card(s) taken.";
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
