import {createAtlas} from './atlas.js';
const $=id=>document.getElementById(id);
let view=null,failed=false,edit=false;
function show3d(on){
 if(on&&failed)return;
 $('sceneHost').hidden=!on;$('grid').hidden=on;view?.setActive(on);
 $('view3d').setAttribute('aria-pressed',String(on));$('view2d').setAttribute('aria-pressed',String(!on));
 for(const id of ['orbitBtn','editBtn','overviewBtn','topBtn','followBtn','zoomIn','zoomOut','qualitySelect'])$(id).disabled=!on;
 $('mapHint').textContent=on?'Drag to orbit · Scroll or + / − to zoom · Select Edit map to paint or drag START / GOAL.':'Paint cells or drag S / G. Right-click erases. Return to 3D to inspect the terrain.';
}
window.plannerAPI.fallback=message=>{failed=true;$('viewNotice').textContent=message;$('modelState').textContent='2D / READY';show3d(false);$('view3d').disabled=true;};
$('view3d').addEventListener('click',()=>show3d(true));$('view2d').addEventListener('click',()=>show3d(false));
function setEdit(on){edit=on;view?.setEdit(on);$('editBtn').setAttribute('aria-pressed',String(on));$('orbitBtn').setAttribute('aria-pressed',String(!on));$('mapHint').textContent=on?'Paint with your selected brush · Drag START or GOAL · Right-click erases.':'Drag to orbit · Scroll or + / − to zoom.';}
$('orbitBtn').addEventListener('click',()=>setEdit(false));$('editBtn').addEventListener('click',()=>setEdit(true));
for(const [id,preset]of [['overviewBtn','overview'],['topBtn','top'],['followBtn','follow']])$(id).addEventListener('click',()=>view?.preset(preset));
$('zoomIn').addEventListener('click',()=>view?.zoomBy(1.2));$('zoomOut').addEventListener('click',()=>view?.zoomBy(1/1.2));
$('qualitySelect').addEventListener('change',()=>view?.quality($('qualitySelect').value));
try{view=await createAtlas($('sceneHost'),window.plannerAPI);window.atlas3D=view;view.sync(window.plannerAPI.state());view.setActive(!$('sceneHost').hidden);}catch(error){console.error('Atlas 3D initialization failed:',error);window.plannerAPI.fallback('3D unavailable. You can still plan and edit in the 2D map.');}
