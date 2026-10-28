import test from "node:test";
import assert from "node:assert/strict";
import {parseLimitless} from "../src/limitless-import.js";
const catalog=[{id:"charmander-mew-4",name:"Charmander",card:{set:"MEW",number:"004/165"}},{id:"rare-candy-svi-191",name:"Rare Candy",card:{set:"SVI",number:"191/198"}}];
test("identifies exact printings and 60-card totals",()=>{
 const result=parseLimitless("Pokémon: 1\n4 Charmander MEW 4\nTrainer: 1\n56 Rare Candy SVI 191\nTotal Cards: 60",catalog);
 assert.equal(result.ok,true);assert.equal(result.counts["charmander-mew-4"],4);
});
test("does not substitute unresolved printings",()=>{
 const result=parseLimitless("60 Charmander MEW 5",catalog);
 assert.equal(result.ok,false);assert.deepEqual(result.counts,{});assert.match(result.errors.join(" "),/not in playable catalog/);
});
test("rejects incomplete totals and malformed lines",()=>{
 const result=parseLimitless("4 Charmander MEW 4\nnot a card",catalog);
 assert.equal(result.ok,false);assert.match(result.errors.join(" "),/unrecognized card row/);
});
test("rejects conflicting totals",()=>{
 const result=parseLimitless("60 Charmander MEW 4\nTotal Cards: 59",catalog);
 assert.equal(result.ok,false);assert.match(result.errors.join(" "),/differs/);
});
