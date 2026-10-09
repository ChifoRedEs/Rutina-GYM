(function(){
'use strict';

const DATA=window.GYM_DATA||{};
const BASE=Array.isArray(DATA.EXERCISES)?DATA.EXERCISES:[];
const GROUPS=DATA.GROUPS||{};
const EQUIP={maquina:'Máquina',libre:'Peso libre',calistenia:'Calistenia'};
const SUBGROUPS={
  empuje:['Pecho','Hombro','Tríceps'],
  traccion:['Espalda','Bíceps','Lumbar','Abdominal'],
  pierna:['Cuádriceps','Femoral','Gemelos','Aductores / Abductores'],
  core:['Abdomen','Lumbar','Pelvis / suelo pélvico','Estabilidad']
};
const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const WEEKDAYS=['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const uid=p=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const pad=n=>String(n).padStart(2,'0');
const dateStr=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=new Date();
const todayStr=dateStr(today);
let viewYear=today.getFullYear(),viewMonth=today.getMonth();
let routeName='home',previousRoute='home',selectionState=null,currentSessionId=null,timer=null;

// ---------- durable core storage ----------
function read(key,fallback=null){try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v)}catch{return fallback}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){console.warn(e);toast('No se pudo guardar. El almacenamiento del navegador está lleno.');return false}}
function remove(key){try{localStorage.removeItem(key)}catch{}}
function sessionKey(date,id){return `gym.session.${date}.${id}`}
function allSessionKeys(){try{return Object.keys(localStorage).filter(k=>k.startsWith('gym.session.'))}catch{return[]}}
function sessions(){return allSessionKeys().map(k=>read(k)).filter(Boolean).sort((a,b)=>String(b.date).localeCompare(String(a.date))||(b.createdAt||0)-(a.createdAt||0))}
function saveSession(s){s.updatedAt=Date.now();return write(sessionKey(s.date,s.id),s)}
function getSession(date,id){return read(sessionKey(date,id))}
function deleteSession(s){remove(sessionKey(s.date,s.id))}
function customExercises(){return read('gym.customExercises',[])||[]}
function saveCustom(arr){return write('gym.customExercises',arr)}
function overrides(){return read('gym.exerciseOverrides',{})||{}}
function saveOverrides(v){return write('gym.exerciseOverrides',v)}
function exerciseList(){
  const ov=overrides(),custom=customExercises();
  const base=BASE.map(x=>ov[x.id]?Object.assign({},x,ov[x.id]):Object.assign({},x));
  return base.concat(custom.filter(c=>!BASE.some(b=>b.id===c.id)));
}
function exerciseById(id){return exerciseList().find(x=>x.id===id)}
function getSessionsForDate(date){return sessions().filter(s=>s.date===date)}
function migrateLegacy(){
  if(read('gym.migratedLegacy',false))return;
  try{
    const legacyCustom=read('customExercises',null);
    if(Array.isArray(legacyCustom)&&legacyCustom.length){
      const current=customExercises();
      const merged=current.slice();
      legacyCustom.forEach(x=>{if(x?.id&&!merged.some(c=>c.id===x.id))merged.push(x)});
      saveCustom(merged);
    }
    const keys=Object.keys(localStorage).filter(k=>k.startsWith('workout:'));
    keys.forEach(k=>{
      const raw=read(k);if(!raw||!raw.date&&raw.group===undefined)return;
      const date=k.slice(8),group=raw.group;
      const ex=(raw.exercises||[]).map(e=>({id:e.id,name:e.name,primary:e.primary||'',secondary:e.secondary||'',subgroup:e.subgroup||'',equip:e.equip||'',restSeconds:90,notes:'',sets:[1,2,3].map((n,i)=>({id:uid('set'),number:n,weight:i===0?(e.peso??''):'',reps:i===0?(e.reps??''):'',rir:'',completed:Boolean(e.checked&&i===0)}))}));
      if(group&&ex.length){const id=uid('legacy');saveSession({id,date,group,name:`Sesión ${GROUPS[group]?.label||group}`,createdAt:raw.updatedAt||Date.now(),updatedAt:raw.updatedAt||Date.now(),status:'completed',notes:'',exercises:ex})}
      remove(k);
    });
  }catch(e){console.warn('Legacy migration failed',e)}
  write('gym.migratedLegacy',true);
}

// ---------- media: IndexedDB, with localStorage fallback ----------
let mediaDBPromise=null;
function mediaDB(){
  if(mediaDBPromise)return mediaDBPromise;
  if(!('indexedDB' in window))return Promise.resolve(null);
  mediaDBPromise=new Promise(resolve=>{try{const r=indexedDB.open('rutina-gym-media-v3',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('media'))r.result.createObjectStore('media',{keyPath:'id'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>resolve(null)}catch{resolve(null)}});
  return mediaDBPromise;
}
async function mediaGet(id){const db=await mediaDB();if(!db)return read(`gym.media.${id}`);return new Promise(res=>{try{const r=db.transaction('media').objectStore('media').get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)}catch{res(null)}})}
async function mediaPut(id,dataUrl){const db=await mediaDB();if(!db){return write(`gym.media.${id}`,{id,dataUrl,updatedAt:Date.now()})}return new Promise(res=>{try{const t=db.transaction('media','readwrite');t.objectStore('media').put({id,dataUrl,updatedAt:Date.now()});t.oncomplete=()=>res(true);t.onerror=()=>res(false)}catch{res(false)}})}
async function mediaAll(){const db=await mediaDB();if(!db){try{return Object.keys(localStorage).filter(k=>k.startsWith('gym.media.')).map(k=>read(k)).filter(Boolean)}catch{return[]}}return new Promise(res=>{try{const r=db.transaction('media').objectStore('media').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>res([])}catch{res([])}})}
async function mediaDelete(id){const db=await mediaDB();if(!db){remove(`gym.media.${id}`);return}try{db.transaction('media','readwrite').objectStore('media').delete(id)}catch{}}

// ---------- common UI ----------
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>el.style.display='none',2600)}
function safeUrl(v){try{const u=new URL(String(v||''),document.baseURI);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return''}}
function imageSrc(v){const x=String(v||'');if(/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(x))return x;return safeUrl(x)}
function setHeader(title,subtitle,back){$('#pageTitle').textContent=title;$('#pageSubtitle').textContent=subtitle;$('#backBtn').classList.toggle('hidden',!back)}
function setActive(route){document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.route===route))}
function navigate(name,args={}){previousRoute=routeName;routeName=name;setActive(name==='workout'||name==='selection'?'home':name);return render(name,args)}
$('#backBtn').addEventListener('click',()=>navigate(previousRoute==='home'?'home':previousRoute));
document.querySelectorAll('.bottom-nav button').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.route)));

// ---------- calendar ----------
function calendar(){
  setHeader('Rutina de Gimnasio','Elige un día para entrenar',false);
  const dots={};
  getSessionsForMonth(viewYear,viewMonth).forEach(s=>(dots[s.date]??=[]).push(s.group));
  const first=new Date(viewYear,viewMonth,1);let offset=first.getDay()-1;if(offset<0)offset=6;
  const total=new Date(viewYear,viewMonth+1,0).getDate();
  let cells='';for(let i=0;i<offset;i++)cells+='<div class="day-cell empty"></div>';
  for(let d=1;d<=total;d++){
    const ds=`${viewYear}-${pad(viewMonth+1)}-${pad(d)}`,gs=[...new Set(dots[ds]||[])];
    const dot=gs.map(g=>`<i class="dot" style="background:${esc(GROUPS[g]?.color||'#9b7cff')}"></i>`).join('');
    cells+=`<button class="day-cell ${ds===todayStr?'today':''} ${gs.length?'has-workout':''}" data-date="${ds}"><span>${d}</span><span class="day-dots">${dot}</span></button>`;
  }
  $('#screen').innerHTML=`
    <div class="calendar-head"><button class="month-btn" id="prevMonth">‹</button><div class="month-label">${MONTHS[viewMonth]} ${viewYear}</div><button class="month-btn" id="nextMonth">›</button></div>
    <div class="weekdays">${['L','M','X','J','V','S','D'].map(x=>`<span>${x}</span>`).join('')}</div>
    <div class="days">${cells}</div>
    <div class="legend"><span><i style="background:${esc(GROUPS.empuje?.color||'#ffb020')}"></i>Empuje</span><span><i style="background:${esc(GROUPS.traccion?.color||'#4da6ff')}"></i>Tracción</span><span><i style="background:${esc(GROUPS.pierna?.color||'#3ed17a')}"></i>Pierna</span><span><i style="background:${esc(GROUPS.core?.color||'#a78bfa')}"></i>Core</span></div>
    <div class="home-actions"><button class="btn" id="todayBtn">Hoy</button><button class="btn" id="newTodayBtn">+ Entrenar hoy</button></div>
    <div class="card" style="margin-top:12px"><div class="row"><div><h3>Últimos entrenamientos</h3><p class="small muted">Tus sesiones aparecen en el calendario.</p></div><button class="btn" id="viewHistory">Ver historial</button></div></div>`;
  $('#prevMonth').onclick=()=>{viewMonth--;if(viewMonth<0){viewMonth=11;viewYear--}calendar()};
  $('#nextMonth').onclick=()=>{viewMonth++;if(viewMonth>11){viewMonth=0;viewYear++}calendar()};
  $('#todayBtn').onclick=()=>{viewYear=today.getFullYear();viewMonth=today.getMonth();calendar()};
  $('#newTodayBtn').onclick=()=>openDay(todayStr);
  $('#viewHistory').onclick=()=>navigate('history');
  document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>openDay(b.dataset.date));
}
function getSessionsForMonth(y,m){const p=`${y}-${pad(m+1)}`;return sessions().filter(s=>String(s.date).startsWith(p))}
function openDay(date){
  const list=getSessionsForDate(date);const long=formatDateLong(date);
  const groupButtons=Object.entries(GROUPS).map(([k,g])=>`<button class="btn" data-new-group="${k}" style="border-color:${esc(g.color)}">${esc(g.label)}</button>`).join('');
  const sessionHtml=list.length?'<h3>Entrenamientos de este día</h3>'+list.map(s=>`<div class="session-row" style="--gc:${esc(GROUPS[s.group]?.color||'#9b7cff')}"><div class="row"><div><b>${esc(s.name)}</b><div class="small muted">${completedSets(s)}/${totalSets(s)} series completadas</div></div><button class="btn" data-open-session="${esc(s.id)}">Abrir</button></div></div>`).join(''):'<div class="empty">No hay entrenamientos este día.</div>';
  $('#modalRoot').innerHTML=`<div class="modal-backdrop" id="dayModal"><div class="sheet"><div class="row"><h2>${esc(long)}</h2><button class="btn" id="closeModal">Cerrar</button></div><div class="card"><h3>Nuevo entrenamiento</h3><p class="small muted">Elige el grupo y después selecciona los ejercicios.</p><div class="grid grid-2">${groupButtons}</div></div>${sessionHtml}</div></div>`;
  $('#closeModal').onclick=closeModal;$('#dayModal').onclick=e=>{if(e.target.id==='dayModal')closeModal()};
  document.querySelectorAll('[data-new-group]').forEach(b=>b.onclick=()=>{closeModal();navigate('selection',{date,group:b.dataset.newGroup})});
  document.querySelectorAll('[data-open-session]').forEach(b=>b.onclick=()=>{closeModal();navigate('workout',{date,id:b.dataset.openSession})});
}
function closeModal(){$('#modalRoot').innerHTML=''}
function formatDateLong(ds){const [y,m,d]=ds.split('-').map(Number);const dt=new Date(y,m-1,d);return `${WEEKDAYS[(dt.getDay()+6)%7]}, ${d} de ${MONTHS[m-1]} de ${y}`}

// ---------- exercise selection ----------
function selection({date,group,editingId=null}){
  selectionState={date,group,editingId,selected:new Set()};
  if(editingId){const s=getSession(date,editingId);(s?.exercises||[]).forEach(e=>selectionState.selected.add(e.id))}
  setHeader(`Elegir ejercicios · ${GROUPS[group]?.label||group}`,formatDateLong(date),true);
  const defs=exerciseList().filter(x=>x.group===group);
  $('#screen').innerHTML=`<div class="group-banner" style="--gc:${esc(GROUPS[group]?.color||'#9b7cff')}"><div class="group-banner-top"><div><h2>${esc(GROUPS[group]?.label||group)}</h2><p class="small muted">${esc(GROUPS[group]?.sub||'')}</p></div><b id="selCount">${selectionState.selected.size} seleccionados</b></div></div><div id="selectionList"></div><div class="sticky-actions"><button class="btn" id="selCancel">Cancelar</button><button class="btn primary" id="selSave">Guardar sesión</button></div>`;
  let lastSub='',lastEquip='';const list=$('#selectionList');
  defs.forEach(ex=>{
    if(ex.subgroup!==lastSub){list.insertAdjacentHTML('beforeend',`<div class="section-label">${esc(ex.subgroup||'')}</div>`);lastSub=ex.subgroup;lastEquip=''}
    if(ex.equip!==lastEquip){list.insertAdjacentHTML('beforeend',`<div class="section-label">${esc(EQUIP[ex.equip]||ex.equip||'')}</div>`);lastEquip=ex.equip}
    const checked=selectionState.selected.has(ex.id);const row=document.createElement('button');row.className=`selection-row ${checked?'checked':''}`;row.style.setProperty('--gc',GROUPS[group]?.color||'#9b7cff');row.innerHTML=`<span class="checkbox ${checked?'checked':''}">${checked?'✓':''}</span><span style="text-align:left"><b>${esc(ex.name)}</b><span class="tags"><span class="tag">${esc(ex.primary)}</span>${ex.secondary?`<span class="tag">${esc(ex.secondary)}</span>`:''}</span></span>`;row.onclick=()=>{const yes=!selectionState.selected.has(ex.id);yes?selectionState.selected.add(ex.id):selectionState.selected.delete(ex.id);row.classList.toggle('checked',yes);const c=row.querySelector('.checkbox');c.classList.toggle('checked',yes);c.textContent=yes?'✓':'';$('#selCount').textContent=`${selectionState.selected.size} seleccionados`};list.append(row);
  });
  $('#selCancel').onclick=()=>editingId?navigate('workout',{date,id:editingId}):navigate('home');
  $('#selSave').onclick=saveSelection;
}
function makeSet(n,p={}){return{id:p.id||uid('set'),number:n,weight:p.weight??'',reps:p.reps??'',rir:p.rir??'',completed:Boolean(p.completed)}}
function makeExercise(def,previous){const ps=previous?.sets||[];return{id:def.id,name:def.name,primary:def.primary,secondary:def.secondary,subgroup:def.subgroup,equip:def.equip,restSeconds:def.restSeconds??90,notes:previous?.notes||'',sets:ps.length?ps.map((x,i)=>makeSet(i+1,x)):[1,2,3].map(n=>makeSet(n))}}
function saveSelection(){
  const st=selectionState;if(!st||st.selected.size===0){toast('Selecciona al menos un ejercicio.');return}
  const defs=exerciseList().filter(x=>x.group===st.group&&st.selected.has(x.id));const old=st.editingId?getSession(st.date,st.editingId):null;
  const ex=defs.map(d=>makeExercise(d,old?.exercises?.find(x=>x.id===d.id)));
  const s=old?Object.assign(old,{exercises:ex,updatedAt:Date.now()}):{id:uid('session'),date:st.date,group:st.group,name:`Sesión ${GROUPS[st.group]?.label||st.group}`,createdAt:Date.now(),updatedAt:Date.now(),status:'active',notes:'',exercises:ex};
  saveSession(s);navigate('workout',{date:s.date,id:s.id});
}

// ---------- workout ----------
async function workout({date,id}){
  const s=getSession(date,id);if(!s){toast('No se encontró el entrenamiento.');return navigate('home')}
  currentSessionId=id;setHeader(s.name,formatDateLong(s.date),true);
  $('#screen').innerHTML=`<div class="card"><div class="row"><b>Progreso</b><span id="progressText">${completedSets(s)}/${totalSets(s)} series</span></div><div class="progress"><div id="progressFill" style="width:${progress(s)}%"></div></div></div><div id="exerciseList"></div><div class="sticky-actions"><button class="btn" id="editSelection">Editar ejercicios</button><button class="btn primary" id="finishWorkout">Finalizar</button></div><div id="restHolder"></div>`;
  $('#editSelection').onclick=()=>navigate('selection',{date:s.date,group:s.group,editingId:s.id});
  $('#finishWorkout').onclick=()=>{s.status='completed';saveSession(s);toast('Entrenamiento guardado');navigate('home')};
  const list=$('#exerciseList');
  for(const e of s.exercises){
    const def=exerciseById(e.id)||e,media=await mediaGet(e.id),image=imageSrc(media?.dataUrl||def.imagePath||'');
    const p=previousPerformance(e.id,s.date),card=document.createElement('article');card.className='card exercise';card.style.setProperty('--exercise-color',GROUPS[s.group]?.color||'#7c5cff');
    card.innerHTML=`<div class="row"><div><h3>${esc(e.name)}</h3><div class="tags"><span class="tag">${esc(e.primary)}</span>${e.secondary?`<span class="tag">${esc(e.secondary)}</span>`:''}</div></div><button class="btn" data-rest>Descanso</button></div>
      ${image?`<img class="workout-image" src="${esc(image)}" alt="${esc(e.name)}">`:''}
      ${def.instructions?`<p class="small exercise-instructions">${esc(def.instructions)}</p>`:''}
      <div class="exercise-actions">${safeUrl(def.tutorialUrl)?`<a class="btn" href="${esc(safeUrl(def.tutorialUrl))}" target="_blank" rel="noopener">▶ Tutorial</a>`:''}${safeUrl(def.externalUrl)?`<a class="btn" href="${esc(safeUrl(def.externalUrl))}" target="_blank" rel="noopener">↗ Más información</a>`:''}<span class="target small">Objetivo: ${Number(def.targetRepsMin)||8}–${Number(def.targetRepsMax)||12} reps · RIR ${Number(def.targetRIR)??1}</span></div>
      <p class="small muted">${p?'Anterior: '+p.sets.filter(x=>x.completed).map(x=>`${x.weight||0} kg × ${x.reps||0}`).join(' · '):'Sin historial previo'}</p>
      <div class="sets">${e.sets.map((x,i)=>`<div class="set-row" data-set="${esc(x.id)}"><span class="set-num">${i+1}</span><input data-f="weight" type="number" inputmode="decimal" value="${esc(x.weight)}" placeholder="kg"><input data-f="reps" type="number" inputmode="numeric" value="${esc(x.reps)}" placeholder="reps"><input data-f="rir" type="number" inputmode="numeric" value="${esc(x.rir)}" placeholder="RIR"><button class="check ${x.completed?'checked':''}" data-check>${x.completed?'✓':'○'}</button></div>`).join('')}</div>
      <label style="margin-top:10px">Notas<input data-note value="${esc(e.notes)}" placeholder="Notas del ejercicio"></label>`;
    list.append(card);
    card.querySelectorAll('.set-row').forEach(row=>{row.querySelectorAll('input').forEach(input=>input.addEventListener('input',()=>{const x=e.sets.find(z=>z.id===row.dataset.set);if(x){x[input.dataset.f]=input.value;saveSession(s);updateProgress(s)}}));row.querySelector('[data-check]').onclick=()=>{const x=e.sets.find(z=>z.id===row.dataset.set);if(!x)return;x.completed=!x.completed;saveSession(s);updateProgress(s);const b=row.querySelector('[data-check]');b.classList.toggle('checked',x.completed);b.textContent=x.completed?'✓':'○';if(x.completed)startRest(e.restSeconds||def.restSeconds||90,e.name)}});
    card.querySelector('[data-note]').oninput=ev=>{e.notes=ev.target.value;saveSession(s)};card.querySelector('[data-rest]').onclick=()=>startRest(e.restSeconds||def.restSeconds||90,e.name);
  }
}
function completedSets(s){return s.exercises.reduce((n,e)=>n+e.sets.filter(x=>x.completed).length,0)}
function totalSets(s){return s.exercises.reduce((n,e)=>n+e.sets.length,0)}
function volume(s){return s.exercises.reduce((n,e)=>n+e.sets.filter(x=>x.completed).reduce((a,x)=>a+Number(x.weight||0)*Number(x.reps||0),0),0)}
function progress(s){return totalSets(s)?completedSets(s)/totalSets(s)*100:0}
function updateProgress(s){const a=$('#progressText'),b=$('#progressFill');if(a)a.textContent=`${completedSets(s)}/${totalSets(s)} series`;if(b)b.style.width=`${progress(s)}%`}
function previousPerformance(exId,date){for(const s of sessions())if(s.date<date){const e=s.exercises.find(x=>x.id===exId);if(e&&e.sets.some(x=>x.completed))return e}return null}

// ---------- history / progress ----------
function history(){setHeader('Historial','Entrenamientos',false);const ss=sessions();$('#screen').innerHTML=`<h2>Historial</h2><div class="list">${ss.map(s=>`<div class="list-item"><div class="row"><div><b>${esc(s.name)}</b><div class="small muted">${esc(GROUPS[s.group]?.label||s.group)} · ${esc(formatDateLong(s.date))}</div></div><button class="btn" data-open="${esc(s.id)}" data-date="${esc(s.date)}">Abrir</button></div><div class="small muted" style="margin-top:7px">${completedSets(s)}/${totalSets(s)} series · ${Math.round(volume(s))} kg</div></div>`).join('')||'<div class="empty">Todavía no hay entrenamientos.</div>'}</div>`;document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>navigate('workout',{date:b.dataset.date,id:b.dataset.open}))}
function stats(){setHeader('Progreso','Volumen, sesiones y récords',false);const ss=sessions(),totalVol=ss.reduce((n,s)=>n+volume(s),0),pr={};ss.forEach(s=>s.exercises.forEach(e=>e.sets.filter(x=>x.completed).forEach(x=>{const w=Number(x.weight||0);if(w&&(!pr[e.id]||w>pr[e.id].weight))pr[e.id]={exercise:e.name,weight:w,reps:Number(x.reps||0),date:s.date}})));const weekly={};ss.forEach(s=>{const d=new Date(s.date+'T12:00:00');const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);const k=dateStr(d);weekly[k]=(weekly[k]||0)+volume(s)});$('#screen').innerHTML=`<h2>Progreso</h2><div class="kpis"><div class="kpi"><b>${ss.length}</b><span>Sesiones</span></div><div class="kpi"><b>${Math.round(totalVol)}</b><span>kg volumen</span></div><div class="kpi"><b>${Object.keys(pr).length}</b><span>PR</span></div><div class="kpi"><b>${ss.length?Math.round(totalVol/ss.length):0}</b><span>kg/sesión</span></div></div><div class="card"><h3>Volumen semanal</h3>${Object.entries(weekly).sort().slice(-8).map(([d,v])=>`<div class="row small"><span>${esc(d)}</span><b>${Math.round(v)} kg</b></div>`).join('')||'<p class="muted">Sin datos.</p>'}</div><div class="card"><h3>Récords</h3>${Object.values(pr).sort((a,b)=>b.weight-a.weight).map(x=>`<div class="list-item"><div class="row"><b>${esc(x.exercise)}</b><b>${x.weight} kg × ${x.reps}</b></div><span class="small muted">${esc(formatDateLong(x.date))}</span></div>`).join('')||'<p class="muted">Todavía no hay PRs.</p>'}</div>`}

// ---------- settings / exercise library ----------
async function settings(){setHeader('Ajustes','Aplicación y biblioteca',false);$('#screen').innerHTML=`<h2>Ajustes</h2><div class="card settings-hero"><div class="settings-icon">⚙</div><div><h3>Biblioteca de ejercicios</h3><p class="small muted">Añade o edita imágenes, tutoriales de YouTube, enlaces, instrucciones, descanso y objetivos.</p></div><button class="btn primary full" id="manageExercises">Gestionar ejercicios</button></div><div class="card"><h3>Datos</h3><div class="grid grid-2"><button class="btn" id="exportBackup">Copia JSON</button><button class="btn" id="exportCSV">Exportar CSV</button></div><label style="margin-top:10px">Restaurar copia<input id="importFile" type="file" accept="application/json,.json"></label></div><div class="card"><h3>Almacenamiento</h3><p class="small muted">Los datos se guardan en este navegador. Las imágenes usan IndexedDB cuando está disponible.</p><button class="btn danger full" id="wipe">Borrar todos los datos</button></div>`;$('#manageExercises').onclick=()=>navigate('exercises');$('#exportBackup').onclick=exportBackup;$('#exportCSV').onclick=exportCSV;$('#importFile').onchange=e=>e.target.files[0]&&importBackup(e.target.files[0]);$('#wipe').onclick=wipeData}
async function exercises(){setHeader('Ejercicios','Biblioteca',true);const all=exerciseList();const media=await mediaAll();const mm=new Map(media.map(x=>[x.id,x]));$('#screen').innerHTML=`<h2>Biblioteca de ejercicios</h2><div class="card"><input id="exerciseSearch" placeholder="Buscar ejercicio..."></div><div class="card"><button class="btn primary full" id="newExercise">+ Añadir ejercicio personalizado</button></div><div id="exerciseCards" class="exercise-grid"></div>`;const draw=()=>{const q=($('#exerciseSearch').value||'').toLowerCase();$('#exerciseCards').innerHTML=all.filter(x=>x.name.toLowerCase().includes(q)).map(x=>{const src=mm.get(x.id)?.dataUrl||x.imagePath||'';return `<div class="card exercise-card"><div>${src?`<img class="exercise-image" src="${esc(imageSrc(src))}" alt="">`:'<div class="exercise-image placeholder">+</div>'}</div><div><h3>${esc(x.name)}</h3><div class="tags"><span class="tag">${esc(GROUPS[x.group]?.label||x.group)}</span><span class="tag">${esc(x.primary)}</span></div><p class="small muted">${x.tutorialUrl?'▶ Tutorial · ':''}${src?'Imagen':'Sin imagen'}</p><button class="btn" data-edit="${esc(x.id)}">Editar ficha</button></div></div>`}).join('')||'<div class="empty">No hay ejercicios.</div>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editExercise(b.dataset.edit))};$('#exerciseSearch').oninput=draw;draw();$('#newExercise').onclick=()=>editExercise(null)}
async function editExercise(id){const existing=id?exerciseById(id):{id:uid('custom'),name:'',group:'empuje',subgroup:'Pecho',equip:'maquina',primary:'Pecho',secondary:'',restSeconds:90,targetRepsMin:8,targetRepsMax:12,targetRIR:1,tutorialUrl:'',externalUrl:'',instructions:'',notes:''};const media=id?await mediaGet(id):null;const src=media?.dataUrl||existing.imagePath||'';setHeader(id?'Editar ejercicio':'Nuevo ejercicio','Ficha del ejercicio',true);$('#screen').innerHTML=`<h2>${id?'Editar':'Nuevo'} ejercicio</h2><div class="card"><label>Nombre<input id="exName" value="${esc(existing.name)}"></label><div class="grid grid-2"><label>Grupo<select id="exGroup">${Object.entries(GROUPS).map(([k,g])=>`<option value="${k}" ${existing.group===k?'selected':''}>${esc(g.label)}</option>`).join('')}</select></label><label>Equipo<select id="exEquip">${Object.entries(EQUIP).map(([k,v])=>`<option value="${k}" ${existing.equip===k?'selected':''}>${v}</option>`).join('')}</select></label></div><label>Subgrupo<select id="exSubgroup"></select></label><div class="grid grid-2"><label>Músculo principal<input id="exPrimary" value="${esc(existing.primary)}"></label><label>Secundario<input id="exSecondary" value="${esc(existing.secondary)}"></label></div>${src?`<img id="editorPreview" class="editor-image" src="${esc(imageSrc(src))}" alt="">`:'<img id="editorPreview" class="editor-image hidden" alt="">'}<label>Subir imagen<input id="exImage" type="file" accept="image/*"></label><label>Ruta de imagen en GitHub (opcional)<input id="exImagePath" value="${esc(existing.imagePath||'')}" placeholder="assets/exercises/press.webp"></label><label>Tutorial YouTube<input id="exTutorial" type="url" value="${esc(existing.tutorialUrl||'')}" placeholder="https://www.youtube.com/watch?v=..."></label><label>Otro enlace<input id="exExternal" type="url" value="${esc(existing.externalUrl||'')}" placeholder="https://..."></label><label>Instrucciones<textarea id="exInstructions">${esc(existing.instructions||'')}</textarea></label><label>Notas<textarea id="exNotes">${esc(existing.notes||'')}</textarea></label><div class="grid grid-2"><label>Descanso (s)<input id="exRest" type="number" min="0" value="${existing.restSeconds??90}"></label><label>RIR objetivo<input id="exRIR" type="number" min="0" max="10" value="${existing.targetRIR??1}"></label></div><div class="grid grid-2"><label>Reps mínimas<input id="exMin" type="number" min="1" value="${existing.targetRepsMin??8}"></label><label>Reps máximas<input id="exMax" type="number" min="1" value="${existing.targetRepsMax??12}"></label></div><div class="grid grid-2"><button class="btn" id="cancelEdit">Cancelar</button><button class="btn primary" id="saveEdit">Guardar</button></div>${id&&String(id).startsWith('custom-')?'<button class="btn danger full" id="deleteExercise">Eliminar ejercicio personalizado</button>':''}</div>`;
  function refreshSub(){const g=$('#exGroup').value;$('#exSubgroup').innerHTML=(SUBGROUPS[g]||[]).map(x=>`<option value="${esc(x)}" ${existing.subgroup===x?'selected':''}>${esc(x)}</option>`).join('')}
  refreshSub();$('#exGroup').onchange=refreshSub;let newImage='';$('#exImage').onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>4*1024*1024){toast('La imagen supera 4 MB.');return}newImage=await fileToDataUrl(f);$('#editorPreview').src=newImage;$('#editorPreview').classList.remove('hidden')};$('#cancelEdit').onclick=()=>navigate('exercises');$('#saveEdit').onclick=async()=>{const name=$('#exName').value.trim(),primary=$('#exPrimary').value.trim();if(!name||!primary){toast('Nombre y músculo principal son obligatorios.');return}const obj=Object.assign({},existing,{name,group:$('#exGroup').value,subgroup:$('#exSubgroup').value,equip:$('#exEquip').value,primary,secondary:$('#exSecondary').value.trim(),imagePath:$('#exImagePath').value.trim(),tutorialUrl:safeUrl($('#exTutorial').value.trim()),externalUrl:safeUrl($('#exExternal').value.trim()),instructions:$('#exInstructions').value,notes:$('#exNotes').value,restSeconds:Math.max(0,Number($('#exRest').value)||90),targetRIR:Math.max(0,Number($('#exRIR').value)||0),targetRepsMin:Math.max(1,Number($('#exMin').value)||1),targetRepsMax:Math.max(1,Number($('#exMax').value)||1)});if(id&&BASE.some(x=>x.id===id)){const ov=overrides();ov[id]=obj;saveOverrides(ov)}else{const arr=customExercises();const i=arr.findIndex(x=>x.id===obj.id);if(i>=0)arr[i]=obj;else arr.push(obj);saveCustom(arr)}if(newImage)await mediaPut(obj.id,newImage);toast('Ficha guardada');navigate('exercises')};$('#deleteExercise')?.addEventListener('click',async()=>{const arr=customExercises().filter(x=>x.id!==id);saveCustom(arr);await mediaDelete(id);toast('Ejercicio eliminado');navigate('exercises')})}
function fileToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)})}

// ---------- backup ----------
async function exportBackup(){const media=await mediaAll();const payload={app:'Rutina Gym',version:'2.4',exportedAt:new Date().toISOString(),sessions:sessions(),customExercises:customExercises(),overrides:overrides(),media};download(JSON.stringify(payload,null,2),`rutina-gym-backup-${todayStr}.json`);toast('Copia exportada')}
function exportCSV(){const rows=[['Fecha','Sesión','Grupo','Ejercicio','Serie','Peso kg','Reps','RIR','Volumen kg']];sessions().forEach(s=>s.exercises.forEach(e=>e.sets.forEach(x=>{if(x.completed)rows.push([s.date,s.name,s.group,e.name,x.number,x.weight,x.reps,x.rir,Number(x.weight||0)*Number(x.reps||0)])})));download(rows.map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n'),`rutina-gym-${todayStr}.csv`);toast('CSV exportado')}
function download(text,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:name.endsWith('.csv')?'text/csv;charset=utf-8':'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function importBackup(file){try{const d=JSON.parse(await file.text());if(d.app!=='Rutina Gym')throw Error();if(!confirm('Se reemplazarán los datos actuales. ¿Continuar?'))return;allSessionKeys().forEach(remove);(d.sessions||[]).forEach(saveSession);saveCustom(d.customExercises||[]);saveOverrides(d.overrides||{});for(const m of d.media||[])if(m?.id&&m.dataUrl)await mediaPut(m.id,m.dataUrl);toast('Copia restaurada');navigate('home')}catch{toast('Copia no válida')}}
function wipeData(){if(!confirm('¿Borrar todos los entrenamientos y personalizaciones?'))return;allSessionKeys().forEach(remove);remove('gym.customExercises');remove('gym.exerciseOverrides');toast('Datos borrados');navigate('home')}

// ---------- rest timer ----------
function startRest(seconds,label){stopRest();let remaining=Math.max(1,Number(seconds)||90);const holder=$('#restHolder');if(!holder)return;const draw=()=>{const m=Math.floor(remaining/60),s=String(remaining%60).padStart(2,'0');holder.innerHTML=`<div class="rest"><div><div class="small muted">${esc(label||'Descanso')}</div><strong>${m}:${s}</strong></div><button class="btn" id="pauseRest">Pausar</button><button class="btn" id="closeRest">Cerrar</button></div>`;$('#pauseRest').onclick=()=>{if(timer){clearInterval(timer);timer=null;$('#pauseRest').textContent='Continuar'}else{timer=setInterval(tick,1000);$('#pauseRest').textContent='Pausar'}};$('#closeRest').onclick=stopRest};const tick=()=>{remaining--;if(remaining<=0){remaining=0;stopRest();toast('Descanso terminado');return}draw()};draw();timer=setInterval(tick,1000)}
function stopRest(){if(timer){clearInterval(timer);timer=null}const h=$('#restHolder');if(h)h.innerHTML=''}

// ---------- routing / startup ----------
async function render(name,args={}){try{if(name==='home')return calendar();if(name==='history')return history();if(name==='stats')return stats();if(name==='settings')return settings();if(name==='exercises')return exercises();if(name==='selection')return selection(args);if(name==='workout')return workout(args);return calendar()}catch(e){console.error(e);setHeader('Error de carga','La aplicación encontró un error',true);$('#screen').innerHTML=`<div class="card"><h2>No se pudo cargar esta pantalla</h2><p class="muted">${esc(e.message||e)}</p><button class="btn primary" id="reloadHome">Volver al inicio</button></div>`;$('#reloadHome').onclick=()=>navigate('home')}}
window.addEventListener('error',e=>{console.error(e.error||e.message)});
window.addEventListener('unhandledrejection',e=>console.error(e.reason));

// Service worker: only on HTTPS/GitHub Pages, never required for app functionality.
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
migrateLegacy();
render('home');
})();
