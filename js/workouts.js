import {all,put,remove} from "./db.js";import {getExercises,makeSession} from "./data.js";
export async function sessions(){return(await all("sessions")).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt)}
export const saveSession=s=>{s.updatedAt=Date.now();return put("sessions",s)};export const deleteSession=id=>remove("sessions",id);
export async function previousPerformance(exId,date){for(const s of await sessions())if(s.date<date){const e=s.exercises.find(x=>x.id===exId);if(e&&e.sets.some(x=>x.completed))return{session:s,exercise:e}}return null}
export async function startFromPrevious(group,name,ids){const defs=(await getExercises()).filter(x=>x.group===group&&ids.includes(x.id));const last=(await sessions()).find(s=>s.group===group);return makeSession(group,name,defs,last?.exercises||[])}
