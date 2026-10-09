export const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]));
export function safeUrl(v){try{const u=new URL(String(v||""),document.baseURI);return ["http:","https:"].includes(u.protocol)?u.href:""}catch{return ""}}
export function toast(m){const e=document.querySelector("#toast");if(!e)return;e.textContent=m;e.style.display="block";clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display="none",2600)}
