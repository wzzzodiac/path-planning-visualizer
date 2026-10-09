import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

// A view of the existing 2D graph. Height does not alter traversal cost.
export async function createAtlas(host, api) {
 const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','3D terrain. Use Orbit to inspect, Edit to paint; 2D provides an alternative editor.');
 host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color(0xe1e5df);scene.fog=new THREE.Fog(0xe1e5df,95,180);
 const camera=new THREE.OrthographicCamera(-30,30,20,-20,.1,200);
 const target=new THREE.Vector3(0,0,0);let azimuth=.43,elevation=.85,zoom=1,follow=false;
 const sun=new THREE.DirectionalLight(0xffefd3,3.5);sun.position.set(-18,36,12);sun.castShadow=true;
 Object.assign(sun.shadow.camera,{left:-32,right:32,top:28,bottom:-28,near:1,far:100});sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.0003;sun.shadow.normalBias=.03;scene.add(sun);
 scene.add(new THREE.HemisphereLight(0xe8f7ff,0x7a8e85,2.6));
 const fill=new THREE.DirectionalLight(0xaed6f1,1.2);fill.position.set(20,12,-15);scene.add(fill);
 function material(color,roughness=.72,metalness=.1){return new THREE.MeshStandardMaterial({color,roughness,metalness});}
 function box(w,h,d,mat,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
 const ground=box(240,.2,240,material(0xd9dfd6),0,-2,0);
 const base=box(39.5,1.25,25.5,material(0x273a3e,.48,.3),0,-.86,0);base.castShadow=true;
 box(39.6,.09,25.6,material(0xb0c6b9,.55,.4),0,-.25,0);
 const board=box(38.3,.3,24.3,material(0x456066),0,-.08,0);
 const tileGeo=new THREE.BoxGeometry(.94,.14,.94);
 const tiles=new THREE.InstancedMesh(tileGeo,material(0xffffff),912);tiles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);tiles.receiveShadow=true;scene.add(tiles);
 const wallGeo=new THREE.BoxGeometry(.96,1,.96);
 const blocks=new THREE.InstancedMesh(wallGeo,material(0x415963,.55,.18),912);blocks.castShadow=true;blocks.receiveShadow=true;blocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(blocks);
 const caps=new THREE.InstancedMesh(new THREE.BoxGeometry(.83,.05,.83),material(0x8caba9,.58,.25),912);caps.receiveShadow=true;scene.add(caps);
 const cost4=new THREE.InstancedMesh(new THREE.ConeGeometry(.22,.16,4),material(0x758d60),912);scene.add(cost4);
 const cost8=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(.19,0),material(0xc28760),912);scene.add(cost8);
 const matrix=new THREE.Object3D(),color=new THREE.Color();
 const route=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xffbd48}));route.frustumCulled=false;scene.add(route);
 const routeDots=new THREE.InstancedMesh(new THREE.CylinderGeometry(.16,.16,.055,10),new THREE.MeshBasicMaterial({color:0xffd678}),912);scene.add(routeDots);
 const cursor=new THREE.Mesh(new THREE.BoxGeometry(1.01,.04,1.01),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.65,depthWrite:false}));cursor.visible=false;scene.add(cursor);
 function marker(text,hex){
  const group=new THREE.Group();scene.add(group);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.43,.07,8,36),new THREE.MeshBasicMaterial({color:hex}));rim.rotation.x=Math.PI/2;rim.position.y=.17;group.add(rim);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,2,8),material(0x273a3e));pole.position.set(.36,1.15,0);group.add(pole);
  const c=document.createElement('canvas');c.width=256;c.height=96;const g=c.getContext('2d');g.fillStyle='#183238';g.fillRect(0,0,256,96);g.fillStyle=hex===0xf17960?'#ffb8a1':'#b4e7d8';g.font='bold 38px monospace';g.textAlign='center';g.fillText(text,128,61);
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false}));label.position.set(.36,2.45,0);label.scale.set(2.2,.825,1);group.add(label);return group;
 }
 const startMarker=marker('START',0x70d3b2),goalMarker=marker('GOAL',0xf17960);
 // Survey ticks are physical edge marks, kept out of the editable cells.
 const tickMat=new THREE.MeshBasicMaterial({color:0xcedeaf});
 for(let c=0;c<38;c++){box(c%5===0?.045:.028,.012,c%5===0?.36:.17,tickMat,c-18.5,-.19,12.42);}
 const badge=document.createElement('canvas');badge.width=1024;badge.height=128;const bg=badge.getContext('2d');bg.fillStyle='#273a3e';bg.fillRect(0,0,1024,128);bg.font='30px monospace';bg.fillStyle='#a9bdb3';bg.fillText('A T L A S   /   FIELD 01',38,66);bg.font='17px monospace';bg.fillText('38 x 24   |   WEIGHTED NAVIGATION',560,66);const bt=new THREE.CanvasTexture(badge);bt.colorSpace=THREE.SRGBColorSpace;
 const plaque=new THREE.Mesh(new THREE.PlaneGeometry(24,.95),new THREE.MeshBasicMaterial({map:bt}));plaque.position.set(0,-.88,12.76);scene.add(plaque);
 let rover=null,wheels=[],pose=[],travel=[],progress=0,moving=false,lastTime=0,frame=0,active=true,disposed=false,current=null;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const ray=new THREE.Raycaster(),ndc=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-.12),hit=new THREE.Vector3();
 function pos(p){return new THREE.Vector3(p.c-18.5,.1,p.r-11.5);}
 function request(){if(!frame&&active&&!document.hidden&&!disposed)frame=requestAnimationFrame(draw);}
 function updateCamera(){
  const aspect=host.clientWidth/Math.max(1,host.clientHeight),span=Math.max(32,49/aspect)/zoom;
  camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  camera.position.set(target.x+Math.sin(azimuth)*Math.cos(elevation)*65,target.y+Math.sin(elevation)*65,target.z+Math.cos(azimuth)*Math.cos(elevation)*65);camera.lookAt(target);
 }
 function draw(now){frame=0;if(!active||document.hidden||disposed)return;const dt=Math.max(0,Math.min(.04,(now-lastTime)/1000||0));lastTime=now;
  if(moving&&rover&&travel.length>1){
   progress=Math.min(travel.length-1,progress+dt*4);const i=Math.min(Math.floor(progress),travel.length-2),f=progress-i;
   const a=travel[i],b=travel[i+1];rover.position.copy(a).lerp(b,f);rover.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);
   wheels.forEach((w,n)=>w.rotation.x=pose[n]+progress/.215);
   if(follow){target.copy(rover.position);target.y=0;updateCamera();}
   if(progress>=travel.length-1){moving=false;document.getElementById('replayBtn').disabled=false;}
   else request();
  }
  renderer.render(scene,camera);
 }
 function sync(data){current=data;let wi=0,ri=0,hi=0,di=0;const points=[];
  for(let r=0;r<24;r++)for(let c=0;c<38;c++){
   const k=`${r},${c}`,i=r*38+c,x=c-18.5,z=r-11.5,weight=data.terrain.get(k)||1;
   const y=weight===8?.17:weight===4?.10:.02;
   matrix.position.set(x,y,z);matrix.scale.set(1,1,1);matrix.rotation.set(0,0,0);matrix.updateMatrix();tiles.setMatrixAt(i,matrix.matrix);
   let hex=weight===8?0xc69772:weight===4?0x9bad83:0x7f9997;
   if(data.visited.has(k))hex=weight===1?0x56aaba:weight===4?0x6a9f91:0x8ca098;
   if(data.path.has(k))hex=0xe7b45a;
   if(r===data.start.r&&c===data.start.c)hex=0x6bb79b;if(r===data.goal.r&&c===data.goal.c)hex=0xd5806d;
   tiles.setColorAt(i,color.set(hex));
   if(data.walls.has(k)){
    const adjacent=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dr,dc])=>data.walls.has(`${r+dr},${c+dc}`)).length;
    const height=.85+adjacent*.34+Math.sin(r*.4+c*.3)*.28;matrix.position.set(x,height/2+.1,z);matrix.scale.set(1,height,1);matrix.updateMatrix();blocks.setMatrixAt(wi,matrix.matrix);
    matrix.position.y=height+.12;matrix.scale.set(1,1,1);matrix.updateMatrix();caps.setMatrixAt(wi++,matrix.matrix);
   }else if(weight>1&&!data.path.has(k)){
    matrix.position.set(x+.22,y+.22,z+.22);matrix.scale.set(1,1,1);matrix.rotation.y=(r+c)*.7;matrix.updateMatrix();if(weight===4)cost4.setMatrixAt(ri++,matrix.matrix);else cost8.setMatrixAt(hi++,matrix.matrix);
   }
   if(data.path.has(k)){matrix.position.set(x,y+.13,z);matrix.scale.set(1,1,1);matrix.rotation.set(0,0,0);matrix.updateMatrix();routeDots.setMatrixAt(di++,matrix.matrix);}
  }
  tiles.instanceMatrix.needsUpdate=true;tiles.instanceColor.needsUpdate=true;
  for(const [m,count]of [[blocks,wi],[caps,wi],[cost4,ri],[cost8,hi],[routeDots,di]]){m.count=count;m.instanceMatrix.needsUpdate=true;m.computeBoundingSphere();}
  startMarker.position.copy(pos(data.start));goalMarker.position.copy(pos(data.goal));
  if(!data.path.size){moving=false;progress=0;travel=[];route.geometry.dispose();route.geometry=new THREE.BufferGeometry();if(rover)rover.position.copy(pos(data.start));document.getElementById('replayBtn').disabled=true;}
  request();
 }
 function play(path){
  travel=[pos(current.start),...path.map(pos)];
  travel.forEach((p,i)=>{const cell=i===0?current.start:path[i-1];const cost=current.terrain.get(`${cell.r},${cell.c}`)||1;p.y=cost===8?.25:cost===4?.18:.1;});
  route.geometry.dispose();route.geometry=new THREE.BufferGeometry().setFromPoints(travel.map(v=>v.clone().add(new THREE.Vector3(0,.08,0))));
  progress=0;moving=!reduced.matches&&!!rover;lastTime=performance.now();document.getElementById('replayBtn').disabled=!rover;
  if(rover)rover.position.copy(travel[reduced.matches?travel.length-1:0]);request();
 }
 function wallVisibility(ghost){for(const m of [blocks.material,caps.material]){m.transparent=ghost;m.opacity=ghost?.22:1;m.depthWrite=!ghost;m.needsUpdate=true;}}
 function preset(which){follow=which==='follow';wallVisibility(follow);if(follow){target.copy(rover?.position||pos(current.start));zoom=3.2;elevation=.7;azimuth=.65;}else{target.set(0,0,0);zoom=1;elevation=which==='top'?Math.PI/2-.001:.85;azimuth=which==='top'?0:.43;}updateCamera();request();}
 const pointers=new Map();let drag=null,edit=false,erase=false;
 function pick(e){const b=renderer.domElement.getBoundingClientRect();ndc.set((e.clientX-b.left)/b.width*2-1,1-(e.clientY-b.top)/b.height*2);ray.setFromCamera(ndc,camera);if(!ray.ray.intersectPlane(plane,hit))return null;const c=Math.floor(hit.x+19),r=Math.floor(hit.z+12);return r>=0&&r<24&&c>=0&&c<38?{r,c}:null;}
 function eventCell(p){return {preventDefault(){},currentTarget:{dataset:{r:p.r,c:p.c}}};}
 renderer.domElement.addEventListener('pointerdown',e=>{e.preventDefault();renderer.domElement.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY};if(edit&&!api.state().running){const p=pick(e);if(p){erase=e.button===2;if(erase)api.erase(p.r,p.c);else api.down(eventCell(p));}}});
 renderer.domElement.addEventListener('pointermove',e=>{
  const p=pick(e);cursor.visible=edit&&!!p&&!api.state().running;if(p)cursor.position.set(p.c-18.5,.33,p.r-11.5);
  if(pointers.has(e.pointerId)){
   const prev=pointers.get(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(edit){if(p&&!api.state().running){if(erase)api.erase(p.r,p.c);else api.enter(eventCell(p));}}
   else{if(follow)wallVisibility(false);follow=false;azimuth-=(e.clientX-prev.x)*.008;elevation=THREE.MathUtils.clamp(elevation+(e.clientY-prev.y)*.006,.3,1.56);updateCamera();}
  }request();
 });
 function end(e){pointers.delete(e.pointerId);drag=null;api.up();}
 renderer.domElement.addEventListener('pointerup',end);renderer.domElement.addEventListener('pointercancel',end);renderer.domElement.addEventListener('pointerleave',()=>{cursor.visible=false;request();});renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
 renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();zoom=THREE.MathUtils.clamp(zoom*Math.exp(-e.deltaY*.001),.65,4.5);updateCamera();request();},{passive:false});
 function resize(){renderer.setSize(Math.max(1,host.clientWidth),Math.max(1,host.clientHeight),false);updateCamera();request();}
 const observer=new ResizeObserver(resize);observer.observe(host);
 function suspend(){cancelAnimationFrame(frame);frame=0;}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else{lastTime=performance.now();request();}});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend();api.fallback('3D graphics interrupted. The 2D editor remains available.');});
 function dispose(){disposed=true;suspend();observer.disconnect();const geometries=new Set(),materials=new Set(),textures=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [].concat(o.material||[])){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();}
 window.addEventListener('pagehide',e=>{if(e.persisted)suspend();else dispose()});window.addEventListener('pageshow',e=>{if(e.persisted){lastTime=performance.now();request();}});
 resize();sync(api.state());
 const view={sync,play,preset,dispose,renderer,scene,camera,get rover(){return rover;},get wheels(){return wheels;},get moving(){return moving;},setActive(on){active=on;if(on){resize();lastTime=performance.now();request();}else suspend();},setEdit(on){edit=on;cursor.visible=false;api.up();request();},zoomBy(f){zoom=THREE.MathUtils.clamp(zoom*f,.65,4.5);updateCamera();request();},quality(value){renderer.setPixelRatio(Math.min(devicePixelRatio,value==='low'?1:value==='high'?2:1.5));renderer.shadowMap.enabled=value!=='low';resize();}};
 try{
  const gltf=await new GLTFLoader().loadAsync(new URL('./assets/rover.glb',import.meta.url).href);
  if(disposed){return view;}
  rover=gltf.scene;rover.name='SurveyRover';scene.add(rover);rover.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  const names=['Wheel_LF','Wheel_LB','Wheel_RF','Wheel_RB'];wheels=names.map(name=>rover.getObjectByName(name));
  if(wheels.some(w=>!w)){const actual=[];rover.traverse(o=>actual.push(o.name));throw new Error('Missing rover wheel pivots: '+actual.join(', '));}
  pose=wheels.map(w=>w.rotation.x);rover.position.copy(pos(api.state().start));document.getElementById('modelState').textContent='R-01 / READY';request();
 }catch(error){
  if(rover){scene.remove(rover);rover.traverse(o=>{o.geometry?.dispose();for(const m of [].concat(o.material||[]))m.dispose();});}
  rover=null;wheels=[];document.getElementById('modelState').textContent='ROVER ASSET UNAVAILABLE';console.error(error);
 }
 return view;
}
