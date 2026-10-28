// Read-only plan timeline. Uses DOM nodes rather than injecting plan text as HTML.
const label=step=>step.action==="attack"?"Attack "+(step.payload?.index??0):step.action==="play"?(step.payload?.target==="bench"?"Bench Pokémon":step.payload?.target==="active"?"Attach / set Active":"Play card"):step.action==="attackOrEnd"?"Attack / End":step.action==="predictionMatched"?"Prediction matched":step.action;
export function renderPlanGraph(root,planner){
 if(!root)return;
 root.replaceChildren();
 const legend=document.createElement("div");legend.className="plan-legend";
 for(const [cls,title] of [["done","Completed"],["pending","Planned"],["matched","Predicted"],["tolerated","Immaterial"],["invalidated","Deviation"]]){const item=document.createElement("span");item.className="plan-key "+cls;item.textContent=title;legend.append(item);}
 root.append(legend);
 const plans=[...planner.archive.slice(-5),...(planner.active?[planner.active]:[])].reverse();
 if(!plans.length){const p=document.createElement("p");p.textContent="No plans yet. Enable AI Player 2 to begin.";root.append(p);return;}
 for(const plan of plans){
  const group=document.createElement("section");group.className="plan-group";
  const head=document.createElement("div");head.className="plan-group-head";head.textContent=plan.id+" · "+plan.goal+" · "+plan.status;group.append(head);
  const flow=document.createElement("div");flow.className="plan-flow";
  const nodes=[];
  for(const step of plan.completed||[]){
   if(step.action==="predictionMatched")nodes.push({type:"opponent",status:"matched",label:"P1 as predicted",detail:"Opponent checkpoint matched"});
   else nodes.push({type:"action",status:"done",label:label(step),detail:step.why||step.action});
  }
  for(const event of plan.checkpoints||[])nodes.push({type:"opponent",status:event.status,label:event.status==="invalidated"?"P1 deviation":event.status==="tolerated"?"P1 immaterial":"P1 predicted",detail:event.reason||event.fields?.join(", ")||"Opponent checkpoint"});
  if(plan.deviations?.length&&!(plan.checkpoints||[]).some(x=>x.status==="invalidated"))for(const d of plan.deviations)nodes.push({type:"opponent",status:"invalidated",label:"P1 deviation",detail:d.fields?.join(", ")||d.category});
  if(plan.prediction)nodes.push({type:"opponent",status:"pending",label:"Await P1",detail:plan.predictionMeaning||"Pending opponent turn"});
  for(const step of plan.actions||[])nodes.push({type:"action",status:"pending",label:label(step),detail:step.why||step.action});
  if(!nodes.length)nodes.push({type:"action",status:"done",label:"Plan finished",detail:plan.reason||""});
  for(const [i,node] of nodes.entries()){
   if(i){const line=document.createElement("span");line.className="plan-line";flow.append(line);}
   const el=document.createElement("div");el.className="plan-node "+node.type+" "+node.status;el.title=node.detail;
   const shape=document.createElement("span");shape.className="plan-shape";shape.textContent=node.type==="opponent"?"P1":String(i+1);el.append(shape);
   const caption=document.createElement("span");caption.className="plan-node-label";caption.textContent=node.label;el.append(caption);flow.append(el);
  }
  group.append(flow);
  if(plan.reason){const note=document.createElement("p");note.className="plan-reason";note.textContent=plan.reason;group.append(note);}
  root.append(group);
 }
}
