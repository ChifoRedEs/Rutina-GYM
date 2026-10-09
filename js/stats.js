export const setVolume=s=>Number(s.weight||0)*Number(s.reps||0);
export const sessionVolume=s=>s.exercises.reduce((n,e)=>n+e.sets.filter(x=>x.completed).reduce((a,x)=>a+setVolume(x),0),0);
export const completedSets=s=>s.exercises.reduce((n,e)=>n+e.sets.filter(x=>x.completed).length,0);
export const totalSets=s=>s.exercises.reduce((n,e)=>n+e.sets.length,0);
export const progress=s=>totalSets(s)?completedSets(s)/totalSets(s)*100:0;
export function prs(sessions){const r={};for(const s of sessions)for(const e of s.exercises)for(const x of e.sets){if(!x.completed)continue;const w=Number(x.weight||0);if(w&&(!r[e.id]||w>r[e.id].weight))r[e.id]={exercise:e.name,weight:w,reps:Number(x.reps||0),date:s.date}}return Object.values(r)}
export function weekly(sessions){const out={};for(const s of sessions){const d=new Date(s.date+"T12:00:00"),day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);const k=d.toISOString().slice(0,10);out[k]=(out[k]||0)+sessionVolume(s)}return out}
