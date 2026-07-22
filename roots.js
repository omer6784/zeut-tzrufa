/* roots.js — Family Roots stage: rotating abstract globe → country map → path to pendant
   Visual language: warm off-white bg, electric blue linework, orange accent points.
   This is about meaningful family-story geography, not demographic classification. */

const BLUE = '#000000';
const ORANGE = '#FD7041';

/* ── Continent silhouettes (lon, lat) — closer to real geography while
   keeping a diagrammatic line-drawing feel. Each polygon is a closed
   ring; points are listed roughly clockwise on the sphere. ── */
const CONTINENTS = [
  { id:'namerica', name:'צפון אמריקה',
    center:[-100,45],
    poly:[
      [-168,65],[-160,71],[-140,70],[-120,72],[-95,73],[-80,72],[-60,60],
      [-55,51],[-67,45],[-72,40],[-78,35],[-82,28],[-90,22],[-100,20],
      [-107,22],[-117,30],[-122,34],[-124,40],[-124,48],[-130,55],
      [-148,60],[-162,60],[-168,65]
    ] },
  { id:'samerica', name:'דרום אמריקה',
    center:[-60,-15],
    poly:[
      [-80,12],[-72,11],[-60,9],[-50,5],[-42,1],[-35,-6],[-38,-12],
      [-39,-18],[-44,-23],[-50,-30],[-58,-35],[-65,-42],[-71,-50],
      [-73,-54],[-71,-56],[-74,-50],[-76,-40],[-78,-30],[-80,-18],
      [-81,-5],[-80,4],[-80,12]
    ] },
  { id:'europe',   name:'אירופה',
    center:[15,52],
    poly:[
      [-10,36],[-9,42],[-3,48],[2,50],[6,52],[8,56],[12,59],[20,62],
      [28,62],[36,58],[42,53],[44,48],[40,45],[30,43],[22,42],[15,40],
      [8,40],[2,40],[-5,38],[-10,36]
    ] },
  { id:'africa',   name:'אפריקה',
    center:[20,2],
    poly:[
      [-17,33],[-5,35],[10,37],[20,33],[28,32],[33,31],[35,23],[40,15],
      [44,12],[51,11],[51,3],[48,-5],[42,-12],[35,-22],[28,-32],[18,-35],
      [12,-32],[10,-20],[8,-10],[10,0],[6,5],[-5,5],[-12,10],[-17,15],
      [-17,25],[-17,33]
    ] },
  { id:'asia',     name:'אסיה',
    center:[90,45],
    poly:[
      [40,45],[45,55],[55,62],[70,68],[90,73],[110,73],[130,70],[145,65],
      [155,58],[160,50],[150,42],[140,35],[133,28],[122,22],[110,15],
      [103,10],[100,5],[93,8],[85,8],[80,5],[80,15],[75,22],[68,25],
      [60,25],[55,20],[50,17],[44,18],[42,25],[40,33],[38,40],[40,45]
    ] },
  { id:'oceania',  name:'אוקיאניה',
    center:[135,-25],
    poly:[
      [113,-12],[125,-12],[135,-10],[143,-12],[150,-17],[153,-25],
      [150,-34],[143,-39],[135,-39],[125,-35],[118,-32],[114,-25],
      [113,-18],[113,-12]
    ] },
];

/* ── Country reference points: Hebrew name → [lat, lon] ── */
const COUNTRIES = {
  'מרוקו':[31.7,-7.1], 'אלג׳יריה':[28.0,1.7], 'תוניסיה':[33.9,9.5], 'לוב':[26.3,17.2],
  'מצרים':[26.8,30.8], 'אתיופיה':[9.1,40.5], 'דרום אפריקה':[-30.6,22.9],
  'תימן':[15.5,48.5], 'עיראק':[33.2,43.7], 'איראן':[32.4,53.7], 'סוריה':[34.8,38.9],
  'לבנון':[33.8,35.8], 'ירדן':[30.6,36.2], 'תורכיה':[38.9,35.2], 'סעודיה':[23.9,45.1],
  'איחוד האמירויות':[23.4,53.8], 'הודו':[20.6,78.9], 'אוזבקיסטן':[41.4,64.6],
  'גאורגיה':[42.3,43.4], 'אזרבייג׳ן':[40.1,47.6], 'קזחסטן':[48.0,66.9],
  'סין':[35.9,104.2], 'יפן':[36.2,138.3], 'תאילנד':[15.9,100.9], 'וייטנאם':[14.1,108.3],
  'יוון':[39.0,21.8], 'בולגריה':[42.7,25.5], 'רומניה':[45.9,24.9], 'הונגריה':[47.1,19.5],
  'אוקראינה':[48.4,31.2], 'רוסיה':[61.5,105.3], 'בלארוס':[53.7,27.9],
  'גרמניה':[51.2,10.4], 'צרפת':[46.2,2.2], 'ספרד':[40.5,-3.7], 'איטליה':[41.9,12.6],
  'פולין':[51.9,19.1], 'פורטוגל':[39.4,-8.2], 'הולנד':[52.1,5.3], 'בלגיה':[50.5,4.5],
  'אוסטריה':[47.5,14.6], 'שוויץ':[46.8,8.2], "צ'כיה":[49.8,15.5], 'סלובקיה':[48.7,19.7],
  'קרואטיה':[45.1,15.2], 'סרביה':[44.0,21.0], 'ליטא':[55.2,23.9], 'לטביה':[56.9,24.6],
  'אסטוניה':[58.6,25.0], 'אנגליה':[55.4,-3.4], 'בריטניה':[55.4,-3.4], 'אירלנד':[53.4,-8.2],
  'שוודיה':[60.1,18.6], 'נורווגיה':[60.5,8.5], 'דנמרק':[56.3,9.5], 'פינלנד':[61.9,25.7],
  'ארה"ב':[37.1,-95.7], 'אמריקה':[37.1,-95.7], 'קנדה':[56.1,-106.3], 'מקסיקו':[23.6,-102.5],
  'ארגנטינה':[-38.4,-63.6], 'ברזיל':[-14.2,-51.9], "צ'ילה":[-35.7,-71.5],
  'קולומביה':[4.6,-74.3], 'פרו':[-9.2,-75.0], 'ונצואלה':[6.4,-66.6], 'קובה':[21.5,-77.8],
  'אוסטרליה':[-25.3,133.8], 'ניו זילנד':[-40.9,174.9], 'קוריאה':[36.5,127.8],
};
const COUNTRY_KEYS = Object.keys(COUNTRIES).map(k=>({ key:k, n:norm(k) }));

function norm(s){
  return (s||'').toString().trim().toLowerCase().replace(/["'׳״]/g,'').replace(/\s+/g,'');
}
function findCountry(input){
  const n = norm(input); if(!n) return null;
  for(const {key} of COUNTRY_KEYS) if(norm(key)===n) return { name:key, lat:COUNTRIES[key][0], lon:COUNTRIES[key][1] };
  for(const {key,n:kn} of COUNTRY_KEYS) if(kn.includes(n)||n.includes(kn)) return { name:key, lat:COUNTRIES[key][0], lon:COUNTRIES[key][1] };
  return null;
}

function easeInOut(t){ t=Math.max(0,Math.min(1,t)); return t<.5?2*t*t:-1+(4-2*t)*t; }
function easeOut(t){ t=Math.max(0,Math.min(1,t)); return 1-(1-t)*(1-t); }

/* ── Sphere projection (orthographic) ── */
function project(lon,lat,rot,R,cx,cy){
  const lonR=(lon*Math.PI/180)+rot, latR=lat*Math.PI/180;
  const x=Math.cos(latR)*Math.sin(lonR), y=-Math.sin(latR), z=Math.cos(latR)*Math.cos(lonR);
  return { x:cx+x*R, y:cy+y*R, z };
}
function strokeVisible(ctx,pts){
  let started=false; ctx.beginPath();
  for(const p of pts){
    if(p.z>=0){ if(!started){ctx.moveTo(p.x,p.y);started=true;} else ctx.lineTo(p.x,p.y); }
    else started=false;
  }
  ctx.stroke();
}

/* ── Map (equirectangular crop) projection ── */
function mapX(lon,view,W){ return (lon-view.lonMin)/(view.lonMax-view.lonMin)*W; }
function mapY(lat,view,H){ return (view.latMax-lat)/(view.latMax-view.latMin)*H; }

function continentBBox(ids){
  let lonMin=180,lonMax=-180,latMin=90,latMax=-90;
  CONTINENTS.forEach(c=>{
    if(!ids.has(c.id)) return;
    c.poly.forEach(([lon,lat])=>{
      lonMin=Math.min(lonMin,lon); lonMax=Math.max(lonMax,lon);
      latMin=Math.min(latMin,lat); latMax=Math.max(latMax,lat);
    });
  });
  const padLon=(lonMax-lonMin)*0.08+2, padLat=(latMax-latMin)*0.08+2;
  return {
    lonMin:lonMin-padLon, lonMax:lonMax+padLon,
    latMin:Math.max(-89,latMin-padLat), latMax:Math.min(89,latMax+padLat),
  };
}

/* ── Path-to-pendant overlay animation ── */
function animatePathToPendant(fromScreen, targetEl, onDone){
  const overlay=document.createElement('canvas');
  overlay.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  document.body.appendChild(overlay);
  const dpr=window.devicePixelRatio||1;
  const W=window.innerWidth, H=window.innerHeight;
  overlay.width=W*dpr; overlay.height=H*dpr; overlay.style.width=W+'px'; overlay.style.height=H+'px';
  const octx=overlay.getContext('2d'); octx.setTransform(dpr,0,0,dpr,0,0);

  const rect=targetEl.getBoundingClientRect();
  const to={ x:rect.left+rect.width*0.5, y:rect.top+rect.height*0.55 };
  const cp={ x:(fromScreen.x+to.x)/2, y:Math.min(fromScreen.x===to.x?0:fromScreen.y,to.y)-Math.abs(to.x-fromScreen.x)*0.25-40 };
  const start=performance.now(), dur=1200, steps=80;

  function frame(now){
    const t=Math.min((now-start)/dur,1), u=easeInOut(t);
    octx.clearRect(0,0,W,H);
    octx.strokeStyle='rgba(0,0,0,0.45)'; octx.lineWidth=1.2;
    octx.beginPath();
    const n=Math.floor(steps*u);
    for(let i=0;i<=n;i++){
      const s=i/steps;
      const x=(1-s)*(1-s)*fromScreen.x+2*(1-s)*s*cp.x+s*s*to.x;
      const y=(1-s)*(1-s)*fromScreen.y+2*(1-s)*s*cp.y+s*s*to.y;
      i===0?octx.moveTo(x,y):octx.lineTo(x,y);
    }
    octx.stroke();
    const x=(1-u)*(1-u)*fromScreen.x+2*(1-u)*u*cp.x+u*u*to.x;
    const y=(1-u)*(1-u)*fromScreen.y+2*(1-u)*u*cp.y+u*u*to.y;
    octx.fillStyle=ORANGE; octx.beginPath(); octx.arc(x,y,4,0,Math.PI*2); octx.fill();
    if(t<1) requestAnimationFrame(frame);
    else { setTimeout(()=>overlay.remove(),300); onDone(); }
  }
  requestAnimationFrame(frame);
}

/* ══════════════════════════════════════════
   Public entry — mounts the widget into `container`
══════════════════════════════════════════ */
export function initRootsWidget(container, opts){
  const { onAdd, onDone, targetEl } = opts;

  container.innerHTML = `
    <div class="roots-widget">
      <div class="roots-canvas-wrap"><canvas class="roots-canvas"></canvas></div>
      <div class="roots-hint" id="roots-hint">בחרו יבשה אחת או יותר שקשורות לסיפור המשפחה שלכם</div>
      <div class="roots-controls" id="roots-controls">
        <button class="roots-btn" id="roots-choose" hidden>בחר מדינה</button>
      </div>
      <div class="roots-map-controls" id="roots-map-controls" hidden>
        <button class="roots-btn ghost" id="roots-back">→ חזרה ליבשות</button>
        <div class="roots-input-row">
          <input type="text" class="roots-input" id="roots-country-input" dir="rtl" placeholder="שם מקום שמשמעותי לסיפור המשפחה שלכם...">
          <button class="roots-send" id="roots-send">שלח</button>
        </div>
        <div class="roots-chips" id="roots-chips"></div>
        <button class="roots-btn" id="roots-finish">המשך</button>
      </div>
    </div>`;

  const wrap=container.querySelector('.roots-canvas-wrap');
  const canvas=container.querySelector('.roots-canvas');
  const ctx=canvas.getContext('2d');
  const hintEl=container.querySelector('#roots-hint');
  const controlsEl=container.querySelector('#roots-controls');
  const mapControlsEl=container.querySelector('#roots-map-controls');
  const chooseBtn=container.querySelector('#roots-choose');
  const backBtn=container.querySelector('#roots-back');
  const sendBtn=container.querySelector('#roots-send');
  const finishBtn=container.querySelector('#roots-finish');
  const inputEl=container.querySelector('#roots-country-input');
  const chipsEl=container.querySelector('#roots-chips');

  const state={
    phase:'globe',          // 'globe' | 'map'
    rot:0, hover:null,
    selected:new Set(),
    points:[],               // {lon,lat,name}
    view:null, targetView:null,
    pendingPoint:null, zoomT:0, zooming:false, settled:false,
  };

  let W=0,H=0,R=0,cx=0,cy=0;
  function resize(){
    const w=wrap.clientWidth, h=wrap.clientHeight, dpr=window.devicePixelRatio||1;
    W=w; H=h;
    canvas.width=w*dpr; canvas.height=h*dpr;
    canvas.style.width=w+'px'; canvas.style.height=h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cx=W/2; cy=H/2; R=Math.min(W,H)*0.42;
  }
  const ro=new ResizeObserver(resize); ro.observe(wrap); resize();

  /* ── Globe interaction ──
     The whole projected polygon is the hit target, not just the outline,
     so the user can click anywhere inside a continent. */
  function pointInPolygon(px,py,pts){
    let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      const xi=pts[i].x, yi=pts[i].y, xj=pts[j].x, yj=pts[j].y;
      const intersect=((yi>py)!==(yj>py)) && (px<(xj-xi)*(py-yi)/(yj-yi)+xi);
      if(intersect) inside=!inside;
    }
    return inside;
  }
  function visibleHit(px,py){
    // Polygon containment for any continent on the visible hemisphere.
    for(const c of CONTINENTS){
      const pts=c.poly.map(([lon,lat])=>project(lon,lat,state.rot,R,cx,cy));
      const avgZ=pts.reduce((a,p)=>a+p.z,0)/pts.length;
      if(avgZ<=0.05) continue;
      if(pointInPolygon(px,py,pts)) return c.id;
    }
    // Generous fallback for tiny shapes near the limb: nearest center within radius.
    let best=null,bestD=30;
    for(const c of CONTINENTS){
      const p=project(c.center[0],c.center[1],state.rot,R,cx,cy);
      if(p.z<0.12) continue;
      const d=Math.hypot(px-p.x,py-p.y);
      if(d<bestD){ bestD=d; best=c.id; }
    }
    return best;
  }
  canvas.addEventListener('mousemove',e=>{
    if(state.phase!=='globe') return;
    const r=canvas.getBoundingClientRect();
    const id=visibleHit(e.clientX-r.left,e.clientY-r.top);
    state.hover=id;
    canvas.style.cursor = id ? 'pointer' : 'default';
  });
  canvas.addEventListener('mouseleave',()=>{ state.hover=null; });
  canvas.addEventListener('click',e=>{
    if(state.phase!=='globe') return;
    const r=canvas.getBoundingClientRect();
    const id=visibleHit(e.clientX-r.left,e.clientY-r.top);
    if(!id) return;
    if(state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    chooseBtn.hidden = state.selected.size===0;
    hintEl.textContent = state.selected.size===0
      ? 'בחרו יבשה אחת או יותר שקשורות לסיפור המשפחה שלכם'
      : 'אפשר לבחור עוד יבשות, או להמשיך';
  });

  /* ── Phase: continents → map ── */
  chooseBtn.addEventListener('click',()=>{
    if(state.selected.size===0) return;
    state.view = continentBBox(state.selected);
    state.targetView = { ...state.view };
    state.phase='map';
    controlsEl.hidden=true; hintEl.hidden=true; mapControlsEl.hidden=false;
    setTimeout(()=>inputEl.focus(),200);
  });
  backBtn.addEventListener('click',()=>{
    state.phase='globe'; state.pendingPoint=null; state.zooming=false;
    controlsEl.hidden=false; hintEl.hidden=false; mapControlsEl.hidden=true;
  });

  /* ── Phase: map → search → zoom → path ── */
  function submitCountry(){
    const raw=inputEl.value.trim(); if(!raw) return;
    let found=findCountry(raw);
    if(!found){
      const v=state.view;
      const jLon=(Math.random()-0.5)*(v.lonMax-v.lonMin)*0.3;
      const jLat=(Math.random()-0.5)*(v.latMax-v.latMin)*0.3;
      found={ name:raw, lat:(v.latMin+v.latMax)/2+jLat, lon:(v.lonMin+v.lonMax)/2+jLon };
    }
    inputEl.value=''; inputEl.disabled=true; sendBtn.disabled=true;
    const span=Math.max(6,(state.view.lonMax-state.view.lonMin)*0.22);
    state.targetView={
      lonMin:found.lon-span, lonMax:found.lon+span,
      latMin:found.lat-span*0.8, latMax:found.lat+span*0.8,
    };
    state.pendingPoint={ ...found, alpha:0 };
    state.zooming=true;
  }
  sendBtn.addEventListener('click',submitCountry);
  inputEl.addEventListener('keydown',e=>{ if(e.key==='Enter') submitCountry(); });

  finishBtn.addEventListener('click',()=>{ onDone && onDone(); });

  function addChip(name){
    const chip=document.createElement('div');
    chip.className='roots-chip'; chip.textContent=name;
    chipsEl.appendChild(chip);
  }

  /* ── Draw loop ── */
  function drawGlobe(){
    ctx.clearRect(0,0,W,H);
    // sphere outline
    ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.stroke();
    // graticule
    ctx.strokeStyle='rgba(0,0,0,0.16)'; ctx.lineWidth=0.6;
    for(let lon=-150;lon<=180;lon+=30){
      const pts=[]; for(let lat=-90;lat<=90;lat+=4) pts.push(project(lon,lat,state.rot,R,cx,cy));
      strokeVisible(ctx,pts);
    }
    for(let lat=-60;lat<=60;lat+=30){
      const pts=[]; for(let lon=-180;lon<=180;lon+=4) pts.push(project(lon,lat,state.rot,R,cx,cy));
      strokeVisible(ctx,pts);
    }
    // continents — filled hit area + outline; hover and selection are obvious
    CONTINENTS.forEach(c=>{
      const pts=c.poly.map(([lon,lat])=>project(lon,lat,state.rot,R,cx,cy));
      const avgZ=pts.reduce((a,p)=>a+p.z,0)/pts.length;
      if(avgZ<=0.05) return;
      const isSel=state.selected.has(c.id), isHover=state.hover===c.id;
      ctx.beginPath();
      pts.forEach((p,i)=> i===0?ctx.moveTo(p.x,p.y):ctx.lineTo(p.x,p.y));
      ctx.closePath();
      // Filled body — keeps the whole continent clickable and gives hover feedback.
      if(isSel) ctx.fillStyle='rgba(253,112,65,0.20)';
      else if(isHover) ctx.fillStyle='rgba(0,0,0,0.10)';
      else ctx.fillStyle='rgba(0,0,0,0.03)';
      ctx.fill();
      ctx.strokeStyle = isSel ? ORANGE : `rgba(0,0,0,${(0.25+avgZ*0.45+(isHover?0.25:0)).toFixed(3)})`;
      ctx.lineWidth = isSel||isHover ? 1.8 : 1;
      ctx.stroke();
      if(isSel){
        const p=project(c.center[0],c.center[1],state.rot,R,cx,cy);
        if(p.z>0){ ctx.fillStyle=ORANGE; ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2); ctx.fill(); }
      }
    });
    // labels — sit at each continent center, fade with sphere curvature so they
    // appear painted onto the surface and rotate with the globe.
    CONTINENTS.forEach(c=>{
      const p=project(c.center[0],c.center[1],state.rot,R,cx,cy);
      if(p.z<=0.20) return;
      const isSel=state.selected.has(c.id), isHover=state.hover===c.id;
      const alpha=Math.min(1,p.z*1.1);
      ctx.save();
      ctx.fillStyle = isSel ? `rgba(253,112,65,${alpha.toFixed(2)})`
                            : `rgba(0,0,0,${(alpha*(isHover?0.95:0.70)).toFixed(2)})`;
      ctx.font=`${Math.max(10, R*0.055)}px 'ArbelG',sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(c.name, p.x, p.y);
      ctx.restore();
    });
  }

  function drawMap(){
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='rgba(249,237,222,1)'; ctx.fillRect(0,0,W,H);
    const v=state.view;
    // grid
    ctx.strokeStyle='rgba(0,0,0,0.08)'; ctx.lineWidth=0.5;
    for(let lon=Math.ceil(v.lonMin/10)*10; lon<=v.lonMax; lon+=10){
      const x=mapX(lon,v,W); ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke();
    }
    for(let lat=Math.ceil(v.latMin/10)*10; lat<=v.latMax; lat+=10){
      const y=mapY(lat,v,H); ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
    }
    // continent outlines
    CONTINENTS.forEach(c=>{
      if(!state.selected.has(c.id)) return;
      ctx.beginPath();
      c.poly.forEach(([lon,lat],i)=>{
        const x=mapX(lon,v,W), y=mapY(lat,v,H);
        i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.strokeStyle='rgba(0,0,0,0.45)'; ctx.lineWidth=1.1; ctx.stroke();
    });
    // confirmed points
    state.points.forEach(p=>drawPoint(p.lon,p.lat,p.name,1));
    // pending (zooming-in) point
    if(state.pendingPoint){
      const p=state.pendingPoint;
      drawPoint(p.lon,p.lat,p.name,p.alpha);
    }
  }
  function drawPoint(lon,lat,name,alpha){
    const v=state.view, x=mapX(lon,v,W), y=mapY(lat,v,H);
    ctx.save(); ctx.globalAlpha=alpha;
    const g=ctx.createRadialGradient(x,y,0,x,y,18);
    g.addColorStop(0,'rgba(253,112,65,0.35)'); g.addColorStop(1,'rgba(253,112,65,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=ORANGE; ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=BLUE; ctx.font="11px 'ArbelG',sans-serif"; ctx.textAlign='center';
    ctx.fillText(name,x,y-10);
    ctx.restore();
  }

  let alive=true;
  function frame(){
    if(!alive || !document.body.contains(canvas)){ alive=false; ro.disconnect(); return; }
    if(state.phase==='globe'){
      state.rot += 0.0028;
      drawGlobe();
    } else {
      // animate view toward target
      const v=state.view, t=state.targetView;
      v.lonMin+=(t.lonMin-v.lonMin)*0.08; v.lonMax+=(t.lonMax-v.lonMax)*0.08;
      v.latMin+=(t.latMin-v.latMin)*0.08; v.latMax+=(t.latMax-v.latMax)*0.08;
      if(state.pendingPoint) state.pendingPoint.alpha=Math.min(1,state.pendingPoint.alpha+0.04);
      drawMap();
      if(state.zooming){
        const close=Math.abs(v.lonMin-t.lonMin)<0.05 && Math.abs(v.lonMax-t.lonMax)<0.05;
        if(close && state.pendingPoint && state.pendingPoint.alpha>=1){
          state.zooming=false;
          const r=canvas.getBoundingClientRect();
          const x=mapX(state.pendingPoint.lon,state.view,W), y=mapY(state.pendingPoint.lat,state.view,H);
          const fromScreen={ x:r.left+x, y:r.top+y };
          const point=state.pendingPoint;
          state.points.push(point);
          addChip(point.name);
          state.pendingPoint=null;
          inputEl.disabled=false; sendBtn.disabled=false; inputEl.focus();
          // ease back out so the next search starts from the family-story view
          state.targetView=continentBBox(state.selected);
          onAdd && onAdd(point.name);
        }
      }
    }
    requestAnimationFrame(frame);
  }
  frame();
}
