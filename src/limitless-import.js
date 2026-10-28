// Parses Limitless / PTCGL-style exports without silently substituting printings.
export function parseLimitless(text, catalog) {
 const rows=[],errors=[];let declaredTotal=null;
 const lines=String(text).replace(/\r\n?/g,"\n").split("\n");
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();
  if(!line||/^(Pokémon|Pokemon|Trainer|Energy|Cards)\s*:\s*\d+$/i.test(line))continue;
  const total=line.match(/^Total\s+Cards\s*:\s*(\d+)$/i);
  if(total){declaredTotal=Number(total[1]);continue;}
  const m=line.match(/^(\d+)\s+(.+?)\s+([A-Z][A-Z0-9-]{1,7})\s+([A-Z0-9-]+)$/i);
  if(!m){errors.push(`Line ${i+1}: unrecognized card row: ${line}`);continue;}
  const quantity=Number(m[1]),name=m[2].trim(),set=m[3].toUpperCase(),number=m[4].toUpperCase();
  if(quantity<1||quantity>60){errors.push(`Line ${i+1}: invalid quantity ${quantity}`);continue;}
  rows.push({line:i+1,quantity,name,set,number});
 }
 const total=rows.reduce((n,r)=>n+r.quantity,0);
 if(declaredTotal!==null&&declaredTotal!==total)errors.push(`Declared total ${declaredTotal} differs from parsed ${total}.`);
 if(total!==60)errors.push(`Deck must contain 60 cards; parsed ${total}.`);
 const counts={};
 for(const row of rows){
  const matches=catalog.filter(c=>c.name.toLocaleLowerCase()===row.name.toLocaleLowerCase() &&
   String(c.card?.set||c.card?.printing?.split("-")[0]||"").toUpperCase()===row.set &&
   String(c.card?.number||"").replace(/^0+/,"").toUpperCase()===row.number.replace(/^0+/,"").toUpperCase());
  if(matches.length!==1){errors.push(`Line ${row.line}: ${row.name} ${row.set} ${row.number} ${matches.length?"ambiguous":"not in playable catalog"}; no replacement made.`);continue;}
  counts[matches[0].id]=(counts[matches[0].id]||0)+row.quantity;
 }
 return {rows,total,declaredTotal,counts,errors,ok:errors.length===0};
}
