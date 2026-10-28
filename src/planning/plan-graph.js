// Read-only plan timeline. Uses DOM nodes rather than injecting plan text as HTML.
const label=step=>step.action==="attack"?"Attack "+(step.payload?.index??0):step.action==="play"?(step.payload?.target==="bench"?"Bench Pokémon":step.payload?.target==="active"?"Attach / set Active":"Play card"):step.action==="attackOrEnd"?"Attack / End":step.action==="predictionMatched"?"Prediction matched":step.action;
let selectedNode=null;
export function renderPlanGraph(root,planner){
 if(!root)return;
 root.replaceChildren();
 const legend=document.createElement("div");legend.className="plan-legend";
 for(const [cls,title] of [["done","Completed"],["pending","Planned"],["matched","Predicted"],["tolerated","Immaterial"],["invalidated","Deviation"]]){const item=document.createElement("span");item.className="plan-key "+cls;item.textContent=title;legend.append(item);}
 root.append(legend);
 const plans=[...planner.archive.slice(-5),...(planner.active?[planner.active]:[])].reverse();
 const details=document.createElement("section");details.className="plan-inspector";details.setAttribute("aria-live","polite");
 const inspect=(key,node,plan)=>{selectedNode=key;details.replaceChildren();const title=document.createElement("h4");title.textContent=(node.type==="opponent"?"Opponent checkpoint: ":"AI action: ")+node.label;details.append(title);const summary=document.createElement("p");summary.textContent=node.detail||"No additional explanation recorded.";details.append(summary);const meta=document.createElement("p");meta.textContent="Plan "+plan.id+" · "+node.status+" · "+(node.type==="opponent"?"Player 1":"Player 2");details.append(meta);if(node.data){const pre=document.createElement("pre");pre.textContent=JSON.stringify(node.data,null,2);details.append(pre);}root.querySelectorAll(".plan-node.selected").forEach(x=>x.classList.remove("selected"));root.querySelectorAll(".plan-node").forEach(x=>{if(x.dataset.nodeKey===key)x.classList.add("selected");});};
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
   const caption=document.createElement("span");caption.className="plan-node-label";caption.textContent=node.label;el.append(caption);flow.append(el);if(selectedNode===key)queueMicrotask(()=>inspect(key,node,plan));
  }
  group.append(flow);
  if(plan.reason){const note=document.createElement("p");note.className="plan-reason";note.textContent=plan.reason;group.append(note);}
  root.append(group);
 }
 root.append(details);
 if(!selectedNode){const p=document.createElement("p");p.textContent="Tap any action circle or opponent square to inspect its details.";details.append(p);}
}
