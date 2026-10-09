import {EXERCISES} from "../data/exercises.js";
import {all} from "./db.js";

export async function getExercises(){
  const custom=await all("exercises");
  const overrides=new Map(custom.map(x=>[x.id,x]));
  const base=EXERCISES.map(x=>overrides.has(x.id)?{...x,...overrides.get(x.id)}:x);
  const customOnly=custom.filter(x=>!EXERCISES.some(b=>b.id===x.id));
  return [...base,...customOnly];
}
export async function getExercise(id){const list=await getExercises();return list.find(x=>x.id===id)}
export function uid(p="id"){return `${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`}
export function makeSet(n=1,p={}){return{id:uid("set"),number:n,weight:p.weight??"",reps:p.reps??"",rir:p.rir??"",completed:false,type:"working"}}
export function makeExercise(def,prev){const ps=prev?.sets||[];return{id:def.id,name:def.name,primary:def.primary,secondary:def.secondary,subgroup:def.subgroup,equip:def.equip,restSeconds:def.restSeconds??90,notes:def.notes??"",sets:ps.length?ps.map((s,i)=>({...makeSet(i+1,s),completed:false})): [1,2,3].map(n=>makeSet(n))}}
export function makeSession(group,name,defs,previous=[]){return{id:uid("session"),date:new Date().toISOString().slice(0,10),group,name:name||"Entrenamiento",createdAt:Date.now(),updatedAt:Date.now(),status:"active",notes:"",exercises:defs.map(d=>makeExercise(d,previous.find(x=>x.id===d.id))) }}
