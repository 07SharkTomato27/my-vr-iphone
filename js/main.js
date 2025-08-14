(function(){
  const stateKey = 'mqvr_windows_v1';
  function qs(id){return document.getElementById(id)}
  const video = qs('cameraVideo');
  async function pickBackCamera(){
    try{
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d=>d.kind==='videoinput');
      let back = videoDevices.find(d=> /back|rear|environment/i.test(d.label));
      if(!back && videoDevices.length>1) back = videoDevices[videoDevices.length-1];
      if(back){
        try{ return await navigator.mediaDevices.getUserMedia({ video:{ deviceId:{ exact: back.deviceId } }, audio:false }); }catch(e){}
      }
    }catch(e){}
    try{ return await navigator.mediaDevices.getUserMedia({ video:{ facingMode: { ideal:'environment' } }, audio:false }); }catch(e){}
    try{ return await navigator.mediaDevices.getUserMedia({ video:true, audio:false }); }catch(e){ return null }
  }
  async function startCam(){ const s = await pickBackCamera(); if(!s) return; video.srcObject = s; video.style.transform='scaleX(1)'; }
  startCam();
  function fmt2(n){ return n<10?('0'+n):n }
  const clockEl = qs('clock');
  const clockToggle = qs('clockToggle');
  const clockColorInput = qs('clockColor');
  function updateClock(){ const d=new Date(); clockEl.textContent = `${d.getHours()}時:${fmt2(d.getMinutes())}` }
  updateClock(); setInterval(updateClock,1000);
  clockToggle.addEventListener('change', ()=> clockEl.style.display = clockToggle.checked ? 'block' : 'none');
  clockColorInput.addEventListener('input', ()=> clockEl.style.color = clockColorInput.value);
  function applyLandscapeClass(){ if(window.innerHeight > window.innerWidth) document.body.classList.add('landscape'); else document.body.classList.remove('landscape'); }
  applyLandscapeClass(); window.addEventListener('resize', applyLandscapeClass);
  const threeContainer = qs('threeContainer');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 1, 10000);
  camera.position.set(0,0,800);
  const renderer = new THREE.CSS3DRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.style.pointerEvents = 'none';
  threeContainer.appendChild(renderer.domElement);
  window.addEventListener('resize', ()=>{ camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });
  const cssObjects = [];
  function updateObjFromScreen(cssObj){
    const sx = (cssObj.userData.screenX !== undefined) ? cssObj.userData.screenX : window.innerWidth/2;
    const sy = (cssObj.userData.screenY !== undefined) ? cssObj.userData.screenY : window.innerHeight/2;
    const vec = new THREE.Vector3((sx/window.innerWidth)*2-1, -(sy/window.innerHeight)*2+1, 0.5);
    vec.unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const distance = Math.abs(cssObj.position.z) + 600;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    cssObj.position.copy(pos);
  }
  function createWindow(data){
    const wrapper = document.createElement('div');
    wrapper.className = 'app-window';
    wrapper.style.opacity = (data.alpha||0.88);
    wrapper.style.background = `rgba(18,18,24,${(data.alpha||0.88)})`;
    wrapper.style.width = (data.w||360)+'px';
    wrapper.style.height = (data.h||220)+'px';
    const title = document.createElement('div'); title.className='titlebar'; title.innerHTML = `<div class="titleText">${data.title||'App'}</div>`;
    const actions = document.createElement('div'); actions.className='title-actions';
    const urlBtn = document.createElement('button'); urlBtn.className='tbtn'; urlBtn.innerHTML='🌐';
    const grab = document.createElement('button'); grab.className='tbtn'; grab.innerHTML='✋';
    const close = document.createElement('button'); close.className='tbtn'; close.innerHTML='✕';
    actions.appendChild(urlBtn); actions.appendChild(grab); actions.appendChild(close);
    title.appendChild(actions); wrapper.appendChild(title);
    const iframe = document.createElement('iframe'); iframe.className='app-iframe'; iframe.src = data.url||'https://www.youtube.com'; wrapper.appendChild(iframe);
    let dragging=false, lastPointer=null, vel={x:0,y:0};
    let cssObject = null;
    title.addEventListener('pointerdown', (ev)=>{ ev.preventDefault(); dragging=true; lastPointer={x:ev.clientX,y:ev.clientY,t:performance.now()}; wrapper.style.cursor='grabbing'; if(cssObject) cssObject.position.z = -50; });
    window.addEventListener('pointermove', (ev)=>{ if(!dragging) return; const now=performance.now(); const dx=ev.clientX-lastPointer.x; const dy=ev.clientY-lastPointer.y; const dt=Math.max(1, now-lastPointer.t); vel.x=dx/dt*16; vel.y=dy/dt*16; lastPointer={x:ev.clientX,y:ev.clientY,t:now}; if(cssObject){ cssObject.userData.screenX = (cssObject.userData.screenX||window.innerWidth/2)+dx; cssObject.userData.screenY = (cssObject.userData.screenY||window.innerHeight/2)+dy; updateObjFromScreen(cssObject); } });
    window.addEventListener('pointerup', ()=>{ if(dragging){ dragging=false; wrapper.style.cursor='grab'; if(cssObject){ const throwZ = Math.min(400, Math.max(-800, cssObject.position.z + (-vel.y*2))); gsap.to(cssObject.position, {z:throwZ, duration:0.6, ease:'power3.out'}); } } });
    close.addEventListener('click', ()=>{ if(cssObject){ scene.remove(cssObject); const i = cssObjects.findIndex(x=>x.obj===cssObject); if(i>=0) cssObjects.splice(i,1); saveState(); } });
    urlBtn.addEventListener('click', ()=>{ const u = prompt('URLを入力'); if(u && cssObject){ cssObject.element.querySelector('iframe').src = u; cssObject.userData.url = u; saveState(); } });
    grab.addEventListener('click', ()=>{ if(cssObject){ const dz = (cssObject.position.z > 0)? -300:0; gsap.to(cssObject.position, {z:dz, duration:0.4, ease:'power2.inOut'}); } });
    cssObject = new THREE.CSS3DObject(wrapper);
    cssObject.userData = Object.assign({url:data.url||'https://www.youtube.com', alpha:data.alpha||0.88}, { screenX: window.innerWidth/2 + (Math.random()*200-100), screenY: window.innerHeight/2 + (Math.random()*120-60) });
    updateObjFromScreen(cssObject);
    cssObject.position.z = data.z || -300 - Math.random()*400;
    scene.add(cssObject);
    cssObjects.push({obj:cssObject, el:wrapper});
    wrapper.style.pointerEvents='auto';
    wrapper.addEventListener('click', ()=>{ try{ wrapper.querySelector('iframe').focus(); }catch(e){} });
    saveState();
    return cssObject;
  }
  function saveState(){ try{ const arr = cssObjects.map(x=>{ const u=x.obj.userData; return {url:u.url||x.obj.element.querySelector('iframe').src, screenX:u.screenX, screenY:u.screenY, z:x.obj.position.z, w: parseInt(x.el.style.width||360), h: parseInt(x.el.style.height||220), title: x.el.querySelector('.titleText').textContent, alpha:u.alpha}; }); localStorage.setItem(stateKey, JSON.stringify(arr)); }catch(e){ console.warn('save fail', e); } }
  function loadState(){ try{ const raw=localStorage.getItem(stateKey); if(!raw) return; const arr=JSON.parse(raw); arr.forEach(a=> createWindow(a)); }catch(e){ console.warn('load fail', e); } }
  function addHandlers(el, fn){ el.addEventListener('click', fn); el.addEventListener('pointerdown', fn); el.addEventListener('touchstart', fn); }
  addHandlers(qs('addWindowBtn'), ()=> createWindow({url:'https://www.youtube.com', alpha: qs('wndAlpha').value/100}));
  addHandlers(qs('addBtnUI'), ()=> createWindow({url:'https://www.youtube.com', alpha: qs('wndAlpha').value/100}));
  addHandlers(qs('resetBtn'), ()=>{ if(confirm('全部リセットする？')){ localStorage.removeItem(stateKey); location.reload(); } });
  function toggleSettings(){ const p = qs('settingsPanel'); p.style.display = (p.style.display==='block') ? 'none' : 'block'; }
  addHandlers(qs('gearBtn'), toggleSettings);
  loadState();
  function render(){ requestAnimationFrame(render); renderer.render(scene,camera); }
  render();
  const gpCursor = qs('gpCursor');
  let gpState = {x: window.innerWidth/2, y: window.innerHeight/2, _plusLock:false, _aLock:false, _xLock:false};
  function pollGamepads(){ const gps = navigator.getGamepads ? navigator.getGamepads() : []; for(const g of gps){ if(!g) continue; const ax0 = g.axes[0]||0; const ax1 = g.axes[1]||0; const dz=v=>Math.abs(v)<0.12?0:v; const mvX=dz(ax0)*14; const mvY=dz(ax1)*14; if(mvX||mvY){ gpState.x = Math.max(0, Math.min(window.innerWidth, gpState.x + mvX)); gpState.y = Math.max(0, Math.min(window.innerHeight, gpState.y + mvY)); gpCursor.style.display='block'; gpCursor.style.left = gpState.x+'px'; gpCursor.style.top = gpState.y+'px'; const hits = cssObjects.map(x=>{ const rect = x.el.getBoundingClientRect(); return {obj:x.obj, dist: Math.hypot(gpState.x - (rect.left+rect.width/2), gpState.y - (rect.top+rect.height/2))}; }).sort((a,b)=>a.dist-b.dist); if(hits.length>0 && hits[0].dist < 260){ const t=hits[0].obj; cssObjects.forEach(x=>{ if(x.obj===t) gsap.to(x.obj.position,{z:-80,duration:0.2}); else gsap.to(x.obj.position,{z:-300,duration:0.4}); }); } }
    const aBtn = g.buttons[0] && g.buttons[0].pressed; const xBtn = g.buttons[2] && g.buttons[2].pressed; const plusBtn = g.buttons[9] && g.buttons[9].pressed;
    if(plusBtn){ if(!gpState._plusLock){ createWindow({url:'https://www.youtube.com', alpha: qs('wndAlpha').value/100}); gpState._plusLock=true; setTimeout(()=>gpState._plusLock=false,400); } }
    if(aBtn){ if(!gpState._aLock){ emulateClick('right', gpState.x, gpState.y); gpState._aLock=true; setTimeout(()=>gpState._aLock=false,200); } }
    if(xBtn){ if(!gpState._xLock){ emulateClick('left', gpState.x, gpState.y); gpState._xLock=true; setTimeout(()=>gpState._xLock=false,200); } }
  }
  requestAnimationFrame(function loop(){ pollGamepads(); requestAnimationFrame(loop); });
  function emulateClick(type, cx, cy){ const el = document.elementFromPoint(cx, cy); if(!el) return; const iframe = el.closest('iframe'); if(iframe){ try{ iframe.focus(); }catch(e){} const rect = iframe.getBoundingClientRect(); const evt = new MouseEvent(type==='left'?'click':'contextmenu', {clientX: rect.left + rect.width/2, clientY: rect.top + rect.height/2, bubbles:true, cancelable:true}); iframe.dispatchEvent(evt); return; } const evt = new MouseEvent(type==='left'?'click':'contextmenu', {clientX: cx, clientY: cy, bubbles:true, cancelable:true}); el.dispatchEvent(evt); }
  qs('wndAlpha').addEventListener('input', (e)=>{ const v=e.target.value/100; cssObjects.forEach(x=>{ x.el.style.background = `rgba(18,18,24,${v})`; x.obj.userData.alpha = v; }); saveState(); });
  qs('shadowToggle').addEventListener('change', (e)=>{ const on = e.target.checked; cssObjects.forEach(x=>{ x.el.style.boxShadow = on ? '0 14px 40px rgba(0,0,0,0.6)' : 'none'; }); });
  window.addEventListener('beforeunload', saveState);
  if(cssObjects.length===0){ }
})();