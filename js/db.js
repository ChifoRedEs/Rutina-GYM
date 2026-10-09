const NAME="rutina-gym",VERSION=2;let promise;
export function openDB(){if(promise)return promise;promise=new Promise((resolve,reject)=>{const r=indexedDB.open(NAME,VERSION);r.onupgradeneeded=()=>{const d=r.result;
if(!d.objectStoreNames.contains("sessions")){const s=d.createObjectStore("sessions",{keyPath:"id"});s.createIndex("date","date",{unique:false})}
if(!d.objectStoreNames.contains("templates"))d.createObjectStore("templates",{keyPath:"id"});
if(!d.objectStoreNames.contains("exercises"))d.createObjectStore("exercises",{keyPath:"id"});
if(!d.objectStoreNames.contains("exerciseMedia"))d.createObjectStore("exerciseMedia",{keyPath:"id"});
if(!d.objectStoreNames.contains("settings"))d.createObjectStore("settings",{keyPath:"key"})};
r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return promise}
export async function put(store,v){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction(store,"readwrite");t.objectStore(store).put(v);t.oncomplete=()=>res(v);t.onerror=()=>rej(t.error)})}
export async function get(store,key){const d=await openDB();return new Promise((res,rej)=>{const r=d.transaction(store).objectStore(store).get(key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
export async function all(store){const d=await openDB();return new Promise((res,rej)=>{const r=d.transaction(store).objectStore(store).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)})}
export async function remove(store,key){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction(store,"readwrite");t.objectStore(store).delete(key);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
export async function clearStore(store){const d=await openDB();return new Promise((res,rej)=>{const t=d.transaction(store,"readwrite");t.objectStore(store).clear();t.oncomplete=res;t.onerror=()=>rej(t.error)})}
