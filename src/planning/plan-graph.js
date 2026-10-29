// Read-only plan timeline. Uses DOM nodes rather than injecting plan text as HTML.
const label=step=>step.action==="attack"?"Attack "+(step.payload?.index??0):step.action==="play"?(step.payload?.target==="bench"?"Bench Pokémon":step.payload?.target==="active"?"Attach / set Active":"Play card"):step.action==="attackOrEnd"?"Attack / End":step.action==="predictionMatched"?"Prediction matched":step.action;
let selectedNode=null;
export function renderPlanGraph(root,planner){
 if(!root)return;
 root.replaceChildren();
 const legend=document.createElement("div");legend.className="plan-legend";
 for(const [cls,title] of [["done","Completed"],["pending","Planned"],["matched","Predicted"],["tolerated","Immaterial"],["invalidated","Deviation"]]){const item=document.createElement("span");item.className="plan-key "+cls;item.textContent=title;legend.append(item);}
 root.append(legend);
 let selectedDetails=null;
 const plans=[...planner.archive.slice(-5),...(planner.active?[planner.active]:[])].reverse();
 const details=document.createElement("section");details.className="plan-inspector";details.setAttribute("aria-live","polite");
 const add=(tag,value)=>{const el=document.createElement(tag);el.textContent=value;details.append(el);return el;};
 const stateLines=(heading,s)=>{if(!s)return;add("h5",heading);for(const [key,value] of Object.entries(s)){const names={active:"Active Pokémon",activeHp:"Active HP",bench:"Bench size",prizes:"Prize cards"};add("p",(names[key]||key)+": "+(value===null?"None":value));}};
 const inspect=(key,node,plan)=>{
  selectedNode=key;details.replaceChildren();
  add("h4",(node.type==="opponent"?"Player 1: ":"Player 2: ")+node.label);
  add("p","Plan "+plan.id+" · "+(node.status==="done"?"Completed":node.status==="pending"?"Awaiting execution":node.status==="matched"?"As predicted":node.status==="invalidated"?"Material deviation":node.status==="tolerated"?"Immaterial difference":node.status));
  const d=node.data||{};
  if(node.type==="action"){
   const descriptions={play:"Play a card from hand",ready:"Finish setup",attack:"Use an attack",end:"End the turn",promote:"Promote a Benched Pokémon",attackOrEnd:"Choose the best available attack or end the turn"};
   add("p",node.detail||descriptions[d.action]||"Planned game action.");
   if(d.action==="play")add("p","Target: "+(d.payload?.target==="bench"?"Bench slot "+((d.payload?.slot??0)+1):d.payload?.target==="active"?"Active Pokémon":"Selected target"));
   if(d.action==="attack")add("p","Attack slot: "+((d.payload?.index??0)+1));
   if(Array.isArray(d.utility)&&d.utility.length){add("h5","Attacks considered");for(const candidate of d.utility)add("p","Attack "+(candidate.index+1)+": utility "+candidate.score+" — "+candidate.reason);}
   if(node.status==="pending")add("p","This action has not been executed yet.");
  }else if(node.status==="invalidated"){
   add("p",d.reason||"Player 1 changed a state the plan expected to remain unchanged.");
   if(d.fields?.length)add("p","Material changes: "+d.fields.join(", ")+". The AI must reconsider its plan.");
   stateLines("Predicted state",d.expected);stateLines("Observed state",d.actual);
  }else if(node.status==="matched"){add("p","The observed opponent state matched the plan's checked predictions. No replanning was required.");}
  else if(node.status==="tolerated"){add("p",d.reason||"An observed difference did not affect the plan, so it can continue.");stateLines("Predicted state",d.expected);stateLines("Observed state",d.actual);}
  else if(node.status==="pending"){add("p",d.meaning||node.detail||"Waiting to observe Player 1's turn.");stateLines("Expected opponent state",d.prediction);}
  else add("p",node.detail||"Opponent checkpoint.");
  root.querySelectorAll(".plan-node").forEach(x=>{const chosen=x.dataset.nodeKey===key;x.classList.toggle("selected",chosen);x.setAttribute("aria-pressed",String(chosen));});
 };
 if(!plans.length){const p=document.createElement("p");p.textContent="No plans yet. Enable AI Player 2 to begin.";root.append(p);return;}
 for(const plan of plans){
  const group=document.createElement("section");group.className="plan-group";
  const head=document.createElement("div");head.className="plan-group-head";head.textContent=plan.id+" · "+plan.goal+" · "+plan.status;group.append(head);
  const flow=document.createElement("div");flow.className="plan-flow";
  const nodes=[];
  for(const step of plan.completed||[]){
   if(step.action==="predictionMatched")nodes.push({type:"opponent",status:"matched",label:"P1 as predicted",detail:"Opponent checkpoint matched",data:step});
   else nodes.push({type:"action",status:"done",label:label(step),detail:step.why||step.action,data:step});
  }
  for(const event of plan.checkpoints||[])nodes.push({type:"opponent",status:event.status,label:event.status==="invalidated"?"P1 deviation":event.status==="tolerated"?"P1 immaterial":"P1 predicted",detail:event.reason||event.fields?.join(", ")||"Opponent checkpoint",data:event});
  if(plan.deviations?.length&&!(plan.checkpoints||[]).some(x=>x.status==="invalidated"))for(const d of plan.deviations)nodes.push({type:"opponent",status:"invalidated",label:"P1 deviation",detail:d.fields?.join(", ")||d.category,data:d});
  if(plan.prediction)nodes.push({type:"opponent",status:"pending",label:"Await P1",detail:plan.predictionMeaning||"Pending opponent turn",data:{prediction:plan.prediction,meaning:plan.predictionMeaning}});
  for(const step of plan.actions||[])nodes.push({type:"action",status:"pending",label:label(step),detail:step.why||step.action});
  if(!nodes.length)nodes.push({type:"action",status:"done",label:"Plan finished",detail:plan.reason||"",data:plan});
  for(const [i,node] of nodes.entries()){
   if(i){const line=document.createElement("span");line.className="plan-line";flow.append(line);}
   const el=document.createElement("button");el.type="button";el.className="plan-node "+node.type+" "+node.status;el.title=node.detail;const key=plan.id+":"+i;el.dataset.nodeKey=key;el.setAttribute("aria-label",node.label+" — "+node.detail);el.setAttribute("aria-pressed",String(selectedNode===key));el.addEventListener("click",()=>inspect(key,node,plan));
   const shape=document.createElement("span");shape.className="plan-shape";shape.textContent=node.type==="opponent"?"P1":String(i+1);el.append(shape);
   const caption=document.createElement("span");caption.className="plan-node-label";caption.textContent=node.label;el.append(caption);flow.append(el);if(selectedNode===key){el.classList.add("selected");selectedDetails={key,node,plan};}
  }
  group.append(flow);
  if(plan.reason){const note=document.createElement("p");note.className="plan-reason";note.textContent=plan.reason;group.append(note);}
  root.append(group);
 }
 root.append(details);
 if(selectedDetails)inspect(selectedDetails.key,selectedDetails.node,selectedDetails.plan);
 else {const p=document.createElement("p");p.textContent="Tap any action circle or opponent square to inspect its details.";details.append(p);}
}
