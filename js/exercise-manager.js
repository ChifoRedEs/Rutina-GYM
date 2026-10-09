import {all,get,put,remove} from "./db.js";
import {EXERCISES,GROUPS} from "../data/exercises.js";
import {getExercises} from "./data.js";
import {esc,toast,safeUrl} from "./ui.js";
let current=null;

export async function renderExerciseManager(screen,onBack){
  const allEx=await getExercises(), media=await all("exerciseMedia");
  screen.innerHTML=`<h2>Biblioteca de ejercicios</h2><div class="card"><input id="exerciseSearch" placeholder="Buscar ejercicio..."></div><div id="exerciseCards" class="exercise-grid"></div>`;
  const draw=()=>{
    const q=(document.querySelector("#exerciseSearch").value||"").toLowerCase();
    document.querySelector("#exerciseCards").innerHTML=allEx.filter(x=>x.name.toLowerCase().includes(q)).map(x=>{
      const m=media.find(y=>y.id===x.id),src=safeUrl(x.imagePath||m?.dataUrl||"");
      return `<div class="card exercise-card"><div>${src?`<img class="exercise-image" src="${esc(src)}" alt="">`:`<div class="exercise-image placeholder">+</div>`}</div><div><h3>${esc(x.name)}</h3><div class="tags"><span class="tag">${esc(GROUPS[x.group]?.label||x.group)}</span><span class="tag">${esc(x.primary)}</span></div><p class="small muted">${x.tutorialUrl?"▶ Tutorial disponible":"Sin tutorial"}${src?" · Imagen":" · Sin imagen"}</p><button class="btn" data-edit="${esc(x.id)}">Editar ficha</button></div></div>`;
    }).join("")||`<div class="empty">No hay ejercicios.</div>`;
    document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editExercise(b.dataset.edit,screen,onBack)));
  };
  document.querySelector("#exerciseSearch").addEventListener("input",draw);draw();
}

async function editExercise(id,screen,onBack){
  const ex=(await getExercises()).find(x=>x.id===id); if(!ex)return;
  const media=await get("exerciseMedia",id); current=ex;
  const preview=safeUrl(media?.dataUrl||ex.imagePath||"");
  screen.innerHTML=`<h2>Ficha del ejercicio</h2><div class="card"><h3>${esc(ex.name)}</h3><p class="small muted">${esc(ex.primary)}${ex.secondary?" · "+esc(ex.secondary):""}</p><img id="preview" class="editor-image ${preview?"":"hidden"}" src="${esc(preview)}" alt="Imagen del ejercicio"><label>Imagen del ejercicio<input id="imageFile" type="file" accept="image/*"></label><label>Ruta de imagen en GitHub (opcional)<input id="imagePath" value="${esc(ex.imagePath||"")}" placeholder="./assets/exercises/nombre.webp"></label><label>Tutorial YouTube<input id="tutorialUrl" type="url" value="${esc(ex.tutorialUrl||"")}" placeholder="https://www.youtube.com/watch?v=..."></label><label>Otro enlace<input id="externalUrl" type="url" value="${esc(ex.externalUrl||"")}" placeholder="https://..."></label><label>Instrucciones<textarea id="instructions" placeholder="Pasos de ejecución...">${esc(ex.instructions||"")}</textarea></label><label>Notas<textarea id="notes">${esc(ex.notes||"")}</textarea></label><div class="grid grid-2"><label>Descanso (s)<input id="restSeconds" type="number" min="0" value="${ex.restSeconds??90}"></label><label>RIR objetivo<input id="targetRIR" type="number" min="0" max="10" value="${ex.targetRIR??1}"></label></div><div class="grid grid-2"><label>Reps mínimas<input id="targetMin" type="number" min="1" value="${ex.targetRepsMin??8}"></label><label>Reps máximas<input id="targetMax" type="number" min="1" value="${ex.targetRepsMax??12}"></label></div><div class="grid grid-2"><button class="btn" id="cancel">Cancelar</button><button class="btn primary" id="save">Guardar ficha</button></div>${EXERCISES.some(x=>x.id===id)?`<p class="small muted">Ejercicio del catálogo original. Los cambios se guardan como personalización local.</p>`:`<button class="btn danger full" id="delete">Eliminar ejercicio personalizado</button>`}</div>`;
  document.querySelector("#cancel").onclick=()=>renderExerciseManager(screen,onBack);
  document.querySelector("#save").onclick=()=>save(screen,onBack);
  document.querySelector("#imageFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;if(f.size>4*1024*1024){toast("La imagen supera 4 MB");return}current._newImage=await fileToDataURL(f);document.querySelector("#preview").src=current._newImage;document.querySelector("#preview").classList.remove("hidden")};
  document.querySelector("#delete")?.addEventListener("click",async()=>{if(confirm("¿Eliminar este ejercicio personalizado?")){await remove("exercises",id);await remove("exerciseMedia",id);await renderExerciseManager(screen,onBack)}});
}

async function save(screen,onBack){
  const tutorial=safeUrl(document.querySelector("#tutorialUrl").value.trim());
  const external=safeUrl(document.querySelector("#externalUrl").value.trim());
  const x={...current,imagePath:document.querySelector("#imagePath").value.trim(),tutorialUrl:tutorial,externalUrl:external,instructions:document.querySelector("#instructions").value,notes:document.querySelector("#notes").value,restSeconds:Math.max(0,Number(document.querySelector("#restSeconds").value)||90),targetRIR:Math.max(0,Number(document.querySelector("#targetRIR").value)||0),targetRepsMin:Math.max(1,Number(document.querySelector("#targetMin").value)||1),targetRepsMax:Math.max(1,Number(document.querySelector("#targetMax").value)||1)};
  delete x._newImage;
  await put("exercises",{...x,customized:EXERCISES.some(e=>e.id===x.id)});
  if(current._newImage)await put("exerciseMedia",{id:x.id,dataUrl:current._newImage,updatedAt:Date.now()});
  toast("Ficha guardada");await renderExerciseManager(screen,onBack);
}
function fileToDataURL(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(f)})}
