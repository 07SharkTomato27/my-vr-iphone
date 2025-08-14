(function(){
  const handObj = { enabled:false, onGrab:null, onRelease:null, onPoint:null, enable(){ this.enabled=true }, disable(){ this.enabled=false } };
  let active = false;
  function initTouchFallback(){
    let tracking=false; let lastTouches=[];
    function onTouchStart(e){ if(e.touches.length===1){ const t=e.touches[0]; handObj.onPoint && handObj.onPoint({x:t.clientX,y:t.clientY}); } if(e.touches.length===2){ tracking=true; lastTouches=Array.from(e.touches); handObj.onGrab && handObj.onGrab('pinch',{x:(e.touches[0].clientX+e.touches[1].clientX)/2, y:(e.touches[0].clientY+e.touches[1].clientY)/2}); } }
    function onTouchMove(e){ if(e.touches.length===1){ const t=e.touches[0]; handObj.onPoint && handObj.onPoint({x:t.clientX,y:t.clientY}); } if(tracking && e.touches.length===2){ lastTouches=Array.from(e.touches); handObj.onPoint && handObj.onPoint({x:(e.touches[0].clientX+e.touches[1].clientX)/2, y:(e.touches[0].clientY+e.touches[1].clientY)/2}); } }
    function onTouchEnd(e){ if(tracking && e.touches.length<2){ tracking=false; handObj.onRelease && handObj.onRelease('pinch'); } }
    window.addEventListener('touchstart', onTouchStart, {passive:true}); window.addEventListener('touchmove', onTouchMove, {passive:true}); window.addEventListener('touchend', onTouchEnd, {passive:true});
  }
  function attemptMediaPipe(){
    const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js';
    s.onload=()=>{ const cs=document.createElement('script'); cs.src='https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'; cs.onload=()=>{
      const video=document.getElementById('cameraVideo'); if(!video) return; const hands=new window.Hands({locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`}); hands.setOptions({maxNumHands:1, modelComplexity:1, minDetectionConfidence:0.6, minTrackingConfidence:0.5}); hands.onResults((results)=>{ if(!results.multiHandLandmarks||results.multiHandLandmarks.length===0) return; const lm=results.multiHandLandmarks[0]; const ix=(lm[9].x+lm[5].x)/2; const iy=(lm[9].y+lm[5].y)/2; const sx=ix*window.innerWidth; const sy=iy*window.innerHeight; handObj.onPoint && handObj.onPoint({x:sx,y:sy}); const thumb=lm[4], index=lm[8]; const dx=thumb.x-index.x, dy=thumb.y-index.y; const dist=Math.hypot(dx,dy); if(dist<0.04){ if(!active){ active=true; handObj.onGrab && handObj.onGrab('pinch',{x:sx,y:sy}); } } else if(active){ active=false; handObj.onRelease && handObj.onRelease('pinch'); } }); const camera=new window.Camera(video,{onFrame:async()=>{ await hands.send({image:video}) }, width:1280, height:720}); camera.start(); } ; document.head.appendChild(cs); } ; document.head.appendChild(s);
  }
  initTouchFallback(); attemptMediaPipe(); window.hand=handObj;
})();