// Simplified playable prototype. Not yet a full official Pokemon TCG implementation.
export const profiles=[{name:"Pikachu ex",hp:200,attack:60},{name:"Armarouge ex",hp:260,attack:70}];
function player(i){const hand=[...Array(4).fill("Basic"),...Array(3).fill("Energy")];return {hand,deck:[...Array(20).fill("Basic"),...Array(17).fill("Energy"),...Array(16).fill("Trainer")],active:{...profiles[i],damage:0,energy:0},bench:[],prizes:6,attached:false};}
export function newGame(){return {players:[player(0),player(1)],turn:0,round:1,winner:null,log:["Game started. Active Pokémon are preselected."]};}
export function dispatch(state,action){if(action==="reset")return {state:newGame()};if(state.winner!==null)return {state,error:"Game is over."};const s=structuredClone(state),p=s.players[s.turn],o=s.players[1-s.turn];let message="";
if(action==="bench"){const n=p.hand.indexOf("Basic");if(n<0)return {state,error:"No Basic Pokémon in hand."};if(p.bench.length>=5)return {state,error:"Bench full."};p.hand.splice(n,1);p.bench.push({name:"Basic Pokémon",hp:70,damage:0,energy:0});message="Benched a Basic Pokémon.";}
else if(action==="energy"){const n=p.hand.indexOf("Energy");if(n<0)return {state,error:"No Energy in hand."};if(p.attached)return {state,error:"Already attached Energy this turn."};p.hand.splice(n,1);p.active.energy++;p.attached=true;message="Attached Energy.";}
else if(action==="attack"){if(p.active.energy===0)return {state,error:"Active Pokémon needs Energy."};o.active.damage+=p.active.attack;message=`${p.active.name} dealt ${p.active.attack} damage.`;if(o.active.damage>=o.active.hp){p.prizes--;message+=" Knockout! Prize taken.";if(p.prizes===0||o.bench.length===0){s.winner=s.turn;message+=" Game over!";}else{o.active=o.bench.shift();}}if(s.winner===null)next(s);}
else if(action==="end"){next(s);message="Turn ended.";}
else return {state,error:"Unknown action."};s.log.unshift(`Player ${state.turn+1}: ${message}`);return {state:s};}
function next(s){s.turn=1-s.turn;s.round++;s.players[s.turn].attached=false;if(s.players[s.turn].deck.length)s.players[s.turn].hand.push(s.players[s.turn].deck.shift());else{s.winner=1-s.turn;s.log.unshift("Deck out!");}}
